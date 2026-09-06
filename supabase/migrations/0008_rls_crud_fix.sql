-- RLS: criar projeto sem workspace cacheado, alinhar labels/insights ao membership,
-- cobrir o criador no roster e fechar grants perigosos.

-- --------------------------------------------------------------- helpers --

create or replace function public.can_edit_workspace_content(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_edit_workspace(ws)
      or exists (
        select 1
          from public.project_members pm
          join public.projects p on p.id = pm.project_id
         where p.workspace_id = ws
           and pm.user_id = (select auth.uid())
           and pm.role in ('owner', 'admin', 'member')
      );
$$;

create or replace function public.ensure_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator uuid := auth.uid();
  designated uuid := new.owner_id;
begin
  if creator is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, creator, 'owner')
    on conflict (project_id, user_id) do update
      set role = 'owner'
      where public.project_members.role is distinct from 'owner';
  end if;

  if designated is not null and designated is distinct from creator then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, designated, 'owner')
    on conflict (project_id, user_id) do update
      set role = 'owner'
      where public.project_members.role is distinct from 'owner';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------- RPC --

create or replace function public.create_project(
  p_name text default 'Novo projeto',
  p_key text default null,
  p_description text default '',
  p_color text default '#F5A524',
  p_icon text default 'sparkle',
  p_owner_id uuid default null,
  p_due_date date default null,
  p_start_date date default null,
  p_columns jsonb default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  rec public.projects;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_base text;
  v_key text;
  v_owner uuid;
  v_cols jsonb := p_columns;
  col jsonb;
  v_status_key text;
  v_status uuid;
  v_wip int;
  i int := 0;
  n int;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  ws := public.ensure_workspace();
  if ws is null or not public.can_edit_workspace(ws) then
    raise exception 'Sem permissao para criar projetos neste workspace';
  end if;

  if v_name is null then
    v_name := 'Novo projeto';
  end if;

  v_owner := coalesce(p_owner_id, uid);
  if not exists (select 1 from public.profiles where id = v_owner) then
    v_owner := uid;
  end if;

  v_base := upper(left(regexp_replace(
    coalesce(nullif(trim(coalesce(p_key, '')), ''), v_name, 'PRJ'),
    '[^A-Za-z0-9]',
    '',
    'g'
  ), 3));
  if v_base = '' then
    v_base := 'PRJ';
  end if;
  if length(v_base) < 3 then
    v_base := rpad(v_base, 3, 'X');
  end if;

  v_key := v_base;
  for n in 1..12 loop
    exit when not exists (
      select 1 from public.projects where workspace_id = ws and key = v_key
    );
    v_key := left(v_base, 2) || substr(
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
      1 + floor(random() * 32)::int,
      1
    );
  end loop;

  insert into public.projects (
    workspace_id, name, key, description, color, icon, owner_id, start_date, due_date
  ) values (
    ws,
    v_name,
    v_key,
    coalesce(p_description, ''),
    coalesce(nullif(trim(coalesce(p_color, '')), ''), '#F5A524'),
    coalesce(nullif(trim(coalesce(p_icon, '')), ''), 'sparkle'),
    v_owner,
    coalesce(p_start_date, current_date),
    p_due_date
  )
  returning * into rec;

  perform public.seed_master_statuses(ws);

  if v_cols is null or jsonb_typeof(v_cols) <> 'array' or jsonb_array_length(v_cols) = 0 then
    v_cols := '[
      {"name":"Backlog","statusKey":"backlog","color":"#6E7A85"},
      {"name":"In Progress","statusKey":"in_progress","color":"#F5A524","wipLimit":4},
      {"name":"Review","statusKey":"review","color":"#BFE3F2","wipLimit":3},
      {"name":"Done","statusKey":"done","color":"#8FE3B0"}
    ]'::jsonb;
  end if;

  for col in select value from jsonb_array_elements(v_cols)
  loop
    v_status_key := coalesce(col->>'statusKey', col->>'status_key', 'backlog');
    select id into v_status
      from public.master_statuses
     where workspace_id = ws and key = v_status_key;
    if v_status is null then
      select id into v_status
        from public.master_statuses
       where workspace_id = ws and key = 'backlog';
    end if;
    if v_status is null then
      raise exception 'Status master nao encontrado';
    end if;

    begin
      v_wip := nullif(coalesce(col->>'wipLimit', col->>'wip_limit'), '')::int;
    exception when others then
      v_wip := null;
    end;
    if v_wip is not null and v_wip <= 0 then
      v_wip := null;
    end if;

    insert into public.board_columns (
      project_id, master_status_id, name, color, wip_limit, position
    ) values (
      rec.id,
      v_status,
      coalesce(nullif(trim(coalesce(col->>'name', '')), ''), 'Nova coluna'),
      coalesce(nullif(trim(coalesce(col->>'color', '')), ''), '#6E7A85'),
      v_wip,
      i
    );
    i := i + 1;
  end loop;

  insert into public.activity_log (workspace_id, project_id, actor_id, action, payload)
  values (ws, rec.id, uid, 'created', jsonb_build_object('target', rec.name));

  return rec;
end;
$$;

-- ----------------------------------------------------------------- RLS --

drop policy if exists "projetos inseriveis" on public.projects;
create policy "projetos inseriveis" on public.projects
  for insert with check (public.can_edit_workspace(workspace_id));

drop policy if exists "projetos legiveis" on public.projects;
create policy "projetos legiveis" on public.projects
  for select using (
    public.is_project_member(id)
    or owner_id = (select auth.uid())
  );

drop policy if exists "labels inseriveis" on public.labels;
create policy "labels inseriveis" on public.labels
  for insert with check (public.can_edit_workspace_content(workspace_id));

drop policy if exists "labels atualizaveis" on public.labels;
create policy "labels atualizaveis" on public.labels
  for update using (public.can_edit_workspace_content(workspace_id))
  with check (public.can_edit_workspace_content(workspace_id));

drop policy if exists "labels removiveis" on public.labels;
create policy "labels removiveis" on public.labels
  for delete using (public.can_edit_workspace_content(workspace_id));

drop policy if exists "insights inseriveis" on public.ai_insights;
create policy "insights inseriveis" on public.ai_insights
  for insert with check (public.can_edit_workspace_content(workspace_id));

drop policy if exists "insights atualizaveis" on public.ai_insights;
create policy "insights atualizaveis" on public.ai_insights
  for update using (public.can_edit_workspace_content(workspace_id))
  with check (public.can_edit_workspace_content(workspace_id));

drop policy if exists "insights removiveis" on public.ai_insights;
create policy "insights removiveis" on public.ai_insights
  for delete using (public.can_edit_workspace_content(workspace_id));

drop policy if exists "remover comentario proprio" on public.comments;
create policy "remover comentario proprio" on public.comments
  for delete using (
    author_id = (select auth.uid())
    or public.can_admin_project(public.project_of_task(task_id))
  );

-- --------------------------------------------------------------- grants --

revoke insert, update, delete on table public.workspaces from anon;
revoke insert, update, delete on table public.profiles from anon;
revoke insert, update, delete on table public.workspace_members from anon;
revoke insert, update, delete on table public.master_statuses from anon;
revoke insert, update, delete on table public.projects from anon;
revoke insert, update, delete on table public.project_members from anon;
revoke insert, update, delete on table public.board_columns from anon;
revoke insert, update, delete on table public.tasks from anon;
revoke insert, update, delete on table public.labels from anon;
revoke insert, update, delete on table public.task_labels from anon;
revoke insert, update, delete on table public.checklist_items from anon;
revoke insert, update, delete on table public.comments from anon;
revoke insert, update, delete on table public.attachments from anon;
revoke insert, update, delete on table public.activity_log from anon;
revoke insert, update, delete on table public.ai_insights from anon;
revoke insert, update, delete on table public.assistant_messages from anon;
revoke insert, update, delete on table public.invitations from anon;
revoke insert, update, delete on table public.focus_sessions from anon;

revoke execute on function public.apply_profile_xp(uuid, int, int, numeric) from public, anon, authenticated;
revoke execute on function public.award_task_completion() from public, anon, authenticated;
revoke execute on function public.ensure_project_owner_member() from public, anon, authenticated;
revoke execute on function public.can_edit_workspace_content(uuid) from public, anon;
revoke execute on function public.create_project(text, text, text, text, text, uuid, date, date, jsonb) from public, anon;

grant execute on function public.can_edit_workspace_content(uuid) to authenticated;
grant execute on function public.create_project(text, text, text, text, text, uuid, date, date, jsonb) to authenticated;
