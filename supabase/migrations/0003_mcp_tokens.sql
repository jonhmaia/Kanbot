-- Tokens MCP: hash no banco, plaintext so no retorno de create_mcp_token.

create table public.mcp_tokens (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null default 'MCP',
  token_hash   text not null unique,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

create index mcp_tokens_workspace_id_idx on public.mcp_tokens (workspace_id);
create index mcp_tokens_user_id_idx on public.mcp_tokens (user_id);

alter table public.mcp_tokens enable row level security;

create policy "mcp tokens visiveis" on public.mcp_tokens
  for select using (
    (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
    or public.can_admin_workspace(workspace_id)
  );

revoke all on table public.mcp_tokens from public, anon, authenticated;
grant select (
  id, workspace_id, user_id, name, token_prefix, last_used_at, created_at, revoked_at
) on table public.mcp_tokens to authenticated;

create or replace view public.v_mcp_tokens
with (security_invoker = true) as
select id, workspace_id, user_id, name, token_prefix, last_used_at, created_at, revoked_at
  from public.mcp_tokens;

grant select on public.v_mcp_tokens to authenticated;

create or replace function public.create_mcp_token(p_workspace_id uuid, p_name text default 'MCP')
returns table (id uuid, token text, token_prefix text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  v_name text;
  v_raw text;
  v_hash text;
  v_prefix text;
  v_id uuid;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;
  if p_workspace_id is null or not public.can_edit_workspace(p_workspace_id) then
    raise exception 'Sem permissao';
  end if;

  v_name := left(trim(coalesce(p_name, '')), 60);
  if v_name = '' then
    v_name := 'MCP';
  end if;

  v_raw := 'kb_' || encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(convert_to(v_raw, 'UTF8'), 'sha256'), 'hex');
  v_prefix := left(v_raw, 10);

  insert into public.mcp_tokens (workspace_id, user_id, name, token_hash, token_prefix)
  values (p_workspace_id, uid, v_name, v_hash, v_prefix)
  returning public.mcp_tokens.id into v_id;

  return query select v_id, v_raw, v_prefix;
end;
$$;

create or replace function public.revoke_mcp_token(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tok public.mcp_tokens%rowtype;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;

  select * into tok from public.mcp_tokens where id = p_id;
  if not found then
    raise exception 'Token nao encontrado';
  end if;
  if tok.user_id <> uid and not public.can_admin_workspace(tok.workspace_id) then
    raise exception 'Sem permissao';
  end if;

  update public.mcp_tokens
     set revoked_at = now()
   where id = p_id
     and revoked_at is null;
end;
$$;

revoke execute on function public.create_mcp_token(uuid, text) from public, anon;
revoke execute on function public.revoke_mcp_token(uuid) from public, anon;
grant execute on function public.create_mcp_token(uuid, text) to authenticated;
grant execute on function public.revoke_mcp_token(uuid) to authenticated;
