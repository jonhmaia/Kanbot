import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ICONS = new Set(['sparkle', 'pulse', 'device', 'shield', 'layers', 'target']);
const PRIORITY: Record<string, string> = {
  urgent: 'urgent',
  urgente: 'urgent',
  high: 'high',
  alta: 'high',
  medium: 'medium',
  media: 'medium',
  low: 'low',
  baixa: 'low',
};
const STATUS: Record<string, string> = {
  backlog: 'backlog',
  ideas: 'backlog',
  discovery: 'backlog',
  in_progress: 'in_progress',
  progresso: 'in_progress',
  building: 'in_progress',
  designing: 'in_progress',
  review: 'review',
  revisao: 'review',
  blocked: 'blocked',
  bloqueado: 'blocked',
  done: 'done',
  concluido: 'done',
};

export class AuthError extends Error {
  status = 401;
  constructor(message = 'Token MCP invalido') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export type AuthCtx = {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  role: string;
  canWrite: boolean;
  workspaceName: string;
  tokenId: string;
};

function fail(error: { message?: string } | null) {
  if (error) throw new ToolError(error.message || 'Falha no Supabase');
}

function fold(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extractBearer(req: Request) {
  const header = req.headers.get('authorization') || req.headers.get('x-kanbot-token') || '';
  const raw = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header.trim();
  return raw;
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticate(req: Request): Promise<AuthCtx> {
  const token = extractBearer(req);
  if (!token || !token.startsWith('kb_')) throw new AuthError('Informe Authorization: Bearer kb_...');

  const supabase = adminClient();
  const hash = await sha256Hex(token);
  const { data: row, error } = await supabase
    .from('mcp_tokens')
    .select('id, workspace_id, user_id, revoked_at')
    .eq('token_hash', hash)
    .maybeSingle();
  fail(error);
  if (!row || row.revoked_at) throw new AuthError();

  const { data: member, error: mErr } = await supabase
    .from('workspace_members')
    .select('role, workspaces:workspace_id (name)')
    .eq('workspace_id', row.workspace_id)
    .eq('user_id', row.user_id)
    .maybeSingle();
  fail(mErr);
  if (!member) throw new AuthError('Usuario do token nao e mais membro do workspace');

  void supabase.from('mcp_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);

  const workspace = member.workspaces as { name?: string } | { name?: string }[] | null;
  const workspaceName = Array.isArray(workspace) ? workspace[0]?.name : workspace?.name;

  return {
    supabase,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: member.role,
    canWrite: member.role !== 'viewer',
    workspaceName: workspaceName || 'Kanbot',
    tokenId: row.id,
  };
}

function requireWrite(ctx: AuthCtx) {
  if (!ctx.canWrite) throw new ToolError('Token sem permissao de escrita (viewer)');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mapMember(row: Record<string, unknown>, role = '') {
  return {
    id: row.id,
    name: row.full_name || row.name || '',
    role: role || row.role_title || row.role || '',
    email: row.email || '',
    color: row.color || '#F5A524',
  };
}

function mapProject(row: Record<string, unknown>, extra: Record<string, unknown> = {}) {
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
    taskCount: Number(extra.task_count ?? row.task_count ?? 0),
    doneCount: Number(extra.done_count ?? row.done_count ?? 0),
    progress: Number(extra.progress ?? row.progress ?? 0),
    columnCount: Number(extra.columnCount ?? 0),
  };
}

function mapTask(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    statusKey: row.status_key || 'backlog',
    columnId: row.column_id,
    columnName: row.column_name || '',
    priority: row.priority,
    projectId: row.project_id,
    projectName: row.project_name || '',
    projectKey: row.project_key || '',
    projectColor: row.project_color || '#F5A524',
    assigneeId: row.assignee_id || null,
    assignee: row.assignee_name || null,
    dueDate: row.due_date,
    estimateHours: Number(row.estimate_hours ?? 0),
    loggedHours: Number(row.logged_hours ?? 0),
    progress: Number(row.progress ?? 0),
    position: Number(row.position ?? 0),
    labels: Array.isArray(row.labels) ? row.labels : [],
  };
}

function pick<T extends Record<string, unknown>>(list: T[], query: unknown, keys: string[]) {
  const q = String(query || '').trim();
  if (!q) return null;
  const hit = list.find((item) => String(item.id) === q);
  if (hit) return hit;
  const folded = fold(q);
  return (
    list.find((item) => keys.some((k) => fold(item[k]) === folded)) ||
    list.find((item) => keys.some((k) => fold(item[k]).includes(folded))) ||
    null
  );
}

async function loadMembers(ctx: AuthCtx) {
  const { data, error } = await ctx.supabase
    .from('workspace_members')
    .select('role, profiles:user_id (id, full_name, email, role_title, color)')
    .eq('workspace_id', ctx.workspaceId);
  fail(error);
  return (data || [])
    .map((row) => {
      const profile = row.profiles as Record<string, unknown> | null;
      return profile ? mapMember(profile, row.role) : null;
    })
    .filter(Boolean);
}

async function fetchTasks(ctx: AuthCtx, filter: Record<string, unknown> = {}) {
  let query = ctx.supabase.from('v_tasks_expanded').select('*').eq('workspace_id', ctx.workspaceId);
  if (filter.projectId) query = query.eq('project_id', filter.projectId);
  if (filter.assigneeId) query = query.eq('assignee_id', filter.assigneeId);
  if (filter.priority) query = query.eq('priority', filter.priority);
  if (filter.statusKey) query = query.eq('status_key', filter.statusKey);
  if (filter.q) {
    const q = String(filter.q);
    query = query.or('title.ilike.%' + q + '%,description.ilike.%' + q + '%');
  }
  const { data, error } = await query.order('position');
  fail(error);
  return (data || []).map((row) => mapTask(row as Record<string, unknown>));
}

async function listProjectRows(ctx: AuthCtx) {
  const { data: rows, error } = await ctx.supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at');
  fail(error);
  const { data: progress, error: pErr } = await ctx.supabase
    .from('v_project_progress')
    .select('*')
    .eq('workspace_id', ctx.workspaceId);
  fail(pErr);
  const progressById = Object.fromEntries((progress || []).map((p) => [p.project_id, p]));
  return (rows || []).map((row) => mapProject(row as Record<string, unknown>, progressById[row.id] || {}));
}

async function assertTask(ctx: AuthCtx, taskId: string) {
  const { data, error } = await ctx.supabase
    .from('tasks')
    .select('id, project_id, projects (workspace_id, name, key)')
    .eq('id', taskId)
    .maybeSingle();
  fail(error);
  const project = data?.projects as { workspace_id?: string } | null;
  if (!data || project?.workspace_id !== ctx.workspaceId) throw new ToolError('Tarefa nao encontrada');
  return data;
}

async function statusByKey(ctx: AuthCtx) {
  const { data, error } = await ctx.supabase.from('master_statuses').select('*').eq('workspace_id', ctx.workspaceId);
  fail(error);
  return Object.fromEntries((data || []).map((s) => [s.key, s]));
}

async function loadColumns(ctx: AuthCtx, projectIds: string[]) {
  if (!projectIds.length) return [];
  const { data, error } = await ctx.supabase
    .from('board_columns')
    .select('id, name, color, wip_limit, position, project_id, master_statuses (key)')
    .in('project_id', projectIds)
    .order('position');
  fail(error);
  return (data || []).map((c) => {
    const status = c.master_statuses as { key?: string } | null;
    return {
      id: c.id,
      name: c.name,
      statusKey: status?.key || 'backlog',
      projectId: c.project_id,
      wipLimit: c.wip_limit,
      position: c.position,
      color: c.color,
    };
  });
}

async function resolveProject(ctx: AuthCtx, query: unknown) {
  const projects = await listProjectRows(ctx);
  const hit = pick(projects as unknown as Record<string, unknown>[], query, ['name', 'key']);
  if (!hit) throw new ToolError('Projeto nao encontrado: ' + String(query || '?'));
  return hit as ReturnType<typeof mapProject>;
}

async function resolveTask(ctx: AuthCtx, query: unknown) {
  const tasks = await fetchTasks(ctx);
  const hit = pick(tasks as unknown as Record<string, unknown>[], query, ['title']);
  if (!hit) throw new ToolError('Tarefa nao encontrada: ' + String(query || '?'));
  return hit as ReturnType<typeof mapTask>;
}

function resolveStatusKey(value: unknown) {
  const key = STATUS[fold(value).replace(/\s+/g, '_')] || '';
  return key;
}

async function resolveColumn(ctx: AuthCtx, projectId: string, args: Record<string, unknown>) {
  const columns = await loadColumns(ctx, [projectId]);
  if (args.columnId) {
    const hit = columns.find((c) => c.id === args.columnId || fold(c.name) === fold(args.columnId));
    if (hit) return hit;
  }
  const status = resolveStatusKey(args.statusKey);
  if (status) {
    return columns.find((c) => c.statusKey === status) || columns[0] || null;
  }
  return columns[0] || null;
}

async function syncLabels(ctx: AuthCtx, taskId: string, names: unknown) {
  const list = Array.isArray(names)
    ? names.map((n) => String(n).trim()).filter(Boolean)
    : String(names || '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
  await ctx.supabase.from('task_labels').delete().eq('task_id', taskId);
  const unique = [...new Set(list)];
  for (const name of unique) {
    const { data: existing, error: findErr } = await ctx.supabase
      .from('labels')
      .select('id')
      .eq('workspace_id', ctx.workspaceId)
      .eq('name', name)
      .maybeSingle();
    fail(findErr);
    let labelId = existing?.id;
    if (!labelId) {
      const { data: created, error: createErr } = await ctx.supabase
        .from('labels')
        .insert({ workspace_id: ctx.workspaceId, name, color: '#6E7A85' })
        .select('id')
        .single();
      fail(createErr);
      labelId = created.id;
    }
    const { error } = await ctx.supabase.from('task_labels').insert({ task_id: taskId, label_id: labelId });
    fail(error);
  }
}

async function logActivity(ctx: AuthCtx, projectId: string | null, action: string, target: string) {
  await ctx.supabase.from('activity_log').insert({
    workspace_id: ctx.workspaceId,
    project_id: projectId,
    actor_id: ctx.userId,
    action,
    payload: { target },
  });
}

async function loadInsights(ctx: AuthCtx) {
  const { data, error } = await ctx.supabase
    .from('ai_insights')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false });
  fail(error);
  return (data || []).map((i) => ({
    id: i.id,
    title: i.title,
    detail: i.detail || '',
    kind: i.kind,
    applied: Boolean(i.applied_at),
    payload: i.payload || {},
  }));
}

async function loadActivity(ctx: AuthCtx, limit = 12) {
  const { data, error } = await ctx.supabase
    .from('activity_log')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  fail(error);
  return (data || []).map((a) => ({
    id: a.id,
    action: a.action,
    target: a.payload?.target || a.action,
    memberId: a.actor_id,
    projectId: a.project_id,
    at: a.created_at,
  }));
}

function buildStats(tasks: ReturnType<typeof mapTask>[], projects: ReturnType<typeof mapProject>[], members: ReturnType<typeof mapMember>[]) {
  const count = (key: string) => tasks.filter((t) => t.statusKey === key).length;
  const done = count('done');
  const inProgress = count('in_progress');
  const review = count('review');
  const backlog = count('backlog');
  const blocked = count('blocked');
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today() && t.statusKey !== 'done').length;
  const dueToday = tasks.filter((t) => t.dueDate === today() && t.statusKey !== 'done').length;
  const capacity = 40;
  const workload = members.map((m) => {
    const mine = tasks.filter((t) => t.assigneeId === m.id && t.statusKey !== 'done');
    const hours = mine.reduce((s, t) => s + t.estimateHours, 0);
    return { id: m.id, name: m.name, openTasks: mine.length, hours, utilization: Math.min(140, Math.round((hours / capacity) * 100)) };
  });
  return {
    stats: {
      activeTasks: inProgress + review,
      completed: done,
      overdue,
      dueToday,
      blocked,
      totalTasks: tasks.length,
      projectsActive: projects.filter((p) => p.status === 'active').length,
    },
    distribution: [
      { key: 'in_progress', label: 'In Progress', value: inProgress, color: '#F5A524' },
      { key: 'review', label: 'In Review', value: review, color: '#BFE3F2' },
      { key: 'backlog', label: 'Backlog', value: backlog, color: '#6E7A85' },
      { key: 'done', label: 'Done', value: done, color: '#8FE3B0' },
      { key: 'blocked', label: 'Blocked', value: blocked, color: '#E5484D' },
    ],
    workload,
  };
}

export async function getCatalog(ctx: AuthCtx) {
  const [projects, tasks, members, insights, activity] = await Promise.all([
    listProjectRows(ctx),
    fetchTasks(ctx),
    loadMembers(ctx),
    loadInsights(ctx),
    loadActivity(ctx, 8),
  ]);
  const columns = await loadColumns(ctx, projects.map((p) => p.id as string));
  const { stats, workload } = buildStats(tasks, projects, members);
  const { data: statuses, error } = await ctx.supabase
    .from('master_statuses')
    .select('key, name, color')
    .eq('workspace_id', ctx.workspaceId)
    .order('position');
  fail(error);
  return {
    today: today(),
    workspace: { id: ctx.workspaceId, name: ctx.workspaceName },
    stats,
    statuses: statuses || [],
    members,
    workload,
    projects: projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      status: p.status,
      progress: p.progress,
      taskCount: p.taskCount,
      doneCount: p.doneCount,
      color: p.color,
      ownerId: p.ownerId,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.statusKey,
      column: t.columnName,
      priority: t.priority,
      projectId: t.projectId,
      project: t.projectKey || t.projectName,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      due: t.dueDate,
      progress: t.progress,
      hours: t.estimateHours,
      logged: t.loggedHours,
      labels: t.labels,
    })),
    insights: insights.map((i) => ({ id: i.id, title: i.title, detail: i.detail, kind: i.kind, applied: i.applied })),
    activity,
    columns: columns.map((c) => ({
      id: c.id,
      name: c.name,
      statusKey: c.statusKey,
      projectId: c.projectId,
      wipLimit: c.wipLimit,
    })),
  };
}

export async function listProjects(ctx: AuthCtx) {
  return listProjectRows(ctx);
}

export async function getProjectBoard(ctx: AuthCtx, args: Record<string, unknown>) {
  const project = await resolveProject(ctx, args.projectId);
  const columns = await loadColumns(ctx, [project.id as string]);
  const tasks = await fetchTasks(ctx, { projectId: project.id });
  return {
    project,
    columns: columns.map((c) => ({
      ...c,
      tasks: tasks.filter((t) => t.columnId === c.id),
    })),
  };
}

export async function listTasks(ctx: AuthCtx, args: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (args.projectId) filter.projectId = (await resolveProject(ctx, args.projectId)).id;
  if (args.assigneeId) {
    const members = await loadMembers(ctx);
    const member = pick(members as unknown as Record<string, unknown>[], args.assigneeId, ['name', 'email']);
    if (member) filter.assigneeId = member.id;
    else filter.assigneeId = args.assigneeId;
  }
  if (args.priority) filter.priority = PRIORITY[fold(args.priority)] || args.priority;
  if (args.statusKey) filter.statusKey = resolveStatusKey(args.statusKey) || args.statusKey;
  if (args.q) filter.q = args.q;
  return fetchTasks(ctx, filter);
}

export async function getMasterBoard(ctx: AuthCtx, args: Record<string, unknown>) {
  const { data: statuses, error } = await ctx.supabase
    .from('master_statuses')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('position');
  fail(error);
  const filter: Record<string, unknown> = {};
  if (args.projectId) filter.projectId = (await resolveProject(ctx, args.projectId)).id;
  if (args.assigneeId) filter.assigneeId = args.assigneeId;
  const tasks = await fetchTasks(ctx, filter);
  return {
    columns: (statuses || []).map((s) => ({
      id: s.key,
      statusKey: s.key,
      name: s.name,
      color: s.color,
      tasks: tasks.filter((t) => t.statusKey === s.key),
    })),
  };
}

export async function getDashboard(ctx: AuthCtx) {
  const [projects, tasks, members, insights, activity] = await Promise.all([
    listProjectRows(ctx),
    fetchTasks(ctx),
    loadMembers(ctx),
    loadInsights(ctx),
    loadActivity(ctx, 8),
  ]);
  return { ...buildStats(tasks, projects, members), insights, activity, projects };
}

export async function listInsights(ctx: AuthCtx) {
  return loadInsights(ctx);
}

export async function listActivity(ctx: AuthCtx) {
  return loadActivity(ctx, 20);
}

export async function createProject(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const name = String(args.name || '').trim();
  if (!name) throw new ToolError('name e obrigatorio');
  const baseKey = String(args.key || name)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 3)
    .toUpperCase() || 'PRJ';
  const icon = ICONS.has(String(args.icon || '')) ? String(args.icon) : 'sparkle';

  const insert = async (key: string) =>
    ctx.supabase
      .from('projects')
      .insert({
        workspace_id: ctx.workspaceId,
        name,
        key,
        description: String(args.description || ''),
        color: String(args.color || '#F5A524'),
        icon,
        owner_id: ctx.userId,
        start_date: today(),
      })
      .select('*')
      .single();

  let { data, error } = await insert(baseKey);
  if (error) {
    const retry = await insert((baseKey.slice(0, 2) + Math.random().toString(36).slice(2, 3)).toUpperCase());
    data = retry.data;
    error = retry.error;
  }
  fail(error);

  const statuses = await statusByKey(ctx);
  const template = [
    { name: 'Backlog', statusKey: 'backlog', color: '#6E7A85' },
    { name: 'In Progress', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4 },
    { name: 'Review', statusKey: 'review', color: '#BFE3F2', wipLimit: 3 },
    { name: 'Done', statusKey: 'done', color: '#8FE3B0' },
  ];
  const { error: colErr } = await ctx.supabase.from('board_columns').insert(
    template.map((c, i) => ({
      project_id: data!.id,
      master_status_id: statuses[c.statusKey]?.id,
      name: c.name,
      color: c.color,
      wip_limit: 'wipLimit' in c ? c.wipLimit : null,
      position: i,
    })),
  );
  fail(colErr);
  await logActivity(ctx, data!.id, 'created', data!.name);
  return mapProject(data as Record<string, unknown>, { columnCount: template.length });
}

export async function updateProject(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const project = await resolveProject(ctx, args.id || args.projectId);
  const body: Record<string, unknown> = {};
  if (args.name != null) body.name = args.name;
  if (args.key != null) body.key = String(args.key).slice(0, 3).toUpperCase();
  if (args.description != null) body.description = args.description;
  if (args.color != null) body.color = args.color;
  if (args.icon != null && ICONS.has(String(args.icon))) body.icon = args.icon;
  if (args.status != null) body.status = args.status;
  if (args.dueDate !== undefined) body.due_date = args.dueDate || null;
  if (args.startDate !== undefined) body.start_date = args.startDate || null;
  if (!Object.keys(body).length) return project;
  const { data, error } = await ctx.supabase.from('projects').update(body).eq('id', project.id).select('*').single();
  fail(error);
  return mapProject(data as Record<string, unknown>);
}

export async function createTask(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const title = String(args.title || '').trim();
  if (!title) throw new ToolError('title e obrigatorio');
  const project = await resolveProject(ctx, args.projectId);
  const column = await resolveColumn(ctx, project.id as string, args);
  if (!column) throw new ToolError('Coluna nao encontrada em ' + project.key);

  let assigneeId = args.assigneeId ? String(args.assigneeId) : null;
  if (assigneeId && !/^[0-9a-f-]{36}$/i.test(assigneeId)) {
    const members = await loadMembers(ctx);
    assigneeId = (pick(members as unknown as Record<string, unknown>[], assigneeId, ['name', 'email'])?.id as string) || null;
  }

  const { data: siblings } = await ctx.supabase.from('tasks').select('position').eq('column_id', column.id);
  const position = args.position != null
    ? Number(args.position)
    : siblings?.length
      ? Math.max(...siblings.map((s) => Number(s.position))) + 1
      : 0;

  const { data, error } = await ctx.supabase
    .from('tasks')
    .insert({
      project_id: project.id,
      column_id: column.id,
      title,
      description: String(args.description || ''),
      priority: PRIORITY[fold(args.priority)] || args.priority || 'medium',
      assignee_id: assigneeId,
      due_date: args.dueDate || null,
      estimate_hours: Number(args.estimateHours) || 4,
      progress: Number(args.progress) || 0,
      position,
    })
    .select('*')
    .single();
  fail(error);
  if (args.labels) await syncLabels(ctx, data.id, args.labels);
  await logActivity(ctx, project.id as string, 'created', data.title);
  const rows = await fetchTasks(ctx, { projectId: project.id });
  return rows.find((t) => t.id === data.id) || mapTask(data as Record<string, unknown>);
}

export async function updateTask(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const current = await resolveTask(ctx, args.id || args.title);
  await assertTask(ctx, current.id as string);
  const body: Record<string, unknown> = {};
  if (args.title != null) body.title = args.title;
  if (args.description != null) body.description = args.description;
  if (args.priority != null) body.priority = PRIORITY[fold(args.priority)] || args.priority;
  if (args.assigneeId !== undefined) {
    if (!args.assigneeId || fold(args.assigneeId) === 'ninguem' || fold(args.assigneeId) === 'none') {
      body.assignee_id = null;
    } else {
      const members = await loadMembers(ctx);
      const member = pick(members as unknown as Record<string, unknown>[], args.assigneeId, ['name', 'email']);
      body.assignee_id = member?.id || args.assigneeId;
    }
  }
  if (args.dueDate !== undefined) body.due_date = args.dueDate || null;
  if (args.estimateHours != null) body.estimate_hours = Number(args.estimateHours);
  if (args.progress != null) body.progress = Number(args.progress);
  if (args.position != null) body.position = Number(args.position);

  if (args.columnId || args.statusKey) {
    const projectId = args.projectId
      ? ((await resolveProject(ctx, args.projectId)).id as string)
      : (current.projectId as string);
    const column = await resolveColumn(ctx, projectId, args);
    if (column) {
      const { error: moveErr } = await ctx.supabase.rpc('move_task', {
        p_task_id: current.id,
        p_column_id: column.id,
        p_master_status_key: null,
        p_position: args.position ?? null,
      });
      fail(moveErr);
    }
  }

  if (Object.keys(body).length) {
    const { error } = await ctx.supabase.from('tasks').update(body).eq('id', current.id);
    fail(error);
  }
  if (args.labels) await syncLabels(ctx, current.id as string, args.labels);
  const rows = await fetchTasks(ctx, { projectId: current.projectId });
  return rows.find((t) => t.id === current.id) || current;
}

export async function moveTask(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const current = await resolveTask(ctx, args.id);
  await assertTask(ctx, current.id as string);
  let columnId = args.columnId ? String(args.columnId) : null;
  let statusKey = args.statusKey ? resolveStatusKey(args.statusKey) || String(args.statusKey) : null;
  if (!columnId && !statusKey) throw new ToolError('Informe columnId ou statusKey');
  if (columnId && !/^[0-9a-f-]{36}$/i.test(columnId)) {
    const column = await resolveColumn(ctx, current.projectId as string, args);
    columnId = column?.id || null;
    statusKey = columnId ? null : statusKey;
  }
  const { data, error } = await ctx.supabase.rpc('move_task', {
    p_task_id: current.id,
    p_column_id: columnId,
    p_master_status_key: columnId ? null : statusKey,
    p_position: args.position ?? null,
  });
  fail(error);
  const rows = await fetchTasks(ctx, { projectId: data?.project_id || current.projectId });
  return rows.find((t) => t.id === current.id) || data;
}

export async function deleteTask(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const current = await resolveTask(ctx, args.id);
  await assertTask(ctx, current.id as string);
  const { error } = await ctx.supabase.from('tasks').delete().eq('id', current.id);
  fail(error);
  return { ok: true, id: current.id, title: current.title };
}

export async function applyInsight(ctx: AuthCtx, args: Record<string, unknown>) {
  requireWrite(ctx);
  const { data: insight, error } = await ctx.supabase
    .from('ai_insights')
    .select('*')
    .eq('id', args.id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();
  fail(error);
  if (!insight) throw new ToolError('Insight nao encontrado');
  const payload = insight.payload || {};
  for (const taskId of payload.taskIds || []) {
    if (payload.toMemberId) await updateTask(ctx, { id: taskId, assigneeId: payload.toMemberId });
    if (payload.priority) await updateTask(ctx, { id: taskId, priority: payload.priority });
    if (payload.toStatus) await moveTask(ctx, { id: taskId, statusKey: payload.toStatus });
  }
  const { data, error: upErr } = await ctx.supabase
    .from('ai_insights')
    .update({ applied_at: new Date().toISOString(), applied_by: ctx.userId })
    .eq('id', insight.id)
    .select('*')
    .single();
  fail(upErr);
  return { id: data.id, title: data.title, applied: true };
}
