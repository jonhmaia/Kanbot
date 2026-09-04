import { initialsOf } from './format';
import { normalizePlan } from './plans';

export const PROFILE_COLUMNS =
  'id, full_name, email, role_title, color, avatar_url, presence, status_note, xp, level, tasks_completed, focus_minutes, current_streak, longest_streak, atmosphere';

export function mapMember(row) {
  if (!row) return null;
  const name = row.full_name || row.name || '';
  return {
    id: row.id || row.user_id,
    name,
    role: row.role_title || row.job_title || '',
    projectRole: row.project_role || row.projectRole || '',
    workspaceRole: row.workspace_role || '',
    email: row.email || '',
    color: row.color || '#F5A524',
    initials: row.initials || initialsOf(name),
    avatarUrl: row.avatar_url || row.avatarUrl || '',
    presence: row.presence || 'available',
    statusNote: row.status_note || row.statusNote || '',
    xp: Number(row.xp || 0),
    level: Number(row.level || 1),
    tasksCompleted: Number(row.tasks_completed ?? row.tasksCompleted ?? 0),
    focusMinutes: Number(row.focus_minutes ?? row.focusMinutes ?? 0),
    currentStreak: Number(row.current_streak ?? row.currentStreak ?? 0),
    longestStreak: Number(row.longest_streak ?? row.longestStreak ?? 0),
    atmosphere: row.atmosphere || '',
  };
}

export function mapInvite(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id || row.projectId,
    projectName: row.project_name || row.projectName || '',
    projectColor: row.project_color || row.projectColor || '#F5A524',
    email: row.email || '',
    role: row.role || 'member',
    token: row.token || '',
    status: row.status || 'pending',
    invitedBy: row.invited_by || row.invitedBy || null,
    inviterName: row.inviter_name || row.inviterName || '',
    expiresAt: row.expires_at || row.expiresAt || null,
    createdAt: row.created_at || row.createdAt || null,
  };
}

export function mapWorkspace(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: normalizePlan(row.plan),
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

export function mapFocusSession(row) {
  if (!row) return null;
  const ended = row.ended_at || row.endedAt;
  const started = row.started_at || row.startedAt;
  return {
    id: row.id,
    startedAt: started ? new Date(started).getTime() : Date.now(),
    endedAt: ended ? new Date(ended).getTime() : Date.now(),
    reason: 'stopped',
    focusMinutes: Number(row.minutes || 0),
    completedBlocks: Number(row.blocks || 0),
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
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
