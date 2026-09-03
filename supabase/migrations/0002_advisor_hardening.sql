-- Advisors: search_path, grants, indexes, RLS initplan e FOR ALL vs SELECT.

alter function public.touch_updated_at() set search_path = public;
alter function public.sync_task_completion() set search_path = public;
alter function public.sync_task_project() set search_path = public;
alter function public.move_task(uuid, uuid, text, numeric) set search_path = public;
alter function public.seed_master_statuses(uuid) set search_path = public;

revoke execute on all functions in schema public from public, anon;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.ensure_workspace() to authenticated;
grant execute on function public.move_task(uuid, uuid, text, numeric) to authenticated;
grant execute on function public.seed_master_statuses(uuid) to authenticated;

create index if not exists activity_log_project_id_idx on public.activity_log (project_id);
create index if not exists activity_log_task_id_idx on public.activity_log (task_id);
create index if not exists ai_insights_applied_by_idx on public.ai_insights (applied_by);
create index if not exists assistant_messages_user_id_idx on public.assistant_messages (user_id);
create index if not exists checklist_items_task_id_idx on public.checklist_items (task_id);
create index if not exists task_labels_label_id_idx on public.task_labels (label_id);
create index if not exists tasks_column_id_idx on public.tasks (column_id);
create index if not exists tasks_column_id_project_id_idx on public.tasks (column_id, project_id);
create index if not exists workspaces_created_by_idx on public.workspaces (created_by);

drop policy if exists "ws criavel pelo dono" on public.workspaces;
create policy "ws criavel pelo dono" on public.workspaces
  for insert with check (created_by = (select auth.uid()));

drop policy if exists "perfis visiveis no workspace" on public.profiles;
create policy "perfis visiveis no workspace" on public.profiles
  for select using (
    id = (select auth.uid()) or exists (
      select 1 from public.workspace_members a
      join public.workspace_members b on a.workspace_id = b.workspace_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.id));

drop policy if exists "perfil proprio editavel" on public.profiles;
create policy "perfil proprio editavel" on public.profiles
  for update using (id = (select auth.uid()));

drop policy if exists "perfil proprio inserivel" on public.profiles;
create policy "perfil proprio inserivel" on public.profiles
  for insert with check (id = (select auth.uid()));

drop policy if exists "comentario proprio" on public.comments;
create policy "comentario proprio" on public.comments
  for insert with check (author_id = (select auth.uid()));

drop policy if exists "editar comentario proprio" on public.comments;
create policy "editar comentario proprio" on public.comments
  for update using (author_id = (select auth.uid()));

drop policy if exists "chat proprio" on public.assistant_messages;
create policy "chat proprio" on public.assistant_messages
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "membros gerenciaveis por admin" on public.workspace_members;
create policy "membros gerenciaveis por admin" on public.workspace_members
  for insert with check (public.can_admin_workspace(workspace_id));
create policy "membros atualizaveis por admin" on public.workspace_members
  for update using (public.can_admin_workspace(workspace_id))
  with check (public.can_admin_workspace(workspace_id));
create policy "membros removiveis por admin" on public.workspace_members
  for delete using (public.can_admin_workspace(workspace_id));

drop policy if exists "time do projeto editavel" on public.project_members;
create policy "time do projeto inserivel" on public.project_members
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "time do projeto atualizavel" on public.project_members
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "time do projeto removivel" on public.project_members
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

drop policy if exists "status master editavel" on public.master_statuses;
create policy "status master inserivel" on public.master_statuses
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "status master atualizavel" on public.master_statuses
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "status master removivel" on public.master_statuses
  for delete using (public.can_edit_workspace(workspace_id));

drop policy if exists "projetos editaveis" on public.projects;
create policy "projetos inseriveis" on public.projects
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "projetos atualizaveis" on public.projects
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "projetos removiveis" on public.projects
  for delete using (public.can_edit_workspace(workspace_id));

drop policy if exists "colunas editaveis" on public.board_columns;
create policy "colunas inseriveis" on public.board_columns
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "colunas atualizaveis" on public.board_columns
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "colunas removiveis" on public.board_columns
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

drop policy if exists "tarefas editaveis" on public.tasks;
create policy "tarefas inseriveis" on public.tasks
  for insert with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "tarefas atualizaveis" on public.tasks
  for update using (public.can_edit_workspace(public.workspace_of_project(project_id)))
  with check (public.can_edit_workspace(public.workspace_of_project(project_id)));
create policy "tarefas removiveis" on public.tasks
  for delete using (public.can_edit_workspace(public.workspace_of_project(project_id)));

drop policy if exists "checklist editavel" on public.checklist_items;
create policy "checklist inserivel" on public.checklist_items
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "checklist atualizavel" on public.checklist_items
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "checklist removivel" on public.checklist_items
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

drop policy if exists "anexos editaveis" on public.attachments;
create policy "anexos inseriveis" on public.attachments
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "anexos atualizaveis" on public.attachments
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "anexos removiveis" on public.attachments
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

drop policy if exists "labels editaveis" on public.labels;
create policy "labels inseriveis" on public.labels
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "labels atualizaveis" on public.labels
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "labels removiveis" on public.labels
  for delete using (public.can_edit_workspace(workspace_id));

drop policy if exists "task_labels editaveis" on public.task_labels;
create policy "task_labels inseriveis" on public.task_labels
  for insert with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "task_labels atualizaveis" on public.task_labels
  for update using (public.can_edit_workspace(public.workspace_of_task(task_id)))
  with check (public.can_edit_workspace(public.workspace_of_task(task_id)));
create policy "task_labels removiveis" on public.task_labels
  for delete using (public.can_edit_workspace(public.workspace_of_task(task_id)));

drop policy if exists "insights editaveis" on public.ai_insights;
create policy "insights inseriveis" on public.ai_insights
  for insert with check (public.can_edit_workspace(workspace_id));
create policy "insights atualizaveis" on public.ai_insights
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));
create policy "insights removiveis" on public.ai_insights
  for delete using (public.can_edit_workspace(workspace_id));

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm' and extnamespace = 'public'::regnamespace) then
    create schema if not exists extensions;
    alter extension pg_trgm set schema extensions;
  end if;
exception when others then
  null;
end $$;
