import { applyAskActions, mergeActionBlocks } from './ai/runActions';
import { buildCatalog } from './ai/catalog';
import { heuristicReply, parseAssistantReply } from './ai/parseReply';
import { cacheInvalidateWorkspace } from './cache';
import { coverageSeries, forecastSeries } from './dashboardExtras';
import { STATUS_META, TODAY } from './format';
import {
  mapActivity,
  mapChecklist,
  mapColumn,
  mapInsight,
  mapMember,
  mapNotification,
  mapProject,
  mapStatus,
  mapTask,
  mapWorkspace,
} from './map';
import { supabase } from './supabase';

export function mcpEndpoint() {
  return import.meta.env.VITE_MCP_URL || (import.meta.env.VITE_SUPABASE_URL || '') + '/functions/v1/kanbot-mcp';
}

function fail(error) {
  if (error) throw new Error(error.message || 'Falha no Supabase');
}

async function requireClient() {
  if (!supabase) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em web/.env.local');
  return supabase;
}

async function requireSession() {
  const client = await requireClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('Sessao expirada');
  return client;
}

async function workspaceId() {
  const client = await requireSession();
  const { data, error } = await client.rpc('ensure_workspace');
  fail(error);
  return data;
}

async function loadMembers(ws) {
  const client = await requireSession();
  const { data, error } = await client
    .from('workspace_members')
    .select('role, profiles:user_id (id, full_name, email, role_title, color)')
    .eq('workspace_id', ws);
  fail(error);
  return (data || []).map((row) => mapMember({ ...row.profiles, role: row.role })).filter(Boolean);
}

function membersById(members) {
  return Object.fromEntries(members.map((m) => [m.id, m]));
}

async function loadChecklists(taskIds) {
  if (!taskIds.length) return {};
  const client = await requireSession();
  const { data, error } = await client
    .from('checklist_items')
    .select('*')
    .in('task_id', taskIds)
    .order('position');
  fail(error);
  return (data || []).reduce((acc, row) => {
    (acc[row.task_id] ||= []).push(mapChecklist(row));
    return acc;
  }, {});
}

async function decorateTasks(rows, members) {
  const index = membersById(members);
  const checklists = await loadChecklists(rows.map((r) => r.id));
  return rows
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((row) => mapTask(row, index, checklists[row.id] || []));
}

async function fetchExpandedTasks(filter = {}) {
  const client = await requireSession();
  let query = client.from('v_tasks_expanded').select('*');
  if (filter.workspaceId) query = query.eq('workspace_id', filter.workspaceId);
  if (filter.projectId) query = query.eq('project_id', filter.projectId);
  if (filter.assigneeId) query = query.eq('assignee_id', filter.assigneeId);
  if (filter.priority) query = query.eq('priority', filter.priority);
  if (filter.q) query = query.or('title.ilike.%' + filter.q + '%,description.ilike.%' + filter.q + '%');
  const { data, error } = await query.order('position');
  fail(error);
  return data || [];
}

async function statusByKey(ws) {
  const client = await requireSession();
  const { data, error } = await client.from('master_statuses').select('*').eq('workspace_id', ws);
  fail(error);
  return Object.fromEntries((data || []).map((s) => [s.key, s]));
}

async function resolveMasterStatusId(projectId, statusKey) {
  const client = await requireSession();
  const { data: project, error: pErr } = await client.from('projects').select('workspace_id').eq('id', projectId).single();
  fail(pErr);
  const { data, error } = await client
    .from('master_statuses')
    .select('id')
    .eq('workspace_id', project.workspace_id)
    .eq('key', statusKey || 'backlog')
    .maybeSingle();
  fail(error);
  if (!data) throw new Error('Status master nao encontrado: ' + statusKey);
  return data.id;
}

async function syncTaskLabels(taskId, workspaceId, names = []) {
  const client = await requireSession();
  await client.from('task_labels').delete().eq('task_id', taskId);
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  if (!clean.length) return;
  for (const name of clean) {
    const { data: existing, error: findErr } = await client
      .from('labels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .maybeSingle();
    fail(findErr);
    let labelId = existing?.id;
    if (!labelId) {
      const { data: created, error: createErr } = await client
        .from('labels')
        .insert({ workspace_id: workspaceId, name, color: '#6E7A85' })
        .select('id')
        .single();
      fail(createErr);
      labelId = created.id;
    }
    const { error } = await client.from('task_labels').insert({ task_id: taskId, label_id: labelId });
    fail(error);
  }
}

async function logActivity(ws, projectId, action, target) {
  const client = await requireSession();
  const { data: session } = await client.auth.getUser();
  await client.from('activity_log').insert({
    workspace_id: ws,
    project_id: projectId || null,
    actor_id: session.user?.id || null,
    action,
    payload: { target: target || action },
  });
}

function insightMatchesProject(insight, projectId, taskIds) {
  if (!projectId) return true;
  const payload = insight.payload || {};
  const hinted = payload.projectId || payload.project_id || payload.project;
  if (hinted) return hinted === projectId;
  const ids = payload.taskIds || [];
  if (ids.length && taskIds) return ids.some((id) => taskIds.has(id));
  return false;
}

function buildDashboard(tasks, projects, members, insights, activity) {
  const total = tasks.length;
  const count = (key) => tasks.filter((tk) => tk.statusKey === key).length;
  const done = count('done');
  const inProgress = count('in_progress');
  const review = count('review');
  const backlog = count('backlog');
  const blocked = count('blocked');
  const overdue = tasks.filter((tk) => tk.dueDate && tk.dueDate < TODAY && tk.statusKey !== 'done').length;
  const dueToday = tasks.filter((tk) => tk.dueDate === TODAY && tk.statusKey !== 'done').length;
  const capacity = 40;
  const load = tasks
    .filter((tk) => tk.statusKey !== 'done')
    .reduce((sum, tk) => sum + (tk.estimateHours - tk.loggedHours), 0);

  const workload = members.map((m) => {
    const mine = tasks.filter((tk) => tk.assigneeId === m.id && tk.statusKey !== 'done');
    const hours = mine.reduce((s, tk) => s + tk.estimateHours, 0);
    return {
      ...m,
      openTasks: mine.length,
      hours,
      utilization: Math.min(140, Math.round((hours / capacity) * 100)),
    };
  });

  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const open = tasks.filter((tk) => tk.statusKey === 'in_progress' || tk.statusKey === 'review').slice(0, 6);
  const timeline = open.map((tk, i) => ({
    id: tk.id,
    memberId: tk.assigneeId,
    taskId: tk.id,
    label: tk.title,
    start: 8 + (i % 4),
    end: 11 + (i % 4),
    projectId: tk.projectId,
    member: tk.assignee,
    project: projectsById[tk.projectId] || null,
  }));

  return {
    stats: {
      velocity: Math.round((done / Math.max(total, 1)) * 100) + 12,
      activeTasks: inProgress + review,
      completed: done,
      overdue,
      dueToday,
      blocked,
      totalTasks: total,
      projectsActive: projects.filter((p) => p.status === 'active').length,
      loadHours: load,
      capacityHours: members.length * capacity,
    },
    distribution: [
      { key: 'in_progress', label: 'In Progress', value: inProgress, color: '#F5A524' },
      { key: 'review', label: 'In Review', value: review, color: '#F2F2F2' },
      { key: 'backlog', label: 'Backlog', value: backlog, color: '#BFE3F2' },
      { key: 'done', label: 'Done', value: done, color: '#1C1C1C' },
      { key: 'blocked', label: 'Blocked', value: blocked, color: 'hatch' },
    ],
    coverage: coverageSeries,
    forecast: forecastSeries,
    timeline,
    workload,
    insights,
    activity,
    tasks,
    projects,
  };
}

export const api = {
  signIn: async (email, password) => {
    const client = await requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    fail(error);
    return data;
  },

  signUp: async (email, password, fullName) => {
    const client = await requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    });
    fail(error);
    return data;
  },

  signOut: async () => {
    const client = await requireClient();
    const { error } = await client.auth.signOut();
    fail(error);
  },

  bootstrap: async () => {
    const client = await requireSession();
    const { data: userData, error: userErr } = await client.auth.getUser();
    fail(userErr);
    if (!userData.user) throw new Error('Sessao expirada');

    const ws = await workspaceId();
    const members = await loadMembers(ws);
    const currentUser = members.find((m) => m.id === userData.user.id) || mapMember({
      id: userData.user.id,
      full_name: userData.user.user_metadata?.full_name || userData.user.email,
      email: userData.user.email,
      role_title: '',
      color: '#F5A524',
    });

    const { data: workspaces, error: wsErr } = await client.from('workspaces').select('*').order('name');
    fail(wsErr);

    const { data: statuses, error: stErr } = await client
      .from('master_statuses')
      .select('*')
      .eq('workspace_id', ws)
      .order('position');
    fail(stErr);

    const { data: feed, error: feedErr } = await client
      .from('activity_log')
      .select('*')
      .eq('workspace_id', ws)
      .order('created_at', { ascending: false })
      .limit(8);
    fail(feedErr);

    const projects = await api.projects(ws);

    return {
      currentUser,
      workspaces: (workspaces || []).map(mapWorkspace),
      members,
      projects,
      notifications: (feed || []).map(mapNotification),
      statuses: (statuses || []).map(mapStatus),
    };
  },

  dashboard: async (projectId) => {
    const ws = await workspaceId();
    const members = await loadMembers(ws);
    const allProjects = await api.projects(ws);
    const projects = projectId ? allProjects.filter((p) => p.id === projectId) : allProjects;
    const tasks = await decorateTasks(
      await fetchExpandedTasks(projectId ? { projectId } : { workspaceId: ws }),
      members,
    );
    const client = await requireSession();
    const { data: insights, error: iErr } = await client
      .from('ai_insights')
      .select('*')
      .eq('workspace_id', ws)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false });
    fail(iErr);
    let feedQuery = client
      .from('activity_log')
      .select('*')
      .eq('workspace_id', ws)
      .order('created_at', { ascending: false })
      .limit(6);
    if (projectId) feedQuery = feedQuery.eq('project_id', projectId);
    const { data: feed, error: aErr } = await feedQuery;
    fail(aErr);
    const taskIds = new Set(tasks.map((t) => t.id));
    const mappedInsights = (insights || [])
      .map(mapInsight)
      .filter((insight) => insightMatchesProject(insight, projectId, taskIds));
    return buildDashboard(
      tasks,
      projects,
      members,
      mappedInsights,
      (feed || []).map((row) => mapActivity(row, membersById(members))),
    );
  },

  projects: async (ws) => {
    const client = await requireSession();
    const workspace = ws || (await workspaceId());
    const { data: rows, error } = await client
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace)
      .order('created_at');
    fail(error);
    const { data: progress, error: pErr } = await client
      .from('v_project_progress')
      .select('*')
      .eq('workspace_id', workspace);
    fail(pErr);
    const { data: columns, error: cErr } = await client
      .from('board_columns')
      .select('id, project_id')
      .in(
        'project_id',
        (rows || []).map((r) => r.id).concat('00000000-0000-0000-0000-000000000000'),
      );
    fail(cErr);
    const tasks = await fetchExpandedTasks({ workspaceId: workspace });
    const progressById = Object.fromEntries((progress || []).map((p) => [p.project_id, p]));
    const columnCountById = (columns || []).reduce((acc, c) => {
      acc[c.project_id] = (acc[c.project_id] || 0) + 1;
      return acc;
    }, {});
    return (rows || []).map((row) =>
      mapProject(
        row,
        { ...progressById[row.id], columnCount: columnCountById[row.id] || 0 },
        [...new Set(tasks.filter((t) => t.project_id === row.id && t.assignee_id).map((t) => t.assignee_id))],
      ),
    );
  },

  createProject: async (input) => {
    const client = await requireSession();
    const ws = input.workspaceId || (await workspaceId());
    const { data: userData } = await client.auth.getUser();
    const { data, error } = await client
      .from('projects')
      .insert({
        workspace_id: ws,
        name: input.name?.trim() || 'Novo projeto',
        key: (input.key || input.name || 'PRJ').slice(0, 3).toUpperCase(),
        description: input.description || '',
        color: input.color || '#F5A524',
        icon: input.icon || 'sparkle',
        owner_id: input.ownerId || userData.user?.id || null,
        start_date: input.startDate || new Date().toISOString().slice(0, 10),
        due_date: input.dueDate || null,
      })
      .select('*')
      .single();
    fail(error);

    const template = Array.isArray(input.columns) && input.columns.length
      ? input.columns
      : [
          { name: 'Backlog', statusKey: 'backlog', color: '#6E7A85' },
          { name: 'In Progress', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4 },
          { name: 'Review', statusKey: 'review', color: '#BFE3F2', wipLimit: 3 },
          { name: 'Done', statusKey: 'done', color: '#8FE3B0' },
        ];
    const statuses = await statusByKey(ws);
    const { error: colErr } = await client.from('board_columns').insert(
      template.map((c, i) => ({
        project_id: data.id,
        master_status_id: statuses[c.statusKey || 'backlog']?.id,
        name: c.name,
        color: c.color || '#6E7A85',
        wip_limit: c.wipLimit ?? null,
        position: i,
      })),
    );
    fail(colErr);
    await logActivity(ws, data.id, 'created', data.name);
    return mapProject(data, { task_count: 0, done_count: 0, progress: 0, columnCount: template.length });
  },

  updateProject: async (id, patch) => {
    const client = await requireSession();
    const body = {};
    if (patch.name != null) body.name = patch.name;
    if (patch.key != null) body.key = patch.key;
    if (patch.description != null) body.description = patch.description;
    if (patch.color != null) body.color = patch.color;
    if (patch.icon != null) body.icon = patch.icon;
    if (patch.status != null) body.status = patch.status;
    if (patch.ownerId != null) body.owner_id = patch.ownerId;
    if (patch.dueDate !== undefined) body.due_date = patch.dueDate;
    if (patch.startDate !== undefined) body.start_date = patch.startDate;
    const { data, error } = await client.from('projects').update(body).eq('id', id).select('*').single();
    fail(error);
    return mapProject(data);
  },

  deleteProject: async (id) => {
    const client = await requireSession();
    const { error } = await client.from('projects').delete().eq('id', id);
    fail(error);
  },

  projectBoard: async (id) => {
    const client = await requireSession();
    const { data: project, error } = await client.from('projects').select('*').eq('id', id).maybeSingle();
    fail(error);
    if (!project) throw new Error('Projeto nao encontrado');
    const members = await loadMembers(project.workspace_id);
    const { data: columns, error: cErr } = await client
      .from('board_columns')
      .select('*, master_statuses (key)')
      .eq('project_id', id)
      .order('position');
    fail(cErr);
    const tasks = await decorateTasks(await fetchExpandedTasks({ projectId: id }), members);
    return {
      project: mapProject(project),
      columns: (columns || []).map((c) => ({
        ...mapColumn({ ...c, status_key: c.master_statuses?.key }),
        tasks: tasks.filter((tk) => tk.columnId === c.id),
      })),
    };
  },

  createColumn: async (projectId, input) => {
    const client = await requireSession();
    const masterStatusId = await resolveMasterStatusId(projectId, input.statusKey);
    const { data: siblings } = await client.from('board_columns').select('position').eq('project_id', projectId);
    const position = input.position ?? (siblings?.length ? Math.max(...siblings.map((s) => Number(s.position))) + 1 : 0);
    const { data, error } = await client
      .from('board_columns')
      .insert({
        project_id: projectId,
        master_status_id: masterStatusId,
        name: input.name?.trim() || 'Nova coluna',
        color: input.color || '#6E7A85',
        wip_limit: input.wipLimit ?? null,
        position,
      })
      .select('*, master_statuses (key)')
      .single();
    fail(error);
    return mapColumn({ ...data, status_key: data.master_statuses?.key });
  },

  updateColumn: async (id, patch) => {
    const client = await requireSession();
    const { data: current, error: curErr } = await client.from('board_columns').select('project_id').eq('id', id).single();
    fail(curErr);
    const body = {};
    if (patch.name != null) body.name = patch.name;
    if (patch.color != null) body.color = patch.color;
    if (patch.wipLimit !== undefined) body.wip_limit = patch.wipLimit;
    if (patch.position != null) body.position = patch.position;
    if (patch.statusKey) body.master_status_id = await resolveMasterStatusId(current.project_id, patch.statusKey);
    const { data, error } = await client
      .from('board_columns')
      .update(body)
      .eq('id', id)
      .select('*, master_statuses (key)')
      .single();
    fail(error);
    return mapColumn({ ...data, status_key: data.master_statuses?.key });
  },

  deleteColumn: async (id, fallbackColumnId) => {
    const client = await requireSession();
    if (fallbackColumnId) {
      const { error: moveErr } = await client.from('tasks').update({ column_id: fallbackColumnId }).eq('column_id', id);
      fail(moveErr);
    }
    const { error } = await client.from('board_columns').delete().eq('id', id);
    fail(error);
  },

  reorderColumns: async (projectId, orderedIds) => {
    const client = await requireSession();
    await Promise.all(
      orderedIds.map((id, i) => client.from('board_columns').update({ position: i }).eq('id', id).eq('project_id', projectId)),
    );
    const { data, error } = await client
      .from('board_columns')
      .select('*, master_statuses (key)')
      .eq('project_id', projectId)
      .order('position');
    fail(error);
    return (data || []).map((c) => mapColumn({ ...c, status_key: c.master_statuses?.key }));
  },

  tasks: async (filter = {}) => {
    const ws = filter.workspaceId || (await workspaceId());
    const members = await loadMembers(ws);
    return decorateTasks(await fetchExpandedTasks({ ...filter, workspaceId: ws }), members);
  },

  createTask: async (input) => {
    const client = await requireSession();
    const { data: column, error: colErr } = await client
      .from('board_columns')
      .select('id, project_id, projects (workspace_id)')
      .eq('id', input.columnId)
      .single();
    fail(colErr);
    const { data: siblings } = await client.from('tasks').select('position').eq('column_id', column.id);
    const position = input.position ?? (siblings?.length ? Math.max(...siblings.map((s) => Number(s.position))) + 1 : 0);
    const { data, error } = await client
      .from('tasks')
      .insert({
        project_id: column.project_id,
        column_id: column.id,
        title: input.title?.trim() || 'Nova tarefa',
        description: input.description || '',
        priority: input.priority || 'medium',
        assignee_id: input.assigneeId || null,
        due_date: input.dueDate || null,
        estimate_hours: Number(input.estimateHours) || 4,
        progress: Number(input.progress) || 0,
        position,
      })
      .select('*')
      .single();
    fail(error);
    const ws = column.projects?.workspace_id || (await workspaceId());
    await syncTaskLabels(data.id, ws, input.labels || []);
    if (Array.isArray(input.checklist) && input.checklist.length) {
      await client.from('checklist_items').insert(
        input.checklist.map((item, i) => ({
          task_id: data.id,
          text: item.text,
          done: Boolean(item.done),
          position: i,
        })),
      );
    }
    await logActivity(ws, data.project_id, 'created', data.title);
    const members = await loadMembers(ws);
    const rows = (await fetchExpandedTasks({ projectId: data.project_id })).filter((t) => t.id === data.id);
    return (await decorateTasks(rows, members))[0];
  },

  updateTask: async (id, patch) => {
    const client = await requireSession();
    const { data: current, error: curErr } = await client
      .from('tasks')
      .select('id, project_id, projects (workspace_id)')
      .eq('id', id)
      .single();
    fail(curErr);
    const body = {};
    if (patch.title != null) body.title = patch.title;
    if (patch.description != null) body.description = patch.description;
    if (patch.priority != null) body.priority = patch.priority;
    if (patch.assigneeId !== undefined) body.assignee_id = patch.assigneeId;
    if (patch.dueDate !== undefined) body.due_date = patch.dueDate;
    if (patch.estimateHours != null) body.estimate_hours = Number(patch.estimateHours);
    if (patch.loggedHours != null) body.logged_hours = Number(patch.loggedHours);
    if (patch.progress != null) body.progress = Number(patch.progress);
    if (patch.columnId != null) body.column_id = patch.columnId;
    if (patch.position != null) body.position = patch.position;
    if (Object.keys(body).length) {
      const { error } = await client.from('tasks').update(body).eq('id', id);
      fail(error);
    }
    const ws = current.projects?.workspace_id || (await workspaceId());
    if (patch.labels) await syncTaskLabels(id, ws, patch.labels);
    const members = await loadMembers(ws);
    const rows = await fetchExpandedTasks({ projectId: current.project_id });
    return (await decorateTasks(rows.filter((t) => t.id === id), members))[0];
  },

  deleteTask: async (id) => {
    const client = await requireSession();
    const { error } = await client.from('tasks').delete().eq('id', id);
    fail(error);
  },

  moveTask: async (id, payload) => {
    const client = await requireSession();
    const { data, error } = await client.rpc('move_task', {
      p_task_id: id,
      p_column_id: payload.columnId || null,
      p_master_status_key: payload.statusKey || null,
      p_position: payload.position ?? null,
    });
    fail(error);
    const ws = await workspaceId();
    const members = await loadMembers(ws);
    const rows = await fetchExpandedTasks({ projectId: data.project_id });
    return (await decorateTasks(rows.filter((t) => t.id === id), members))[0];
  },

  masterBoard: async (filter = {}) => {
    const ws = await workspaceId();
    const client = await requireSession();
    const members = await loadMembers(ws);
    const { data: statuses, error } = await client
      .from('master_statuses')
      .select('*')
      .eq('workspace_id', ws)
      .order('position');
    fail(error);
    const tasks = await decorateTasks(await fetchExpandedTasks({ workspaceId: ws, ...filter }), members);
    return {
      columns: (statuses || []).map((s) => ({
        id: s.key,
        statusKey: s.key,
        name: s.name,
        color: s.color,
        wipLimit: null,
        position: s.position,
        tasks: tasks
          .filter((tk) => tk.statusKey === s.key)
          .filter((tk) => !filter.projectId || tk.projectId === filter.projectId)
          .filter((tk) => !filter.assigneeId || tk.assigneeId === filter.assigneeId)
          .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.position - b.position),
      })),
    };
  },

  applyInsight: async (id) => {
    const client = await requireSession();
    const { data: insight, error } = await client.from('ai_insights').select('*').eq('id', id).single();
    fail(error);
    const payload = insight.payload || {};
    for (const taskId of payload.taskIds || []) {
      if (payload.toMemberId) await api.updateTask(taskId, { assigneeId: payload.toMemberId });
      if (payload.priority) await api.updateTask(taskId, { priority: payload.priority });
      if (payload.toStatus) await api.moveTask(taskId, { statusKey: payload.toStatus });
    }
    const { data: userData } = await client.auth.getUser();
    const { data, error: upErr } = await client
      .from('ai_insights')
      .update({ applied_at: new Date().toISOString(), applied_by: userData.user?.id || null })
      .eq('id', id)
      .select('*')
      .single();
    fail(upErr);
    return mapInsight(data);
  },

  dismissInsight: async (id) => {
    const client = await requireSession();
    const { error } = await client.from('ai_insights').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
    fail(error);
  },

  myWorkspaceRole: async (ws) => {
    const client = await requireSession();
    const { data: userData, error: userErr } = await client.auth.getUser();
    fail(userErr);
    const { data, error } = await client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', ws)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    fail(error);
    return data?.role || null;
  },

  listMcpTokens: async (ws) => {
    const client = await requireSession();
    const { data, error } = await client
      .from('v_mcp_tokens')
      .select('id, workspace_id, user_id, name, token_prefix, last_used_at, created_at, revoked_at')
      .eq('workspace_id', ws)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    fail(error);
    return data || [];
  },

  createMcpToken: async (ws, name) => {
    const client = await requireSession();
    const { data, error } = await client.rpc('create_mcp_token', {
      p_workspace_id: ws,
      p_name: name || 'MCP',
    });
    fail(error);
    return Array.isArray(data) ? data[0] : data;
  },

  revokeMcpToken: async (id) => {
    const client = await requireSession();
    const { error } = await client.rpc('revoke_mcp_token', { p_id: id });
    fail(error);
  },

  ask: async (prompt = '', history = []) => {
    const dash = await api.dashboard();
    const live = {
      tasks: dash.tasks || [],
      projects: dash.projects || [],
      members: dash.workload,
      insights: dash.insights,
      stats: dash.stats,
      workload: dash.workload,
      distribution: dash.distribution,
      activity: dash.activity,
    };
    const columns = await loadCatalogColumns(live.projects);
    const catalog = buildCatalog({
      tasks: live.tasks,
      projects: live.projects,
      members: live.members,
      statuses: Object.entries(STATUS_META).map(([key, v]) => ({ key, name: v.label, color: v.color })),
      insights: dash.insights,
      stats: dash.stats,
      workload: dash.workload,
      activity: dash.activity,
      columns,
      today: TODAY,
    });

    const parsed = await askModel(prompt, history, catalog);
    let reply = parsed ? parseAssistantReply(parsed, { catalog, live }) : heuristicReply(prompt, { catalog, live });
    if (reply.actions?.length) {
      const applied = await applyAskActions(reply.actions, { api, catalog });
      if (applied.length) cacheInvalidateWorkspace();
      reply = mergeActionBlocks(reply, applied);
    }
    return reply;
  },
};

async function loadCatalogColumns(projects) {
  const ids = (projects || []).map((p) => p.id);
  if (!ids.length) return [];
  const client = await requireSession();
  const { data, error } = await client
    .from('board_columns')
    .select('id, name, color, wip_limit, project_id, master_statuses (key)')
    .in('project_id', ids)
    .order('position');
  fail(error);
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    statusKey: c.master_statuses?.key,
    projectId: c.project_id,
    projectName: byId[c.project_id]?.name,
    projectKey: byId[c.project_id]?.key,
    wipLimit: c.wip_limit,
  }));
}

async function askModel(prompt, history, catalog) {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, catalog }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.content) return data.content;
      if (data?.answer || data?.blocks) return data;
    }
  } catch {
    /* tenta edge */
  }

  try {
    const client = await requireSession();
    const { data, error } = await client.functions.invoke('kanbot-ask', {
      body: { prompt, history, catalog },
    });
    if (!error && (data?.content || data?.answer || data?.blocks)) return data.content || data;
  } catch {
    /* heuristic */
  }
  return null;
}
