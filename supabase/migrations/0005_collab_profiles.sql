-- Contas multi-usuario: convite por projeto, ACL em project_members, perfil gamificado.

create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type presence_status as enum ('available', 'focusing', 'away');

-- ---------------------------------------------------------------- profiles --

alter table public.profiles
  add column if not exists presence presence_status not null default 'available',
  add column if not exists status_note text not null default '',
  add column if not exists xp int not null default 0,
  add column if not exists level int not null default 1,
  add column if not exists tasks_completed int not null default 0,
  add column if not exists focus_minutes numeric(10,1) not null default 0,
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_active_on date;

-- ---------------------------------------------------------------- invites --

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  email       text not null,
  invited_by  uuid not null references public.profiles (id) on delete cascade,
  role        member_role not null default 'member',
  token       text not null unique,
  status      invitation_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  check (role in ('admin', 'member', 'viewer')),
  check (email = lower(trim(email)))
);

create unique index invitations_pending_unique
  on public.invitations (project_id, email)
  where status = 'pending';
create index invitations_email_idx on public.invitations (email);
create index invitations_project_id_idx on public.invitations (project_id);

-- ---------------------------------------------------------- focus sessions --

create table public.focus_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  minutes    numeric(8,1) not null default 0,
  blocks     int not null default 0,
  tasks      jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at   timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index focus_sessions_user_id_idx on public.focus_sessions (user_id, ended_at desc);

-- --------------------------------------------------------------- helpers --

create or replace function public.project_of_task(t uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select project_id from public.tasks where id = t;
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
     where project_id = pid and user_id = auth.uid()
  ) or public.can_admin_workspace(public.workspace_of_project(pid));
$$;

create or replace function public.can_edit_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
     where project_id = pid
       and user_id = auth.uid()
       and role in ('owner', 'admin', 'member')
  ) or public.can_admin_workspace(public.workspace_of_project(pid));
$$;

create or replace function public.can_admin_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
     where project_id = pid
       and user_id = auth.uid()
       and role in ('owner', 'admin')
  ) or public.can_admin_workspace(public.workspace_of_project(pid));
$$;

create or replace function public.current_profile_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(
    (select email from public.profiles where id = auth.uid()),
    auth.jwt() ->> 'email',
    ''
  )));
$$;

-- ---------------------------------------------- owner entra no projeto --

create or replace function public.ensure_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(new.owner_id, auth.uid());
begin
  if uid is null then
    return new;
  end if;
  insert into public.project_members (project_id, user_id, role)
  values (new.id, uid, 'owner')
  on conflict (project_id, user_id) do update
    set role = excluded.role
    where public.project_members.role is distinct from 'owner';
  return new;
end;
$$;

drop trigger if exists trg_project_owner_member on public.projects;
create trigger trg_project_owner_member
  after insert or update of owner_id on public.projects
  for each row execute function public.ensure_project_owner_member();

-- Backfill: projetos atuais ficam visiveis para o time do workspace.
insert into public.project_members (project_id, user_id, role)
select p.id,
       wm.user_id,
       case
         when wm.user_id = p.owner_id or wm.role = 'owner' then 'owner'::member_role
         when wm.role = 'admin' then 'admin'::member_role
         else wm.role
       end
  from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id
on conflict (project_id, user_id) do nothing;

insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
  from public.projects p
 where p.owner_id is not null
on conflict (project_id, user_id) do nothing;

-- ---------------------------------------------------------- profile stats --

create or replace function public.protect_profile_stats()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and current_setting('kanbot.mutating_stats', true) is distinct from '1' then
    new.xp := old.xp;
    new.level := old.level;
    new.tasks_completed := old.tasks_completed;
    new.focus_minutes := old.focus_minutes;
    new.current_streak := old.current_streak;
    new.longest_streak := old.longest_streak;
    new.last_active_on := old.last_active_on;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_stats on public.profiles;
create trigger trg_protect_profile_stats
  before update on public.profiles
  for each row execute function public.protect_profile_stats();

create or replace function public.apply_profile_xp(p_user_id uuid, p_xp int, p_tasks int, p_focus numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := current_date;
  streak int;
  last_day date;
begin
  if p_user_id is null then
    return;
  end if;

  perform set_config('kanbot.mutating_stats', '1', true);

  select last_active_on, current_streak into last_day, streak
    from public.profiles where id = p_user_id;

  if p_focus > 0 or p_tasks > 0 then
    if last_day = today then
      null;
    elsif last_day = today - 1 then
      streak := coalesce(streak, 0) + 1;
    else
      streak := 1;
    end if;
  else
    streak := coalesce(streak, 0);
  end if;

  update public.profiles
     set xp = greatest(0, xp + coalesce(p_xp, 0)),
         tasks_completed = greatest(0, tasks_completed + coalesce(p_tasks, 0)),
         focus_minutes = greatest(0, focus_minutes + coalesce(p_focus, 0)),
         current_streak = streak,
         longest_streak = greatest(longest_streak, streak),
         last_active_on = case
           when p_focus > 0 or p_tasks > 0 then today
           else last_active_on
         end,
         level = 1 + floor(greatest(0, xp + coalesce(p_xp, 0)) / 100)::int
   where id = p_user_id;
end;
$$;

create or replace function public.award_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  delta int := 0;
begin
  uid := coalesce(new.assignee_id, new.reporter_id);
  if uid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.completed_at is not null then delta := 1; end if;
  elsif old.completed_at is null and new.completed_at is not null then
    delta := 1;
  elsif old.completed_at is not null and new.completed_at is null then
    delta := -1;
  end if;

  if delta <> 0 then
    perform public.apply_profile_xp(uid, delta * 10, delta, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_task_completion on public.tasks;
create trigger trg_award_task_completion
  after insert or update of completed_at, assignee_id on public.tasks
  for each row execute function public.award_task_completion();

-- ------------------------------------------------------------------ RPCs --

create or replace function public.invite_to_project(
  p_project_id uuid,
  p_email text,
  p_role member_role default 'member'
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role member_role := coalesce(p_role, 'member');
  rec public.invitations;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'E-mail invalido';
  end if;
  if v_role not in ('admin', 'member', 'viewer') then
    raise exception 'Papel de convite invalido';
  end if;
  if not public.can_edit_project(p_project_id) then
    raise exception 'Sem permissao para convidar neste projeto';
  end if;
  if exists (
    select 1
      from public.project_members pm
      join public.profiles pr on pr.id = pm.user_id
     where pm.project_id = p_project_id
       and lower(trim(coalesce(pr.email, ''))) = v_email
  ) then
    raise exception 'Esta pessoa ja faz parte do projeto';
  end if;
  if v_email = public.current_profile_email() then
    raise exception 'Voce ja esta neste projeto';
  end if;

  insert into public.invitations (project_id, email, invited_by, role, token, status, expires_at)
  values (
    p_project_id,
    v_email,
    uid,
    v_role,
    encode(gen_random_bytes(18), 'hex'),
    'pending',
    now() + interval '14 days'
  )
  on conflict (project_id, email) where status = 'pending'
  do update set
    role = excluded.role,
    token = encode(gen_random_bytes(18), 'hex'),
    expires_at = now() + interval '14 days',
    invited_by = uid
  returning * into rec;

  return rec;
end;
$$;

create or replace function public.peek_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.invitations;
  pname text;
  pcolor text;
  iname text;
begin
  select * into rec from public.invitations where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Convite nao encontrado');
  end if;
  if rec.status = 'pending' and rec.expires_at < now() then
    update public.invitations set status = 'expired' where id = rec.id;
    rec.status := 'expired';
  end if;

  select name, color into pname, pcolor from public.projects where id = rec.project_id;
  select full_name into iname from public.profiles where id = rec.invited_by;

  return jsonb_build_object(
    'ok', true,
    'id', rec.id,
    'projectId', rec.project_id,
    'projectName', coalesce(pname, 'Projeto'),
    'projectColor', coalesce(pcolor, '#F5A524'),
    'email', rec.email,
    'role', rec.role,
    'status', rec.status,
    'inviterName', coalesce(iname, ''),
    'expiresAt', rec.expires_at
  );
end;
$$;

create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.invitations;
  ws uuid;
  pname text;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  select * into rec from public.invitations where token = p_token for update;
  if not found then
    raise exception 'Convite nao encontrado';
  end if;
  if rec.status = 'accepted' then
    select workspace_id, name into ws, pname from public.projects where id = rec.project_id;
    return jsonb_build_object('projectId', rec.project_id, 'workspaceId', ws, 'name', pname, 'already', true);
  end if;
  if rec.status <> 'pending' then
    raise exception 'Este convite nao esta mais valido';
  end if;
  if rec.expires_at < now() then
    update public.invitations set status = 'expired' where id = rec.id;
    raise exception 'Este convite expirou';
  end if;
  if rec.email is distinct from public.current_profile_email() then
    raise exception 'Entre com a conta % para aceitar', rec.email;
  end if;

  select workspace_id, name into ws, pname from public.projects where id = rec.project_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, uid, 'viewer')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.project_members (project_id, user_id, role)
  values (rec.project_id, uid, rec.role)
  on conflict (project_id, user_id) do nothing;

  update public.invitations
     set status = 'accepted', accepted_at = now()
   where id = rec.id;

  return jsonb_build_object('projectId', rec.project_id, 'workspaceId', ws, 'name', pname, 'already', false);
end;
$$;

create or replace function public.accept_pending_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_email text := public.current_profile_email();
  rec public.invitations;
  n int := 0;
  ws uuid;
begin
  if uid is null or v_email = '' then
    return 0;
  end if;

  for rec in
    select * from public.invitations
     where email = v_email
       and status = 'pending'
       and expires_at >= now()
  loop
    select workspace_id into ws from public.projects where id = rec.project_id;
    if ws is null then
      continue;
    end if;
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws, uid, 'viewer')
    on conflict (workspace_id, user_id) do nothing;
    insert into public.project_members (project_id, user_id, role)
    values (rec.project_id, uid, rec.role)
    on conflict (project_id, user_id) do nothing;
    update public.invitations
       set status = 'accepted', accepted_at = now()
     where id = rec.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;

create or replace function public.revoke_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.invitations;
begin
  select * into rec from public.invitations where id = p_id;
  if not found then
    raise exception 'Convite nao encontrado';
  end if;
  if not public.can_edit_project(rec.project_id) then
    raise exception 'Sem permissao para revogar este convite';
  end if;
  if rec.status <> 'pending' then
    return;
  end if;
  update public.invitations set status = 'revoked' where id = p_id;
end;
$$;

create or replace function public.list_my_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.current_profile_email();
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'projectId', i.project_id,
      'projectName', p.name,
      'projectColor', p.color,
      'role', i.role,
      'token', i.token,
      'status', i.status,
      'inviterName', coalesce(pr.full_name, ''),
      'expiresAt', i.expires_at,
      'createdAt', i.created_at
    ) order by i.created_at desc)
    from public.invitations i
    join public.projects p on p.id = i.project_id
    left join public.profiles pr on pr.id = i.invited_by
    where i.email = v_email
      and i.status = 'pending'
      and i.expires_at >= now()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.remove_project_member(p_project_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owners int;
begin
  if p_user_id is distinct from auth.uid() and not public.can_admin_project(p_project_id) then
    raise exception 'Sem permissao para remover membros';
  end if;

  select count(*) into owners
    from public.project_members
   where project_id = p_project_id and role = 'owner';

  if exists (
    select 1 from public.project_members
     where project_id = p_project_id and user_id = p_user_id and role = 'owner'
  ) and owners <= 1 then
    raise exception 'Nao e possivel remover o unico dono do projeto';
  end if;

  delete from public.project_members
   where project_id = p_project_id and user_id = p_user_id;
end;
$$;

create or replace function public.record_focus_session(
  p_minutes numeric,
  p_blocks int default 0,
  p_tasks jsonb default '[]'::jsonb,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default now()
)
returns public.focus_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.focus_sessions;
  mins numeric := greatest(0, coalesce(p_minutes, 0));
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  insert into public.focus_sessions (user_id, minutes, blocks, tasks, started_at, ended_at)
  values (uid, mins, coalesce(p_blocks, 0), coalesce(p_tasks, '[]'::jsonb), p_started_at, coalesce(p_ended_at, now()))
  returning * into rec;

  perform public.apply_profile_xp(uid, floor(mins / 5)::int, 0, mins);
  return rec;
end;
$$;

-- ensure_workspace aceita convites pendentes no primeiro login.
create or replace function public.ensure_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  select workspace_id into ws
    from public.workspace_members
   where user_id = uid
   order by joined_at
   limit 1;

  if ws is null then
    insert into public.workspaces (name, slug, plan, created_by)
    values (
      'Meu workspace',
      'ws-' || substr(replace(uid::text, '-', ''), 1, 12),
      'free',
      uid
    )
    returning id into ws;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws, uid, 'owner');

    perform public.seed_master_statuses(ws);
  end if;

  perform public.accept_pending_invites();
  return ws;
end;
$$;

-- -------------------------------------------------------------------- RLS --

alter table public.invitations enable row level security;
alter table public.focus_sessions enable row level security;

drop policy if exists "convites visiveis" on public.invitations;
create policy "convites visiveis" on public.invitations
  for select using (
    invited_by = (select auth.uid())
    or public.can_edit_project(project_id)
    or email = public.current_profile_email()
  );

drop policy if exists "sessoes de foco visiveis" on public.focus_sessions;
create policy "sessoes de foco visiveis" on public.focus_sessions
  for select using (user_id = (select auth.uid()));

drop policy if exists "sessoes de foco inseriveis" on public.focus_sessions;
create policy "sessoes de foco inseriveis" on public.focus_sessions
  for insert with check (user_id = (select auth.uid()));

-- project_members: time do projeto (ou admin do workspace) enxerga o roster.
drop policy if exists "time do projeto visivel" on public.project_members;
create policy "time do projeto visivel" on public.project_members
  for select using (
    public.is_project_member(project_id)
    or public.can_admin_workspace(public.workspace_of_project(project_id))
  );

drop policy if exists "time do projeto inserivel" on public.project_members;
create policy "time do projeto inserivel" on public.project_members
  for insert with check (public.can_edit_project(project_id));

drop policy if exists "time do projeto atualizavel" on public.project_members;
create policy "time do projeto atualizavel" on public.project_members
  for update using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists "time do projeto removivel" on public.project_members;
create policy "time do projeto removivel" on public.project_members
  for delete using (public.can_admin_project(project_id) or user_id = (select auth.uid()));

-- Projetos e boards: membership do projeto (admin do workspace ve tudo).
drop policy if exists "projetos legiveis" on public.projects;
create policy "projetos legiveis" on public.projects
  for select using (public.is_project_member(id));

drop policy if exists "projetos atualizaveis" on public.projects;
create policy "projetos atualizaveis" on public.projects
  for update using (public.can_edit_project(id))
  with check (public.can_edit_project(id));

drop policy if exists "projetos removiveis" on public.projects;
create policy "projetos removiveis" on public.projects
  for delete using (public.can_admin_project(id));

drop policy if exists "colunas legiveis" on public.board_columns;
create policy "colunas legiveis" on public.board_columns
  for select using (public.is_project_member(project_id));

drop policy if exists "colunas inseriveis" on public.board_columns;
create policy "colunas inseriveis" on public.board_columns
  for insert with check (public.can_edit_project(project_id));

drop policy if exists "colunas atualizaveis" on public.board_columns;
create policy "colunas atualizaveis" on public.board_columns
  for update using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists "colunas removiveis" on public.board_columns;
create policy "colunas removiveis" on public.board_columns
  for delete using (public.can_edit_project(project_id));

drop policy if exists "tarefas legiveis" on public.tasks;
create policy "tarefas legiveis" on public.tasks
  for select using (public.is_project_member(project_id));

drop policy if exists "tarefas inseriveis" on public.tasks;
create policy "tarefas inseriveis" on public.tasks
  for insert with check (public.can_edit_project(project_id));

drop policy if exists "tarefas atualizaveis" on public.tasks;
create policy "tarefas atualizaveis" on public.tasks
  for update using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists "tarefas removiveis" on public.tasks;
create policy "tarefas removiveis" on public.tasks
  for delete using (public.can_edit_project(project_id));

drop policy if exists "comentarios legiveis" on public.comments;
create policy "comentarios legiveis" on public.comments
  for select using (public.is_project_member(public.project_of_task(task_id)));

drop policy if exists "comentario proprio" on public.comments;
create policy "comentario proprio" on public.comments
  for insert with check (
    author_id = (select auth.uid())
    and public.is_project_member(public.project_of_task(task_id))
  );

drop policy if exists "editar comentario proprio" on public.comments;
create policy "editar comentario proprio" on public.comments
  for update using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "checklist legivel" on public.checklist_items;
create policy "checklist legivel" on public.checklist_items
  for select using (public.is_project_member(public.project_of_task(task_id)));

drop policy if exists "checklist inserivel" on public.checklist_items;
create policy "checklist inserivel" on public.checklist_items
  for insert with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "checklist atualizavel" on public.checklist_items;
create policy "checklist atualizavel" on public.checklist_items
  for update using (public.can_edit_project(public.project_of_task(task_id)))
  with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "checklist removivel" on public.checklist_items;
create policy "checklist removivel" on public.checklist_items
  for delete using (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "anexos legiveis" on public.attachments;
create policy "anexos legiveis" on public.attachments
  for select using (public.is_project_member(public.project_of_task(task_id)));

drop policy if exists "anexos inseriveis" on public.attachments;
create policy "anexos inseriveis" on public.attachments
  for insert with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "anexos atualizaveis" on public.attachments;
create policy "anexos atualizaveis" on public.attachments
  for update using (public.can_edit_project(public.project_of_task(task_id)))
  with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "anexos removiveis" on public.attachments;
create policy "anexos removiveis" on public.attachments
  for delete using (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "task_labels legiveis" on public.task_labels;
create policy "task_labels legiveis" on public.task_labels
  for select using (public.is_project_member(public.project_of_task(task_id)));

drop policy if exists "task_labels inseriveis" on public.task_labels;
create policy "task_labels inseriveis" on public.task_labels
  for insert with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "task_labels atualizaveis" on public.task_labels;
create policy "task_labels atualizaveis" on public.task_labels
  for update using (public.can_edit_project(public.project_of_task(task_id)))
  with check (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "task_labels removiveis" on public.task_labels;
create policy "task_labels removiveis" on public.task_labels
  for delete using (public.can_edit_project(public.project_of_task(task_id)));

drop policy if exists "feed legivel" on public.activity_log;
create policy "feed legivel" on public.activity_log
  for select using (
    (project_id is not null and public.is_project_member(project_id))
    or (project_id is null and public.is_workspace_member(workspace_id))
  );

-- Convidado (viewer no workspace) ainda precisa anexar arquivos do projeto.
drop policy if exists "task attachments insertable" on storage.objects;
create policy "task attachments insertable" on storage.objects
  for insert with check (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((string_to_array(name, '/'))[1]::uuid)
  );
drop policy if exists "task attachments updatable" on storage.objects;
create policy "task attachments updatable" on storage.objects
  for update using (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((string_to_array(name, '/'))[1]::uuid)
  )
  with check (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((string_to_array(name, '/'))[1]::uuid)
  );
drop policy if exists "task attachments deletable" on storage.objects;
create policy "task attachments deletable" on storage.objects
  for delete using (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((string_to_array(name, '/'))[1]::uuid)
  );

-- ------------------------------------------------------------------ grants --

grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert on public.focus_sessions to authenticated;

revoke all on table public.invitations from anon;
revoke all on table public.focus_sessions from anon;

grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.can_admin_project(uuid) to authenticated;
grant execute on function public.project_of_task(uuid) to authenticated;
grant execute on function public.current_profile_email() to authenticated;
grant execute on function public.invite_to_project(uuid, text, member_role) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.accept_pending_invites() to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
grant execute on function public.list_my_invites() to authenticated;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
grant execute on function public.record_focus_session(numeric, int, jsonb, timestamptz, timestamptz) to authenticated;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.accept_pending_invites() from public, anon;
revoke execute on function public.invite_to_project(uuid, text, member_role) from public, anon;
revoke execute on function public.revoke_invite(uuid) from public, anon;
revoke execute on function public.list_my_invites() from public, anon;
revoke execute on function public.remove_project_member(uuid, uuid) from public, anon;
revoke execute on function public.record_focus_session(numeric, int, jsonb, timestamptz, timestamptz) from public, anon;
revoke execute on function public.apply_profile_xp(uuid, int, int, numeric) from public, anon;
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.can_edit_project(uuid) from public, anon;
revoke execute on function public.can_admin_project(uuid) from public, anon;
revoke execute on function public.project_of_task(uuid) from public, anon;
revoke execute on function public.current_profile_email() from public, anon;

grant execute on function public.peek_invite(text) to anon, authenticated;
grant execute on function public.ensure_workspace() to authenticated;
