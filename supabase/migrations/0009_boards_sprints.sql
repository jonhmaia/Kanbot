-- Boards por produto (normal | dynamic) + sprints com rollover.
-- Backfill: cada projeto existente ganha um board default "Tarefas".

-- ---------------------------------------------------------------- tables --

create table public.boards (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  name            text not null,
  kind            text not null default 'normal' check (kind in ('normal', 'dynamic')),
  frequency_days  int check (frequency_days is null or frequency_days >= 1),
  position        numeric not null default 0,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint board_dynamic_frequency check (
    kind = 'normal' or frequency_days is not null
  )
);

create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  status      text not null default 'active' check (status in ('active', 'closed')),
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  constraint sprint_dates check (ends_on >= starts_on)
);

alter table public.board_columns
  add column if not exists board_id uuid references public.boards (id) on delete cascade;

alter table public.tasks
  add column if not exists sprint_id uuid references public.sprints (id) on delete set null;

-- -------------------------------------------------------------- backfill --

insert into public.boards (project_id, name, kind, is_default, position)
select p.id, 'Tarefas', 'normal', true, 0
  from public.projects p
 where not exists (
   select 1 from public.boards b where b.project_id = p.id
 );

update public.board_columns bc
   set board_id = b.id
  from public.boards b
 where b.project_id = bc.project_id
   and b.is_default
   and bc.board_id is null;

delete from public.board_columns where board_id is null;

alter table public.board_columns
  alter column board_id set not null;

-- ---------------------------------------------------------------- indexes --

create unique index if not exists sprints_one_active
  on public.sprints (board_id) where status = 'active';

create index if not exists boards_project_position on public.boards (project_id, position);
create index if not exists sprints_board_status on public.sprints (board_id, status);
create index if not exists sprints_project on public.sprints (project_id);
create index if not exists board_columns_board_position on public.board_columns (board_id, position);
create index if not exists tasks_sprint on public.tasks (sprint_id);

create trigger trg_boards_touch before update on public.boards
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------- helpers --

create or replace function public.default_board_columns_json()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select '[
    {"name":"Backlog","statusKey":"backlog","color":"#6E7A85"},
    {"name":"In Progress","statusKey":"in_progress","color":"#F5A524","wipLimit":4},
    {"name":"Review","statusKey":"review","color":"#BFE3F2","wipLimit":3},
    {"name":"Done","statusKey":"done","color":"#8FE3B0"}
  ]'::jsonb;
$$;

create or replace function public.seed_board_columns(p_board_id uuid, p_columns jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.boards;
  ws uuid;
  v_cols jsonb := p_columns;
  col jsonb;
  v_status_key text;
  v_status uuid;
  v_wip int;
  i int := 0;
begin
  select * into rec from public.boards where id = p_board_id;
  if not found then
    raise exception 'Board nao encontrado';
  end if;
  if auth.uid() is not null and not public.can_edit_project(rec.project_id) then
    raise exception 'Sem permissao para criar colunas neste board';
  end if;

  select workspace_id into ws from public.projects where id = rec.project_id;
  perform public.seed_master_statuses(ws);

  if v_cols is null or jsonb_typeof(v_cols) <> 'array' or jsonb_array_length(v_cols) = 0 then
    select coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'name', bc.name,
          'statusKey', ms.key,
          'color', bc.color,
          'wipLimit', bc.wip_limit
        ) order by bc.position)
        from public.board_columns bc
        join public.master_statuses ms on ms.id = bc.master_status_id
        join public.boards src on src.id = bc.board_id
       where src.project_id = rec.project_id
         and src.is_default
         and src.id is distinct from rec.id
      ),
      public.default_board_columns_json()
    ) into v_cols;
  end if;

  if exists (select 1 from public.board_columns where board_id = rec.id) then
    return;
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
      project_id, board_id, master_status_id, name, color, wip_limit, position
    ) values (
      rec.project_id,
      rec.id,
      v_status,
      coalesce(nullif(trim(coalesce(col->>'name', '')), ''), 'Nova coluna'),
      coalesce(nullif(trim(coalesce(col->>'color', '')), ''), '#6E7A85'),
      v_wip,
      i
    );
    i := i + 1;
  end loop;
end;
$$;

create or replace function public.open_next_sprint(
  p_board_id uuid,
  p_force boolean default false,
  p_starts_on date default null,
  p_ends_on date default null,
  p_name text default null
)
returns public.sprints
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.boards;
  v_old public.sprints;
  v_new public.sprints;
  v_start date;
  v_end date;
  v_n int;
  v_freq int;
begin
  select * into rec from public.boards where id = p_board_id for update;
  if not found then
    raise exception 'Board nao encontrado';
  end if;
  if rec.kind <> 'dynamic' then
    raise exception 'Sprints so existem em boards dinamicos';
  end if;

  if auth.uid() is not null and not public.is_project_member(rec.project_id) then
    raise exception 'Sem permissao neste produto';
  end if;

  v_freq := coalesce(rec.frequency_days, 7);
  if v_freq < 1 then
    v_freq := 7;
  end if;

  select * into v_old
    from public.sprints
   where board_id = rec.id and status = 'active'
   limit 1;

  if v_old.id is not null and not p_force and v_old.ends_on >= current_date then
    return v_old;
  end if;

  if v_old.id is not null then
    update public.sprints
       set status = 'closed', closed_at = coalesce(closed_at, now())
     where id = v_old.id;
  end if;

  v_start := coalesce(p_starts_on, current_date);
  v_end := coalesce(p_ends_on, v_start + (v_freq - 1));
  if v_end < v_start then
    v_end := v_start + (v_freq - 1);
  end if;

  select count(*) + 1 into v_n from public.sprints where board_id = rec.id;

  insert into public.sprints (board_id, project_id, name, starts_on, ends_on, status)
  values (
    rec.id,
    rec.project_id,
    coalesce(nullif(trim(coalesce(p_name, '')), ''), 'Sprint ' || v_n::text),
    v_start,
    v_end,
    'active'
  )
  returning * into v_new;

  if v_old.id is not null then
    update public.tasks t
       set sprint_id = v_new.id
      from public.board_columns bc
     where t.column_id = bc.id
       and bc.board_id = rec.id
       and t.sprint_id = v_old.id
       and t.completed_at is null;
  else
    update public.tasks t
       set sprint_id = v_new.id
      from public.board_columns bc
     where t.column_id = bc.id
       and bc.board_id = rec.id
       and t.sprint_id is null;
  end if;

  return v_new;
end;
$$;

create or replace function public.ensure_dynamic_periods()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.boards;
  n int := 0;
begin
  for rec in
    select b.*
      from public.boards b
     where b.kind = 'dynamic'
       and (auth.uid() is null or public.is_project_member(b.project_id))
  loop
    perform public.open_next_sprint(rec.id, false, null, null, null);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.create_sprint(
  p_board_id uuid,
  p_starts_on date default null,
  p_ends_on date default null,
  p_name text default null
)
returns public.sprints
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.boards;
  sp public.sprints;
  v_was_dynamic boolean;
begin
  select * into rec from public.boards where id = p_board_id;
  if not found then
    raise exception 'Board nao encontrado';
  end if;
  if auth.uid() is not null and not public.can_edit_project(rec.project_id) then
    raise exception 'Sem permissao para criar sprint';
  end if;
  v_was_dynamic := rec.kind = 'dynamic';
  if not v_was_dynamic then
    update public.boards
       set kind = 'dynamic',
           frequency_days = coalesce(frequency_days, 7)
     where id = rec.id;
    select * into sp
      from public.sprints
     where board_id = p_board_id and status = 'active'
     limit 1;
    if sp.id is not null and (p_starts_on is not null or p_ends_on is not null or nullif(trim(coalesce(p_name, '')), '') is not null) then
      update public.sprints
         set name = coalesce(nullif(trim(coalesce(p_name, '')), ''), name),
             starts_on = coalesce(p_starts_on, starts_on),
             ends_on = coalesce(p_ends_on, ends_on)
       where id = sp.id
      returning * into sp;
    end if;
    if sp.id is not null then
      return sp;
    end if;
  end if;
  return public.open_next_sprint(p_board_id, true, p_starts_on, p_ends_on, p_name);
end;
$$;

create or replace function public.close_sprint(p_sprint_id uuid)
returns public.sprints
language plpgsql
security definer
set search_path = public
as $$
declare
  sp public.sprints;
begin
  select * into sp from public.sprints where id = p_sprint_id;
  if not found then
    raise exception 'Sprint nao encontrado';
  end if;
  if auth.uid() is not null and not public.can_edit_project(sp.project_id) then
    raise exception 'Sem permissao para fechar sprint';
  end if;
  return public.open_next_sprint(sp.board_id, true, null, null, null);
end;
$$;

create or replace function public.create_board(
  p_project_id uuid,
  p_name text default 'Novo board',
  p_kind text default 'normal',
  p_frequency_days int default null,
  p_columns jsonb default null,
  p_is_default boolean default false
)
returns public.boards
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.boards;
  v_kind text := coalesce(nullif(trim(p_kind), ''), 'normal');
  v_freq int := p_frequency_days;
  v_pos numeric;
begin
  if auth.uid() is not null and not public.can_edit_project(p_project_id) then
    raise exception 'Sem permissao para criar board';
  end if;
  if v_kind not in ('normal', 'dynamic') then
    v_kind := 'normal';
  end if;
  if v_kind = 'dynamic' then
    v_freq := coalesce(v_freq, 7);
    if v_freq < 1 then
      v_freq := 7;
    end if;
  else
    v_freq := null;
  end if;

  select coalesce(max(position), -1) + 1 into v_pos
    from public.boards
   where project_id = p_project_id;

  if p_is_default then
    update public.boards set is_default = false where project_id = p_project_id and is_default;
  end if;

  insert into public.boards (project_id, name, kind, frequency_days, position, is_default)
  values (
    p_project_id,
    coalesce(nullif(trim(p_name), ''), 'Novo board'),
    v_kind,
    v_freq,
    v_pos,
    coalesce(p_is_default, false)
  )
  returning * into rec;

  perform public.seed_board_columns(rec.id, p_columns);

  return rec;
end;
$$;

-- -------------------------------------------------------------- triggers --

create or replace function public.ensure_one_default_board()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_default then
    update public.boards
       set is_default = false
     where project_id = new.project_id
       and id is distinct from new.id
       and is_default;
  end if;
  if new.kind = 'dynamic' and (new.frequency_days is null or new.frequency_days < 1) then
    new.frequency_days := 7;
  end if;
  if new.kind = 'normal' then
    new.frequency_days := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_boards_default on public.boards;
create trigger trg_boards_default
  before insert or update of is_default, kind, frequency_days on public.boards
  for each row execute function public.ensure_one_default_board();

create or replace function public.sync_board_kind()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'dynamic' and (tg_op = 'INSERT' or old.kind is distinct from 'dynamic') then
    perform public.open_next_sprint(new.id, false, null, null, null);
  elsif new.kind = 'normal' and tg_op = 'UPDATE' and old.kind = 'dynamic' then
    update public.sprints
       set status = 'closed', closed_at = coalesce(closed_at, now())
     where board_id = new.id and status = 'active';
    update public.tasks t
       set sprint_id = null
      from public.board_columns bc
     where t.column_id = bc.id
       and bc.board_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_boards_kind on public.boards;
create trigger trg_boards_kind
  after insert or update of kind on public.boards
  for each row execute function public.sync_board_kind();

create or replace function public.prevent_last_board_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.boards where project_id = old.project_id) <= 1 then
    raise exception 'Nao e possivel excluir o ultimo board do produto';
  end if;
  if old.is_default then
    update public.boards
       set is_default = true
     where id = (
       select id from public.boards
        where project_id = old.project_id and id is distinct from old.id
        order by position
        limit 1
     );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_boards_last on public.boards;
create trigger trg_boards_last
  before delete on public.boards
  for each row execute function public.prevent_last_board_delete();

create or replace function public.sync_task_sprint()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_board uuid;
  v_kind text;
  v_sprint uuid;
begin
  select bc.board_id, b.kind into v_board, v_kind
    from public.board_columns bc
    join public.boards b on b.id = bc.board_id
   where bc.id = new.column_id;

  if v_kind = 'dynamic' then
    if new.sprint_id is not null
       and not exists (
         select 1 from public.sprints s
          where s.id = new.sprint_id and s.board_id = v_board
       ) then
      new.sprint_id := null;
    end if;
    if new.sprint_id is null then
      select id into v_sprint
        from public.sprints
       where board_id = v_board and status = 'active'
       limit 1;
      new.sprint_id := v_sprint;
    end if;
  else
    new.sprint_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_sprint on public.tasks;
create trigger trg_tasks_sprint
  before insert or update of column_id, sprint_id on public.tasks
  for each row execute function public.sync_task_sprint();

-- Master move: prefere a coluna do mesmo board.
create or replace function public.move_task(
  p_task_id uuid,
  p_column_id uuid default null,
  p_master_status_key text default null,
  p_position numeric default null
) returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task    public.tasks;
  v_column  uuid;
  v_board   uuid;
  v_pos     numeric;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if not found then raise exception 'Tarefa % nao encontrada', p_task_id; end if;

  select board_id into v_board from public.board_columns where id = v_task.column_id;

  if p_column_id is not null then
    v_column := p_column_id;
  else
    select bc.id into v_column
      from public.board_columns bc
      join public.master_statuses ms on ms.id = bc.master_status_id
     where bc.project_id = v_task.project_id
       and ms.key = p_master_status_key
     order by (bc.board_id = v_board) desc, bc.position
     limit 1;
  end if;

  if v_column is null then raise exception 'Coluna destino nao resolvida'; end if;

  v_pos := coalesce(p_position,
    (select coalesce(max(position), 0) + 1 from public.tasks where column_id = v_column));

  update public.tasks
     set column_id = v_column, position = v_pos
   where id = p_task_id
  returning * into v_task;

  insert into public.activity_log (workspace_id, project_id, task_id, actor_id, action, payload)
  select p.workspace_id, p.id, v_task.id, auth.uid(), 'moved',
         jsonb_build_object('to_column', v_column)
    from public.projects p where p.id = v_task.project_id;

  return v_task;
end;
$$;

-- create_project agora cria o board default + colunas nele.
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
  n int;
  v_board uuid;
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

  insert into public.boards (project_id, name, kind, is_default, position)
  values (rec.id, 'Tarefas', 'normal', true, 0)
  returning id into v_board;

  perform public.seed_board_columns(v_board, p_columns);

  insert into public.activity_log (workspace_id, project_id, actor_id, action, payload)
  values (ws, rec.id, uid, 'created', jsonb_build_object('target', rec.name));

  return rec;
end;
$$;

-- ----------------------------------------------------------------- RLS --

alter table public.boards enable row level security;
alter table public.sprints enable row level security;

drop policy if exists "boards visiveis" on public.boards;
create policy "boards visiveis" on public.boards
  for select using (public.is_project_member(project_id));
drop policy if exists "boards inseriveis" on public.boards;
create policy "boards inseriveis" on public.boards
  for insert with check (public.can_edit_project(project_id));
drop policy if exists "boards atualizaveis" on public.boards;
create policy "boards atualizaveis" on public.boards
  for update using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
drop policy if exists "boards removiveis" on public.boards;
create policy "boards removiveis" on public.boards
  for delete using (public.can_edit_project(project_id));

drop policy if exists "sprints visiveis" on public.sprints;
create policy "sprints visiveis" on public.sprints
  for select using (public.is_project_member(project_id));
drop policy if exists "sprints inseriveis" on public.sprints;
create policy "sprints inseriveis" on public.sprints
  for insert with check (public.can_edit_project(project_id));
drop policy if exists "sprints atualizaveis" on public.sprints;
create policy "sprints atualizaveis" on public.sprints
  for update using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
drop policy if exists "sprints removiveis" on public.sprints;
create policy "sprints removiveis" on public.sprints
  for delete using (public.can_edit_project(project_id));

-- ---------------------------------------------------------------- views --

drop view if exists public.v_master_board;
drop view if exists public.v_project_progress;
drop view if exists public.v_member_workload;
drop view if exists public.v_tasks_expanded;

create or replace view public.v_tasks_expanded
with (security_invoker = true) as
select
  t.*,
  bc.name  as column_name,
  bc.color as column_color,
  bc.board_id,
  b.name   as board_name,
  b.kind   as board_kind,
  b.frequency_days as board_frequency_days,
  b.is_default as board_is_default,
  ms.key   as status_key,
  ms.name  as status_name,
  ms.is_terminal,
  p.name   as project_name,
  p.key    as project_key,
  p.color  as project_color,
  p.workspace_id,
  pr.full_name as assignee_name,
  pr.color     as assignee_color,
  sp.name      as sprint_name,
  sp.status    as sprint_status,
  sp.starts_on as sprint_starts_on,
  sp.ends_on   as sprint_ends_on,
  (b.kind = 'normal' or sp.status = 'active' or t.sprint_id is null) as is_current,
  (select count(*) from public.comments c where c.task_id = t.id)    as comment_count,
  (select count(*) from public.attachments a where a.task_id = t.id) as attachment_count,
  coalesce((select array_agg(l.name) from public.task_labels tl
              join public.labels l on l.id = tl.label_id
             where tl.task_id = t.id), '{}') as labels
from public.tasks t
join public.board_columns bc  on bc.id = t.column_id
join public.boards b          on b.id = bc.board_id
join public.master_statuses ms on ms.id = bc.master_status_id
join public.projects p        on p.id = t.project_id
left join public.sprints sp   on sp.id = t.sprint_id
left join public.profiles pr  on pr.id = t.assignee_id;

create or replace view public.v_master_board
with (security_invoker = true) as
select
  ms.workspace_id,
  ms.key as status_key,
  ms.name as status_name,
  ms.color,
  ms.position,
  t.id,
  t.project_id,
  t.column_id,
  t.board_id,
  t.sprint_id,
  t.title,
  t.description,
  t.priority,
  t.assignee_id,
  t.due_date,
  t.estimate_hours,
  t.logged_hours,
  t.progress,
  t.position as task_position,
  t.column_name,
  t.board_name,
  t.board_kind,
  t.project_name,
  t.project_key,
  t.project_color,
  t.assignee_name,
  t.assignee_color,
  t.comment_count,
  t.attachment_count,
  t.labels
from public.master_statuses ms
left join public.v_tasks_expanded t
       on t.status_key = ms.key
      and t.workspace_id = ms.workspace_id
      and t.is_current;

create or replace view public.v_project_progress
with (security_invoker = true) as
select p.id as project_id, p.workspace_id, p.name,
       count(t.id)                                   as task_count,
       count(t.id) filter (where t.is_terminal)      as done_count,
       coalesce(round(100.0 * count(t.id) filter (where t.is_terminal)
                      / nullif(count(t.id), 0)), 0)  as progress
from public.projects p
left join public.v_tasks_expanded t on t.project_id = p.id and t.is_current
group by p.id;

create or replace view public.v_member_workload
with (security_invoker = true) as
select pr.id as user_id, wm.workspace_id, pr.full_name,
       count(t.id) filter (where not t.is_terminal)               as open_tasks,
       coalesce(sum(t.estimate_hours) filter (where not t.is_terminal), 0) as open_hours
from public.profiles pr
join public.workspace_members wm on wm.user_id = pr.id
left join public.v_tasks_expanded t
       on t.assignee_id = pr.id and t.workspace_id = wm.workspace_id and t.is_current
group by pr.id, wm.workspace_id, pr.full_name;

-- ----------------------------------------------------------- realtime --

do $$
begin
  begin
    alter publication supabase_realtime add table public.boards;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sprints;
  exception when duplicate_object then null;
  end;
end $$;

-- -------------------------------------------------------------- grants --

grant select, insert, update, delete on table public.boards to authenticated;
grant select, insert, update, delete on table public.sprints to authenticated;
grant select on table public.boards to anon;
grant select on table public.sprints to anon;

revoke insert, update, delete on table public.boards from anon;
revoke insert, update, delete on table public.sprints from anon;

revoke execute on function public.default_board_columns_json() from public, anon;
revoke execute on function public.seed_board_columns(uuid, jsonb) from public, anon;
revoke execute on function public.open_next_sprint(uuid, boolean, date, date, text) from public, anon;
revoke execute on function public.ensure_dynamic_periods() from public, anon;
revoke execute on function public.create_sprint(uuid, date, date, text) from public, anon;
revoke execute on function public.close_sprint(uuid) from public, anon;
revoke execute on function public.create_board(uuid, text, text, int, jsonb, boolean) from public, anon;

grant execute on function public.ensure_dynamic_periods() to authenticated, service_role;
grant execute on function public.create_sprint(uuid, date, date, text) to authenticated, service_role;
grant execute on function public.close_sprint(uuid) to authenticated, service_role;
grant execute on function public.create_board(uuid, text, text, int, jsonb, boolean) to authenticated, service_role;
grant execute on function public.seed_board_columns(uuid, jsonb) to authenticated, service_role;
grant execute on function public.open_next_sprint(uuid, boolean, date, date, text) to authenticated, service_role;
grant execute on function public.create_project(text, text, text, text, text, uuid, date, date, jsonb) to authenticated, service_role;
grant execute on function public.move_task(uuid, uuid, text, numeric) to authenticated, service_role;

grant select on public.v_tasks_expanded to authenticated, anon;
grant select on public.v_master_board to authenticated, anon;
grant select on public.v_project_progress to authenticated, anon;
grant select on public.v_member_workload to authenticated, anon;
