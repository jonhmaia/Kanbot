import { initialsOf } from './format';

export function mapMember(row) {
  if (!row) return null;
  const name = row.full_name || row.name || '';
  return {
    id: row.id || row.user_id,
    name,
    role: row.role_title || row.role || '',
    email: row.email || '',
    color: row.color || '#F5A524',
    initials: row.initials || initialsOf(name),
  };
}

export function mapWorkspace(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
  };
}

export function mapStatus(row) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    color: row.color,
    position: row.position,
    isTerminal: row.is_terminal,
  };
}

export function mapProject(row, progress = {}, memberIds = []) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    key: row.key,
    description: row.description || '',
    color: row.color,
    icon: row.icon,
    status: row.status,
    ownerId: row.owner_id,
    startDate: row.start_date,
    dueDate: row.due_date,
    createdAt: row.created_at,
    columnCount: progress.columnCount ?? row.column_count ?? 0,
    taskCount: Number(progress.task_count ?? row.task_count ?? 0),
    doneCount: Number(progress.done_count ?? row.done_count ?? 0),
    progress: Number(progress.progress ?? row.progress ?? 0),
    memberIds,
  };
}

export function mapColumn(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    statusKey: row.status_key || row.key,
    color: row.color,
    wipLimit: row.wip_limit ?? null,
    position: Number(row.position ?? 0),
    masterStatusId: row.master_status_id,
  };
}

export function mapChecklist(row) {
  return {
    id: row.id,
    text: row.text,
    done: row.done,
    position: Number(row.position ?? 0),
  };
}

export function mapTask(row, membersById = {}, checklist = []) {
  const assigneeId = row.assignee_id || null;
  const assignee =
    membersById[assigneeId] ||
    (assigneeId
      ? {
          id: assigneeId,
          name: row.assignee_name || '',
          color: row.assignee_color || '#F5A524',
          initials: initialsOf(row.assignee_name || ''),
        }
      : null);

  return {
    id: row.id,
    projectId: row.project_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    assigneeId,
    labels: Array.isArray(row.labels) ? row.labels : [],
    dueDate: row.due_date,
    estimateHours: Number(row.estimate_hours ?? 0),
    loggedHours: Number(row.logged_hours ?? 0),
    progress: Number(row.progress ?? 0),
    checklist,
    comments: Number(row.comment_count ?? row.comments ?? 0),
    attachments: Number(row.attachment_count ?? row.attachments ?? 0),
    position: Number(row.position ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusKey: row.status_key || 'backlog',
    columnName: row.column_name || '',
    projectName: row.project_name || '',
    projectKey: row.project_key || '',
    projectColor: row.project_color || '#F5A524',
    assignee,
  };
}

export function mapInsight(row) {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail || '',
    kind: row.kind,
    applied: Boolean(row.applied_at),
    payload: row.payload || {},
  };
}

export function mapActivity(row, membersById = {}) {
  const target = row.payload?.target || row.action;
  return {
    id: row.id,
    memberId: row.actor_id,
    member: membersById[row.actor_id] || null,
    action: row.action,
    target,
    projectId: row.project_id,
    at: row.created_at,
  };
}

export function mapNotification(row) {
  const target = row.payload?.target || '';
  const title = target ? row.action + ' · ' + target : row.action;
  return {
    id: row.id,
    title,
    at: row.created_at,
    read: false,
  };
}
