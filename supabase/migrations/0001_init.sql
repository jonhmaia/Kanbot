-- ============================================================================
-- Kanbot — schema Supabase (Postgres 15+)
-- Plano de banco para substituir o mock em memoria (server/src/data/seed.js).
-- Nada aqui foi aplicado em nenhum projeto: e um plano pronto para rodar.
--
-- Ordem de execucao: extensoes -> enums -> tabelas -> indices -> funcoes
--                    -> triggers -> RLS -> views -> seed opcional.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- busca textual em titulos

-- ---------------------------------------------------------------- enums ---

create type project_status  as enum ('active', 'on_hold', 'archived');
create type task_priority   as enum ('low', 'medium', 'high', 'urgent');
create type member_role     as enum ('owner', 'admin', 'member', 'viewer');

-- ------------------------------------------------------------- workspaces --

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'free',
  created_by  uuid not null references auth.users (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Perfil publico espelhando auth.users (nome, avatar, cor do card).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  avatar_url  text,
  role_title  text,
  color       text not null default '#F5A524',
  created_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         member_role not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- -------------------------------------------------- status master (uniao) --
-- Vocabulario unico do workspace. E o que permite o "board master":
-- toda coluna de todo projeto aponta para um destes status.
create table public.master_statuses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key          text not null,                      -- backlog | in_progress | review | blocked | done
  name         text not null,
  color        text not null default '#6E7A85',
  position     int  not null default 0,
  is_terminal  boolean not null default false,     -- true = conta como concluido
  unique (workspace_id, key)
);

-- ---------------------------------------------------------------- projects --

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  key          text not null,                      -- sigla curta: SFR, STI...
  description  text not null default '',
  color        text not null default '#F5A524',
  icon         text not null default 'sparkle',
  status       project_status not null default 'active',
  owner_id     uuid references public.profiles (id) on delete set null,
  start_date   date,
  due_date     date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, key)
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       member_role not null default 'member',
  primary key (project_id, user_id)
);

-- --------------------------------------------------- colunas customizaveis --
-- Cada projeto desenha o proprio fluxo; master_status_id costura tudo.
create table public.board_columns (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  master_status_id uuid not null references public.master_statuses (id) on delete restrict,
  name             text not null,
  color            text not null default '#6E7A85',
  wip_limit        int check (wip_limit is null or wip_limit > 0),
  position         numeric not null default 0,     -- numeric permite inserir "entre" duas colunas
  created_at       timestamptz not null default now(),
  -- unique tecnico: viabiliza a FK composta de tasks (coluna e tarefa no mesmo projeto)
  unique (id, project_id)
);

-- ------------------------------------------------------------------- tasks --

create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  column_id      uuid not null references public.board_columns (id) on delete cascade,
  title          text not null check (length(trim(title)) > 0),
  description    text not null default '',
  priority       task_priority not null default 'medium',
  assignee_id    uuid references public.profiles (id) on delete set null,
  reporter_id    uuid references public.profiles (id) on delete set null,
  due_date       date,
  estimate_hours numeric(6,2) not null default 4,
  logged_hours   numeric(6,2) not null default 0,
  progress       int not null default 0 check (progress between 0 and 100),
  position       numeric not null default 0,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- coerencia: a coluna precisa pertencer ao mesmo projeto da tarefa
  constraint task_column_same_project
    foreign key (column_id, project_id)
    references public.board_columns (id, project_id)
    on delete cascade
    deferrable initially deferred
);

create table public.labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  color        text not null default '#6E7A85',
  unique (workspace_id, name)
);

create table public.task_labels (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create table public.checklist_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  text       text not null,
  done       boolean not null default false,
  position   numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  storage_path text not null,                      -- bucket "task-attachments"
  file_name   text not null,
  size_bytes  bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------- feed / auditoria --

create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  task_id      uuid references public.tasks (id) on delete set null,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,                      -- created | moved | commented | ...
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create table public.ai_insights (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind         text not null,                      -- balance | risk | schedule | cleanup
  title        text not null,
  detail       text not null default '',
  payload      jsonb not null default '{}'::jsonb, -- o que "Apply" executa
  score        numeric,
  applied_at   timestamptz,
  applied_by   uuid references public.profiles (id) on delete set null,
  dismissed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table public.assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- indices --

create index on public.projects (workspace_id, status);
create index on public.projects (owner_id);
create index on public.workspace_members (user_id);
create index on public.project_members (user_id);
create index on public.board_columns (project_id, position);
create index on public.board_columns (master_status_id);
create index on public.tasks (project_id, column_id, position);
create index on public.tasks (assignee_id) where completed_at is null;
create index on public.tasks (reporter_id);
create index on public.tasks (due_date) where completed_at is null;
create index on public.tasks using gin (title gin_trgm_ops);
create index on public.activity_log (workspace_id, created_at desc);
create index on public.activity_log (actor_id);
create index on public.comments (task_id, created_at);
create index on public.comments (author_id);
create index on public.attachments (task_id);
create index on public.attachments (uploaded_by);
create index on public.ai_insights (workspace_id) where applied_at is null and dismissed_at is null;
create index on public.assistant_messages (workspace_id, user_id, created_at);
create index on public.activity_log (project_id);
create index on public.activity_log (task_id);
create index on public.ai_insights (applied_by);
create index on public.assistant_messages (user_id);
create index on public.checklist_items (task_id);
create index on public.task_labels (label_id);
create index on public.tasks (column_id);
create index on public.tasks (column_id, project_id);
create index on public.workspaces (created_by);

-- ---------------------------------------------------------------- funcoes --

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger trg_workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

-- Ao entrar numa coluna terminal, marca conclusao e progresso 100%.
create or replace function public.sync_task_completion()
returns trigger language plpgsql set search_path = public as $$
declare terminal boolean;
begin
  select ms.is_terminal into terminal
    from public.board_columns bc
    join public.master_statuses ms on ms.id = bc.master_status_id
   where bc.id = new.column_id;

  if terminal then
    new.completed_at := coalesce(new.completed_at, now());
    new.progress := 100;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger trg_tasks_completion before insert or update of column_id on public.tasks
  for each row execute function public.sync_task_completion();

-- Mantem project_id coerente com a coluna destino (move entre projetos).
create or replace function public.sync_task_project()
returns trigger language plpgsql set search_path = public as $$
begin
  select project_id into new.project_id from public.board_columns where id = new.column_id;
  return new;
end $$;

create trigger trg_tasks_project before insert or update of column_id on public.tasks
  for each row execute function public.sync_task_project();

-- Cria o perfil automaticamente quando um usuario se cadastra.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.email,
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Move um card respeitando o "modo master": se vier master_status_key,
-- resolve a coluna equivalente dentro do projeto do proprio card.
create or replace function public.move_task(
  p_task_id uuid,
  p_column_id uuid default null,
  p_master_status_key text default null,
  p_position numeric default null
) returns public.tasks language plpgsql security invoker set search_path = public as $$
declare
  v_task    public.tasks;
  v_column  uuid;
  v_pos     numeric;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if not found then raise exception 'Tarefa % nao encontrada', p_task_id; end if;

  if p_column_id is not null then
    v_column := p_column_id;
  else
    select bc.id into v_column
      from public.board_columns bc
      join public.master_statuses ms on ms.id = bc.master_status_id
     where bc.project_id = v_task.project_id
       and ms.key = p_master_status_key
     order by bc.position
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
end $$;

-- --------------------------------------------------------------- helpers --

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_workspace(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = ws and user_id = auth.uid()
       and role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.can_admin_workspace(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = ws and user_id = auth.uid()
       and role in ('owner', 'admin')
  );
$$;

create or replace function public.workspace_of_project(p uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.projects where id = p;
$$;

create or replace function public.workspace_of_task(t uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.workspace_id from public.tasks tk
    join public.projects p on p.id = tk.project_id
   where tk.id = t;
$$;

-- -------------------------------------------------------------------- RLS --
-- Regra geral: leitura para membros do workspace, escrita para member+.

alter table public.workspaces        enable row level security;
alter table public.profiles          enable row level security;
alter table public.workspace_members enable row level security;
alter table public.master_statuses   enable row level security;
alter table public.projects          enable row level security;
alter table public.project_members   enable row level security;
alter table public.board_columns     enable row level security;
alter table public.tasks             enable row level security;
alter table public.labels            enable row level security;
alter table public.task_labels       enable row level security;
alter table public.checklist_items   enable row level security;
alter table public.comments          enable row level security;
alter table public.attachments       enable row level security;
alter table public.activity_log      enable row level security;
alter table public.ai_insights       enable row level security;
alter table public.assistant_messages enable row level security;

create policy "ws visivel para membros" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "ws criavel pelo dono" on public.workspaces
  for insert with check (created_by = (select auth.uid()));
create policy "ws editavel por admin" on public.workspaces
  for update using (public.can_admin_workspace(id))
  with check (public.can_admin_workspace(id));

create policy "perfis visiveis no workspace" on public.profiles
  for select using (
    id = (select auth.uid()) or exists (
      select 1 from public.workspace_members a
      join public.workspace_members b on a.workspace_id = b.workspace_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy "perfil proprio editavel" on public.profiles
  for update using (id = (select auth.uid()));
create policy "perfil proprio inserivel" on public.profiles
  for insert with check (id = (select auth.uid()));

create policy "membros visiveis" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "membros gerenciaveis por admin" on public.workspace_members
  for insert with check (public.can_admin_workspace(workspace_id));
create policy "membros atualizaveis por admin" on public.workspace_members
  for update using (public.can_admin_workspace(workspace_id))
  with check (public.can_admin_workspace(workspace_id));
create policy "membros removiveis por admin" on public.workspace_members
  for delete using (public.can_admin_workspace(workspace_id));

create policy "time do projeto visivel" on public.project_members
  for select using (public.is_workspace_member(public.workspace_of_project(project_id)));
create policy "time do projeto inserivel" on public.project_members
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "time do projeto atualizavel" on public.project_members
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "time do projeto removivel" on public.project_members
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

create policy "status master legivel" on public.master_statuses
  for select using (public.is_workspace_member(workspace_id));
create policy "status master inserivel" on public.master_statuses
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "status master atualizavel" on public.master_statuses
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "status master removivel" on public.master_statuses
  for delete using (public.can_edit_workspace(workspace_id));

create policy "projetos legiveis" on public.projects
  for select using (public.is_workspace_member(workspace_id));
create policy "projetos inseriveis" on public.projects
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "projetos atualizaveis" on public.projects
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "projetos removiveis" on public.projects
  for delete using (public.can_edit_workspace(workspace_id));

create policy "colunas legiveis" on public.board_columns
  for select using (public.is_workspace_member(public.workspace_of_project(project_id)));
create policy "colunas inseriveis" on public.board_columns
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "colunas atualizaveis" on public.board_columns
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "colunas removiveis" on public.board_columns
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

create policy "tarefas legiveis" on public.tasks
  for select using (public.is_workspace_member(public.workspace_of_project(project_id)));
create policy "tarefas inseriveis" on public.tasks
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "tarefas atualizaveis" on public.tasks
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "tarefas removiveis" on public.tasks
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

create policy "comentarios legiveis" on public.comments
  for select using (public.is_workspace_member(public.workspace_of_task(task_id)));
create policy "comentario proprio" on public.comments
  for insert with check (author_id = (select auth.uid()));
create policy "editar comentario proprio" on public.comments
  for update using (author_id = (select auth.uid()));

create policy "checklist legivel" on public.checklist_items
  for select using (public.is_workspace_member(public.workspace_of_task(task_id)));
create policy "checklist inserivel" on public.checklist_items
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "checklist atualizavel" on public.checklist_items
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "checklist removivel" on public.checklist_items
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

create policy "anexos legiveis" on public.attachments
  for select using (public.is_workspace_member(public.workspace_of_task(task_id)));
create policy "anexos inseriveis" on public.attachments
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "anexos atualizaveis" on public.attachments
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "anexos removiveis" on public.attachments
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

create policy "labels legiveis" on public.labels
  for select using (public.is_workspace_member(workspace_id));
create policy "labels inseriveis" on public.labels
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "labels atualizaveis" on public.labels
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "labels removiveis" on public.labels
  for delete using (public.can_edit_workspace(workspace_id));

create policy "task_labels legiveis" on public.task_labels
  for select using (public.is_workspace_member(public.workspace_of_task(task_id)));
create policy "task_labels inseriveis" on public.task_labels
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "task_labels atualizaveis" on public.task_labels
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "task_labels removiveis" on public.task_labels
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

create policy "feed legivel" on public.activity_log
  for select using (public.is_workspace_member(workspace_id));
create policy "feed inserivel" on public.activity_log
  for insert with check (public.is_workspace_member(workspace_id));

create policy "insights legiveis" on public.ai_insights
  for select using (public.is_workspace_member(workspace_id));
create policy "insights inseriveis" on public.ai_insights
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "insights atualizaveis" on public.ai_insights
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "insights removiveis" on public.ai_insights
  for delete using (public.can_edit_workspace(workspace_id));

create policy "chat proprio" on public.assistant_messages
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------- views --
-- Alimentam a UI sem N+1: espelham /api/master-board e /api/dashboard.

create or replace view public.v_tasks_expanded
with (security_invoker = true) as
select
  t.*,
  bc.name  as column_name,
  bc.color as column_color,
  ms.key   as status_key,
  ms.name  as status_name,
  ms.is_terminal,
  p.name   as project_name,
  p.key    as project_key,
  p.color  as project_color,
  p.workspace_id,
  pr.full_name as assignee_name,
  pr.color     as assignee_color,
  (select count(*) from public.comments c where c.task_id = t.id)    as comment_count,
  (select count(*) from public.attachments a where a.task_id = t.id) as attachment_count,
  coalesce((select array_agg(l.name) from public.task_labels tl
              join public.labels l on l.id = tl.label_id
             where tl.task_id = t.id), '{}') as labels
from public.tasks t
join public.board_columns bc  on bc.id = t.column_id
join public.master_statuses ms on ms.id = bc.master_status_id
join public.projects p        on p.id = t.project_id
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
       on t.status_key = ms.key and t.workspace_id = ms.workspace_id;

create or replace view public.v_project_progress
with (security_invoker = true) as
select p.id as project_id, p.workspace_id, p.name,
       count(t.id)                                   as task_count,
       count(t.id) filter (where t.is_terminal)      as done_count,
       coalesce(round(100.0 * count(t.id) filter (where t.is_terminal)
                      / nullif(count(t.id), 0)), 0)  as progress
from public.projects p
left join public.v_tasks_expanded t on t.project_id = p.id
group by p.id;

create or replace view public.v_member_workload
with (security_invoker = true) as
select pr.id as user_id, wm.workspace_id, pr.full_name,
       count(t.id) filter (where not t.is_terminal)               as open_tasks,
       coalesce(sum(t.estimate_hours) filter (where not t.is_terminal), 0) as open_hours
from public.profiles pr
join public.workspace_members wm on wm.user_id = pr.id
left join public.v_tasks_expanded t
       on t.assignee_id = pr.id and t.workspace_id = wm.workspace_id
group by pr.id, wm.workspace_id, pr.full_name;

-- ------------------------------------------------------------- realtime --
-- Board colaborativo: publica as tabelas que a UI escuta.
do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.board_columns;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.comments;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.activity_log;
  exception when duplicate_object then null;
  end;
end $$;

-- --------------------------------------------------- seed dos status base --
-- Chame apos criar um workspace (ou transforme em trigger).
create or replace function public.seed_master_statuses(ws uuid)
returns void language sql set search_path = public as $$
  insert into public.master_statuses (workspace_id, key, name, color, position, is_terminal)
  values (ws, 'backlog',     'Backlog',     '#6E7A85', 0, false),
         (ws, 'in_progress', 'In Progress', '#F5A524', 1, false),
         (ws, 'review',      'In Review',   '#BFE3F2', 2, false),
         (ws, 'blocked',     'Blocked',     '#E5484D', 3, false),
         (ws, 'done',        'Done',        '#8FE3B0', 4, true)
  on conflict (workspace_id, key) do nothing;
$$;

-- Primeiro login: cria workspace + membership + status master.
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

  if ws is not null then
    return ws;
  end if;

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
  return ws;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.ensure_workspace() to authenticated;
grant execute on function public.move_task(uuid, uuid, text, numeric) to authenticated;
grant execute on function public.seed_master_statuses(uuid) to authenticated;

-- Storage: anexos privados por workspace.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 52428800)
on conflict (id) do update set public = excluded.public;

drop policy if exists "task attachments readable" on storage.objects;
drop policy if exists "task attachments insertable" on storage.objects;
drop policy if exists "task attachments updatable" on storage.objects;
drop policy if exists "task attachments deletable" on storage.objects;

create policy "task attachments readable" on storage.objects
  for select using (
    bucket_id = 'task-attachments'
    and public.is_workspace_member((string_to_array(name, '/'))[1]::uuid)
  );

create policy "task attachments insertable" on storage.objects
  for insert with check (
    bucket_id = 'task-attachments'
    and public.can_edit_workspace((string_to_array(name, '/'))[1]::uuid)
  );

create policy "task attachments updatable" on storage.objects
  for update using (
    bucket_id = 'task-attachments'
    and public.can_edit_workspace((string_to_array(name, '/'))[1]::uuid)
  )
  with check (
    bucket_id = 'task-attachments'
    and public.can_edit_workspace((string_to_array(name, '/'))[1]::uuid)
  );

create policy "task attachments deletable" on storage.objects
  for delete using (
    bucket_id = 'task-attachments'
    and public.can_edit_workspace((string_to_array(name, '/'))[1]::uuid)
  );
