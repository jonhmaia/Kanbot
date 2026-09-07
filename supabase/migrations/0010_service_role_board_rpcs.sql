-- MCP usa service_role (auth.uid() nulo). Os RPCs de board/sprint ja
-- pulam checagem de membro nesse caso; falta so EXECUTE.

grant execute on function public.ensure_dynamic_periods() to service_role;
grant execute on function public.create_sprint(uuid, date, date, text) to service_role;
grant execute on function public.close_sprint(uuid) to service_role;
grant execute on function public.create_board(uuid, text, text, int, jsonb, boolean) to service_role;
grant execute on function public.seed_board_columns(uuid, jsonb) to service_role;
grant execute on function public.open_next_sprint(uuid, boolean, date, date, text) to service_role;
grant execute on function public.create_project(text, text, text, text, text, uuid, date, date, jsonb) to service_role;
grant execute on function public.move_task(uuid, uuid, text, numeric) to service_role;
