-- Reset administrativo do schema public (nao e migration).
-- Preserva grants do schema e nao apaga auth.users.

do $$
declare r record;
begin
  for r in (select viewname from pg_views where schemaname = 'public') loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;

  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  for r in (
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) loop
    execute format('drop function if exists public.%I(%s) cascade', r.name, r.args);
  end loop;

  for r in (
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
  ) loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
