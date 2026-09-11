-- Convite para o workspace inteiro (nao so um projeto).
-- invitations.project_id passa a ser opcional; workspace_id vira o escopo.

alter table public.invitations
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

update public.invitations i
   set workspace_id = p.workspace_id
  from public.projects p
 where i.workspace_id is null
   and i.project_id = p.id;

alter table public.invitations
  alter column project_id drop not null;

delete from public.invitations where workspace_id is null;

alter table public.invitations
  alter column workspace_id set not null;

create index if not exists invitations_workspace_id_idx
  on public.invitations (workspace_id);

create unique index if not exists invitations_pending_workspace_unique
  on public.invitations (workspace_id, email)
  where status = 'pending' and project_id is null;

-- -------------------------------------------------------------- helpers --

create or replace function public.add_user_to_workspace_projects(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role member_role := case when p_role = 'owner' then 'admin' else coalesce(p_role, 'member') end;
begin
  if p_workspace_id is null or p_user_id is null then
    return;
  end if;
  if v_role not in ('admin', 'member', 'viewer') then
    v_role := 'member';
  end if;

  insert into public.project_members (project_id, user_id, role)
  select p.id, p_user_id, v_role
    from public.projects p
   where p.workspace_id = p_workspace_id
  on conflict (project_id, user_id) do nothing;
end;
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

  insert into public.project_members (project_id, user_id, role)
  select new.id,
         wm.user_id,
         case
           when wm.user_id = coalesce(designated, creator) then 'owner'::member_role
           when wm.role = 'owner' then 'admin'::member_role
           else wm.role
         end
    from public.workspace_members wm
   where wm.workspace_id = new.workspace_id
     and wm.role in ('owner', 'admin', 'member')
  on conflict (project_id, user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------- RPCs --

create or replace function public.invite_to_workspace(
  p_workspace_id uuid,
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
  if p_workspace_id is null then
    raise exception 'Workspace invalido';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'E-mail invalido';
  end if;
  if v_role not in ('admin', 'member', 'viewer') then
    raise exception 'Papel de convite invalido';
  end if;
  if not public.can_admin_workspace(p_workspace_id) then
    raise exception 'Sem permissao para convidar neste workspace';
  end if;
  if exists (
    select 1
      from public.workspace_members wm
      join public.profiles pr on pr.id = wm.user_id
     where wm.workspace_id = p_workspace_id
       and lower(trim(coalesce(pr.email, ''))) = v_email
  ) then
    raise exception 'Esta pessoa ja faz parte do workspace';
  end if;
  if v_email = public.current_profile_email() then
    raise exception 'Voce ja esta neste workspace';
  end if;

  insert into public.invitations (workspace_id, project_id, email, invited_by, role, token, status, expires_at)
  values (
    p_workspace_id,
    null,
    v_email,
    uid,
    v_role,
    encode(gen_random_bytes(18), 'hex'),
    'pending',
    now() + interval '14 days'
  )
  on conflict (workspace_id, email) where status = 'pending' and project_id is null
  do update set
    role = excluded.role,
    token = encode(gen_random_bytes(18), 'hex'),
    expires_at = now() + interval '14 days',
    invited_by = uid
  returning * into rec;

  return rec;
end;
$$;

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
  v_ws uuid;
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

  select workspace_id into v_ws from public.projects where id = p_project_id;
  if v_ws is null then
    raise exception 'Projeto nao encontrado';
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

  insert into public.invitations (workspace_id, project_id, email, invited_by, role, token, status, expires_at)
  values (
    v_ws,
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
    invited_by = uid,
    workspace_id = excluded.workspace_id
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
  wname text;
  iname text;
  v_kind text;
begin
  select * into rec from public.invitations where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Convite nao encontrado');
  end if;
  if rec.status = 'pending' and rec.expires_at < now() then
    update public.invitations set status = 'expired' where id = rec.id;
    rec.status := 'expired';
  end if;

  select name into wname from public.workspaces where id = rec.workspace_id;
  if rec.project_id is not null then
    select name, color into pname, pcolor from public.projects where id = rec.project_id;
  end if;
  select full_name into iname from public.profiles where id = rec.invited_by;
  v_kind := case when rec.project_id is null then 'workspace' else 'project' end;

  return jsonb_build_object(
    'ok', true,
    'id', rec.id,
    'kind', v_kind,
    'workspaceId', rec.workspace_id,
    'workspaceName', coalesce(wname, 'Workspace'),
    'projectId', rec.project_id,
    'projectName', coalesce(pname, wname, 'Workspace'),
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
  wname text;
  v_kind text;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  select * into rec from public.invitations where token = p_token for update;
  if not found then
    raise exception 'Convite nao encontrado';
  end if;

  ws := rec.workspace_id;
  if rec.project_id is not null then
    select workspace_id, name into ws, pname from public.projects where id = rec.project_id;
  end if;
  select name into wname from public.workspaces where id = ws;
  v_kind := case when rec.project_id is null then 'workspace' else 'project' end;

  if rec.status = 'accepted' then
    return jsonb_build_object(
      'projectId', rec.project_id,
      'workspaceId', ws,
      'name', coalesce(pname, wname),
      'kind', v_kind,
      'already', true
    );
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

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, uid, case when rec.project_id is null then rec.role else 'viewer' end)
  on conflict (workspace_id, user_id) do update
    set role = case
      when public.workspace_members.role = 'owner' then public.workspace_members.role
      when rec.project_id is null then excluded.role
      else public.workspace_members.role
    end;

  if rec.project_id is null then
    perform public.add_user_to_workspace_projects(ws, uid, rec.role);
  else
    insert into public.project_members (project_id, user_id, role)
    values (rec.project_id, uid, rec.role)
    on conflict (project_id, user_id) do nothing;
  end if;

  update public.invitations
     set status = 'accepted', accepted_at = now()
   where id = rec.id;

  return jsonb_build_object(
    'projectId', rec.project_id,
    'workspaceId', ws,
    'name', coalesce(pname, wname),
    'kind', v_kind,
    'already', false
  );
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
    ws := rec.workspace_id;
    if rec.project_id is not null then
      select workspace_id into ws from public.projects where id = rec.project_id;
    end if;
    if ws is null then
      continue;
    end if;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws, uid, case when rec.project_id is null then rec.role else 'viewer' end)
    on conflict (workspace_id, user_id) do update
      set role = case
        when public.workspace_members.role = 'owner' then public.workspace_members.role
        when rec.project_id is null then excluded.role
        else public.workspace_members.role
      end;

    if rec.project_id is null then
      perform public.add_user_to_workspace_projects(ws, uid, rec.role);
    else
      insert into public.project_members (project_id, user_id, role)
      values (rec.project_id, uid, rec.role)
      on conflict (project_id, user_id) do nothing;
    end if;

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
  if rec.project_id is null then
    if not public.can_admin_workspace(rec.workspace_id) then
      raise exception 'Sem permissao para revogar este convite';
    end if;
  elsif not public.can_edit_project(rec.project_id) then
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
      'kind', case when i.project_id is null then 'workspace' else 'project' end,
      'workspaceId', i.workspace_id,
      'workspaceName', w.name,
      'projectId', i.project_id,
      'projectName', coalesce(p.name, w.name),
      'projectColor', coalesce(p.color, '#F5A524'),
      'role', i.role,
      'token', i.token,
      'status', i.status,
      'inviterName', coalesce(pr.full_name, ''),
      'expiresAt', i.expires_at,
      'createdAt', i.created_at
    ) order by i.created_at desc)
    from public.invitations i
    join public.workspaces w on w.id = i.workspace_id
    left join public.projects p on p.id = i.project_id
    left join public.profiles pr on pr.id = i.invited_by
    where i.email = v_email
      and i.status = 'pending'
      and i.expires_at >= now()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owners int;
begin
  if p_user_id is distinct from auth.uid() and not public.can_admin_workspace(p_workspace_id) then
    raise exception 'Sem permissao para remover membros';
  end if;

  select count(*) into owners
    from public.workspace_members
   where workspace_id = p_workspace_id and role = 'owner';

  if exists (
    select 1 from public.workspace_members
     where workspace_id = p_workspace_id and user_id = p_user_id and role = 'owner'
  ) and owners <= 1 then
    raise exception 'Nao e possivel remover o unico dono do workspace';
  end if;

  delete from public.project_members pm
   using public.projects p
   where pm.project_id = p.id
     and p.workspace_id = p_workspace_id
     and pm.user_id = p_user_id;

  delete from public.workspace_members
   where workspace_id = p_workspace_id and user_id = p_user_id;
end;
$$;

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

  perform public.accept_pending_invites();

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

  return ws;
end;
$$;

-- -------------------------------------------------------------------- RLS --

drop policy if exists "convites visiveis" on public.invitations;
create policy "convites visiveis" on public.invitations
  for select using (
    invited_by = (select auth.uid())
    or public.can_edit_workspace(workspace_id)
    or (project_id is not null and public.can_edit_project(project_id))
    or email = public.current_profile_email()
  );

-- ------------------------------------------------------------------ grants --

grant execute on function public.invite_to_workspace(uuid, text, member_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.invite_to_project(uuid, text, member_role) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.accept_pending_invites() to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
grant execute on function public.list_my_invites() to authenticated;
grant execute on function public.ensure_workspace() to authenticated;
grant execute on function public.peek_invite(text) to anon, authenticated;

revoke execute on function public.add_user_to_workspace_projects(uuid, uuid, member_role) from public, anon, authenticated;
revoke execute on function public.invite_to_workspace(uuid, text, member_role) from public, anon;
revoke execute on function public.remove_workspace_member(uuid, uuid) from public, anon;
revoke execute on function public.invite_to_project(uuid, text, member_role) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.accept_pending_invites() from public, anon;
revoke execute on function public.revoke_invite(uuid) from public, anon;
revoke execute on function public.list_my_invites() from public, anon;
