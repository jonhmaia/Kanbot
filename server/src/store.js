import { randomUUID } from 'node:crypto';
import * as seed from './data/seed.js';

/**
 * Store em memoria. Substitua cada metodo por uma query Supabase quando
 * o banco entrar: as assinaturas ja foram desenhadas para isso.
 */
const clone = (v) => JSON.parse(JSON.stringify(v));

const db = {
  workspaces: clone(seed.workspaces),
  members: clone(seed.members),
  projects: clone(seed.projects),
  columns: clone(seed.columns),
  tasks: clone(seed.tasks),
  insights: clone(seed.insights),
  activity: clone(seed.activity),
  notifications: clone(seed.notifications),
};

export const MASTER_STATUSES = seed.MASTER_STATUSES;
export const coverageSeries = seed.coverageSeries;
export const forecastSeries = seed.forecastSeries;
export const liveTimeline = seed.liveTimeline;
export const currentUser = seed.currentUser;

const byPosition = (a, b) => a.position - b.position;
const nowIso = () => new Date().toISOString();
const nextPosition = (list) => (list.length ? Math.max(...list.map((i) => i.position)) + 1 : 0);

function reindex(list) {
  list.sort(byPosition).forEach((item, i) => {
    item.position = i;
  });
}

function logActivity(memberId, action, target, projectId) {
  db.activity.unshift({ id: randomUUID(), memberId, action, target, projectId, at: nowIso() });
  db.activity = db.activity.slice(0, 40);
}

/* ---------------------------------------------------------------- basics */

export const listWorkspaces = () => clone(db.workspaces);
export const listMembers = () => clone(db.members);
export const listNotifications = () => clone(db.notifications);
export const listActivity = () => clone(db.activity);

/* -------------------------------------------------------------- projects */

export function listProjects() {
  return db.projects.map((p) => {
    const cols = db.columns.filter((c) => c.projectId === p.id);
    const items = db.tasks.filter((tk) => tk.projectId === p.id);
    const doneColumnIds = cols.filter((c) => c.statusKey === 'done').map((c) => c.id);
    const done = items.filter((tk) => doneColumnIds.includes(tk.columnId)).length;
    return {
      ...clone(p),
      columnCount: cols.length,
      taskCount: items.length,
      doneCount: done,
      progress: items.length ? Math.round((done / items.length) * 100) : 0,
      memberIds: [...new Set(items.map((tk) => tk.assigneeId).filter(Boolean))],
    };
  });
}

export const getProject = (id) => clone(db.projects.find((p) => p.id === id) || null);

const DEFAULT_COLUMNS = [
  { name: 'Backlog', statusKey: 'backlog', color: '#6E7A85', wipLimit: null },
  { name: 'In Progress', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4 },
  { name: 'Review', statusKey: 'review', color: '#BFE3F2', wipLimit: 3 },
  { name: 'Done', statusKey: 'done', color: '#8FE3B0', wipLimit: null },
];

export function createProject(input) {
  const project = {
    id: randomUUID(),
    workspaceId: input.workspaceId || db.workspaces[0].id,
    name: input.name?.trim() || 'Novo projeto',
    key: (input.key || input.name || 'PRJ').slice(0, 3).toUpperCase(),
    description: input.description || '',
    color: input.color || '#F5A524',
    icon: input.icon || 'sparkle',
    status: 'active',
    ownerId: input.ownerId || currentUser.id,
    startDate: input.startDate || nowIso().slice(0, 10),
    dueDate: input.dueDate || null,
    createdAt: nowIso(),
  };
  db.projects.push(project);

  const template = Array.isArray(input.columns) && input.columns.length ? input.columns : DEFAULT_COLUMNS;
  template.forEach((c, i) => {
    db.columns.push({
      id: randomUUID(),
      projectId: project.id,
      name: c.name,
      statusKey: c.statusKey || 'backlog',
      color: c.color || '#6E7A85',
      wipLimit: c.wipLimit ?? null,
      position: i,
    });
  });

  logActivity(project.ownerId, 'criou o projeto', project.name, project.id);
  return clone(project);
}

export function updateProject(id, patch) {
  const project = db.projects.find((p) => p.id === id);
  if (!project) return null;
  Object.assign(project, patch, { id: project.id });
  return clone(project);
}

export function deleteProject(id) {
  const index = db.projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  db.projects.splice(index, 1);
  db.columns = db.columns.filter((c) => c.projectId !== id);
  db.tasks = db.tasks.filter((tk) => tk.projectId !== id);
  return true;
}

/* --------------------------------------------------------------- columns */

export function listColumns(projectId) {
  return clone(db.columns.filter((c) => c.projectId === projectId).sort(byPosition));
}

export function createColumn(projectId, input) {
  if (!db.projects.some((p) => p.id === projectId)) return null;
  const siblings = db.columns.filter((c) => c.projectId === projectId);
  const column = {
    id: randomUUID(),
    projectId,
    name: input.name?.trim() || 'Nova coluna',
    statusKey: input.statusKey || 'backlog',
    color: input.color || '#6E7A85',
    wipLimit: input.wipLimit ?? null,
    position: input.position ?? nextPosition(siblings),
  };
  db.columns.push(column);
  return clone(column);
}

export function updateColumn(id, patch) {
  const column = db.columns.find((c) => c.id === id);
  if (!column) return null;
  Object.assign(column, patch, { id: column.id, projectId: column.projectId });
  return clone(column);
}

export function deleteColumn(id, fallbackColumnId) {
  const column = db.columns.find((c) => c.id === id);
  if (!column) return false;
  const siblings = db.columns.filter((c) => c.projectId === column.projectId && c.id !== id);
  const target = fallbackColumnId || siblings[0]?.id || null;
  db.tasks.forEach((tk) => {
    if (tk.columnId !== id) return;
    if (target) tk.columnId = target;
  });
  if (!target) db.tasks = db.tasks.filter((tk) => tk.columnId !== id);
  db.columns = db.columns.filter((c) => c.id !== id);
  reindex(db.columns.filter((c) => c.projectId === column.projectId));
  return true;
}

export function reorderColumns(projectId, orderedIds) {
  orderedIds.forEach((id, i) => {
    const column = db.columns.find((c) => c.id === id && c.projectId === projectId);
    if (column) column.position = i;
  });
  return listColumns(projectId);
}

/* ----------------------------------------------------------------- tasks */

const decorate = (task) => {
  const column = db.columns.find((c) => c.id === task.columnId) || null;
  const project = db.projects.find((p) => p.id === task.projectId) || null;
  return {
    ...clone(task),
    statusKey: column?.statusKey || 'backlog',
    columnName: column?.name || '',
    projectName: project?.name || '',
    projectKey: project?.key || '',
    projectColor: project?.color || '#F5A524',
    assignee: db.members.find((m) => m.id === task.assigneeId) || null,
  };
};

export function listTasks(filter = {}) {
  let items = db.tasks;
  if (filter.projectId) items = items.filter((tk) => tk.projectId === filter.projectId);
  if (filter.assigneeId) items = items.filter((tk) => tk.assigneeId === filter.assigneeId);
  if (filter.priority) items = items.filter((tk) => tk.priority === filter.priority);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    items = items.filter((tk) => tk.title.toLowerCase().includes(q) || tk.description.toLowerCase().includes(q));
  }
  return items.slice().sort(byPosition).map(decorate);
}

export const getTask = (id) => {
  const task = db.tasks.find((tk) => tk.id === id);
  return task ? decorate(task) : null;
};

export function createTask(input) {
  const column = db.columns.find((c) => c.id === input.columnId);
  if (!column) return null;
  const siblings = db.tasks.filter((tk) => tk.columnId === column.id);
  const task = {
    id: randomUUID(),
    projectId: column.projectId,
    columnId: column.id,
    title: input.title?.trim() || 'Nova tarefa',
    description: input.description || '',
    priority: input.priority || 'medium',
    assigneeId: input.assigneeId || null,
    labels: input.labels || [],
    dueDate: input.dueDate || null,
    estimateHours: Number(input.estimateHours) || 4,
    loggedHours: 0,
    progress: Number(input.progress) || 0,
    checklist: input.checklist || [],
    comments: 0,
    attachments: 0,
    position: input.position ?? nextPosition(siblings),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.tasks.push(task);
  logActivity(task.assigneeId || currentUser.id, 'criou', task.title, task.projectId);
  return decorate(task);
}

export function updateTask(id, patch) {
  const task = db.tasks.find((tk) => tk.id === id);
  if (!task) return null;
  Object.assign(task, patch, { id: task.id, updatedAt: nowIso() });
  const column = db.columns.find((c) => c.id === task.columnId);
  if (column) task.projectId = column.projectId;
  return decorate(task);
}

export function deleteTask(id) {
  const index = db.tasks.findIndex((tk) => tk.id === id);
  if (index === -1) return false;
  db.tasks.splice(index, 1);
  return true;
}

/**
 * Move um card. No board de projeto recebe columnId direto.
 * No board master recebe statusKey: a tarefa vai para a coluna daquele
 * projeto que representa o status, sem quebrar o fluxo customizado.
 */
export function moveTask(id, { columnId, statusKey, position }) {
  const task = db.tasks.find((tk) => tk.id === id);
  if (!task) return null;

  let target = null;
  if (columnId) target = db.columns.find((c) => c.id === columnId);
  else if (statusKey) {
    target =
      db.columns.find((c) => c.projectId === task.projectId && c.statusKey === statusKey) || null;
  }
  if (!target) return null;

  const from = db.columns.find((c) => c.id === task.columnId);
  task.columnId = target.id;
  task.projectId = target.projectId;
  task.updatedAt = nowIso();
  if (target.statusKey === 'done') task.progress = 100;

  const siblings = db.tasks.filter((tk) => tk.columnId === target.id && tk.id !== task.id).sort(byPosition);
  const at = position === undefined || position === null ? siblings.length : Math.max(0, Math.min(position, siblings.length));
  siblings.splice(at, 0, task);
  siblings.forEach((tk, i) => {
    tk.position = i;
  });

  if (from && from.id !== target.id) {
    logActivity(task.assigneeId || currentUser.id, 'moveu para ' + target.name, task.title, task.projectId);
  }
  return decorate(task);
}

/* ------------------------------------------------------------- boards */

export function getProjectBoard(projectId) {
  const project = getProject(projectId);
  if (!project) return null;
  const cols = listColumns(projectId);
  const items = listTasks({ projectId });
  return {
    project,
    columns: cols.map((c) => ({
      ...c,
      tasks: items.filter((tk) => tk.columnId === c.id),
    })),
  };
}

/** Board master: uma coluna por status, com cards de todos os projetos. */
export function getMasterBoard(filter = {}) {
  const items = listTasks(filter);
  return {
    columns: MASTER_STATUSES.map((s) => ({
      id: s.key,
      statusKey: s.key,
      name: s.name,
      color: s.color,
      wipLimit: null,
      position: s.position,
      tasks: items
        .filter((tk) => tk.statusKey === s.key)
        .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.position - b.position),
    })),
  };
}

/* ---------------------------------------------------------- dashboard */

export function getDashboard() {
  const items = listTasks();
  const total = items.length;
  const count = (key) => items.filter((tk) => tk.statusKey === key).length;
  const done = count('done');
  const inProgress = count('in_progress');
  const review = count('review');
  const backlog = count('backlog');
  const blocked = count('blocked');

  const today = '2026-09-02';
  const overdue = items.filter((tk) => tk.dueDate && tk.dueDate < today && tk.statusKey !== 'done').length;
  const dueToday = items.filter((tk) => tk.dueDate === today && tk.statusKey !== 'done').length;

  const capacity = 40;
  const load = items
    .filter((tk) => tk.statusKey !== 'done')
    .reduce((sum, tk) => sum + (tk.estimateHours - tk.loggedHours), 0);

  const workload = db.members.map((m) => {
    const mine = items.filter((tk) => tk.assigneeId === m.id && tk.statusKey !== 'done');
    return {
      ...m,
      openTasks: mine.length,
      hours: mine.reduce((s, tk) => s + tk.estimateHours, 0),
      utilization: Math.min(140, Math.round((mine.reduce((s, tk) => s + tk.estimateHours, 0) / capacity) * 100)),
    };
  });

  return {
    stats: {
      velocity: Math.round((done / Math.max(total, 1)) * 100) + 12,
      activeTasks: inProgress + review,
      completed: done,
      overdue,
      dueToday,
      blocked,
      totalTasks: total,
      projectsActive: db.projects.filter((p) => p.status === 'active').length,
      loadHours: load,
      capacityHours: db.members.length * capacity,
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
    timeline: liveTimeline.map((row) => ({
      ...row,
      member: db.members.find((m) => m.id === row.memberId) || null,
      project: db.projects.find((p) => p.id === row.projectId) || null,
    })),
    workload,
    insights: clone(db.insights),
    activity: clone(db.activity).slice(0, 6),
  };
}

/* ----------------------------------------------------------- insights */

export function applyInsight(id) {
  const insight = db.insights.find((i) => i.id === id);
  if (!insight) return null;
  insight.applied = true;

  const { taskIds = [], toMemberId, priority, toStatus } = insight.payload || {};
  taskIds.forEach((taskId) => {
    const task = db.tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    if (toMemberId) task.assigneeId = toMemberId;
    if (priority) task.priority = priority;
    if (toStatus) moveTask(taskId, { statusKey: toStatus });
    task.updatedAt = nowIso();
  });

  logActivity(currentUser.id, 'aplicou o insight', insight.title, null);
  return clone(insight);
}

export function dismissInsight(id) {
  db.insights = db.insights.filter((i) => i.id !== id);
  return true;
}

/* ---------------------------------------------------------- assistant */

/** Assistente mockado: responde por palavra-chave sobre os dados atuais. */
export function askAssistant(prompt = '') {
  const q = prompt.toLowerCase();
  const items = listTasks();
  const open = items.filter((tk) => tk.statusKey !== 'done');

  if (q.includes('bloque') || q.includes('blocked') || q.includes('risco')) {
    const blocked = items.filter((tk) => tk.statusKey === 'blocked');
    return {
      answer:
        blocked.length === 0
          ? 'Nenhum card bloqueado agora. O maior risco e "' + open[0]?.title + '".'
          : blocked.length + ' card(s) bloqueado(s): ' + blocked.map((tk) => tk.title).join(', ') + '.',
      suggestions: ['Quem esta sobrecarregado?', 'O que vence hoje?'],
    };
  }
  if (q.includes('vence') || q.includes('hoje') || q.includes('prazo')) {
    const due = open.filter((tk) => tk.dueDate && tk.dueDate <= '2026-09-05');
    return {
      answer: due.length + ' tarefa(s) vencem ate sexta: ' + due.slice(0, 3).map((tk) => tk.title).join(', ') + '.',
      suggestions: ['Resumo do sprint', 'Quem esta sobrecarregado?'],
    };
  }
  if (q.includes('sobrecarr') || q.includes('carga') || q.includes('quem')) {
    const board = getDashboard().workload.slice().sort((a, b) => b.hours - a.hours);
    return {
      answer:
        board[0].name + ' esta com a maior carga: ' + board[0].openTasks + ' tarefas abertas (' + board[0].hours + 'h, ' + board[0].utilization + '% da capacidade).',
      suggestions: ['Redistribuir tarefas', 'Mostrar bloqueios'],
    };
  }
  if (q.includes('resumo') || q.includes('sprint') || q.includes('status')) {
    const d = getDashboard().stats;
    return {
      answer:
        'Sprint atual: ' + d.completed + ' concluidas, ' + d.activeTasks + ' em andamento, ' + d.overdue + ' atrasadas em ' + d.projectsActive + ' projetos ativos.',
      suggestions: ['O que vence hoje?', 'Mostrar bloqueios'],
    };
  }
  return {
    answer:
      'Tenho ' + items.length + ' tarefas em ' + db.projects.length + ' projetos aqui. Posso resumir o sprint, listar bloqueios, mostrar prazos ou apontar sobrecarga do time.',
    suggestions: ['Resumo do sprint', 'Mostrar bloqueios', 'O que vence hoje?'],
  };
}
