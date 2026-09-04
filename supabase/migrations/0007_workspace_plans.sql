-- Plano do workspace: valores canonicos persistidos em public.workspaces.plan.

update public.workspaces
  set plan = lower(trim(plan))
  where plan is not null;

update public.workspaces
  set plan = 'free'
  where plan is null
     or plan not in ('free', 'pro', 'business', 'enterprise');

alter table public.workspaces
  drop constraint if exists workspaces_plan_check;

alter table public.workspaces
  add constraint workspaces_plan_check
  check (plan in ('free', 'pro', 'business', 'enterprise'));
