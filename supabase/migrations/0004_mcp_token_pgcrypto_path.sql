-- pgcrypto vive no schema extensions neste projeto.
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

revoke execute on function public.create_mcp_token(uuid, text) from public, anon;
grant execute on function public.create_mcp_token(uuid, text) to authenticated;
