import { asString, fold, matchByName } from './parseReply';

const ICONS = new Set(['sparkle', 'pulse', 'device', 'shield', 'layers', 'target']);
const PRIORITY = {
  urgent: 'urgent',
  urgente: 'urgent',
  high: 'high',
  alta: 'high',
  medium: 'medium',
  media: 'medium',
  low: 'low',
  baixa: 'low',
};
const STATUS = {
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

function pick(list, query, keys) {
  const q = asString(query).trim();
  if (!q) return null;
  if (list.some((item) => item.id === q)) return list.find((item) => item.id === q);
  return matchByName(list, q, keys);
}

function labelsOf(raw) {
  return asString(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function dueOf(raw) {
  const s = asString(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return br[3] + '-' + br[2].padStart(2, '0') + '-' + br[1].padStart(2, '0');
  return '';
}

function resolveColumn(action, ctx) {
  const project = action.project || null;
  const columns = ctx.columns.filter((c) => !project || c.projectId === project.id);
  if (action.columnId) {
    const hit = pick(columns, action.columnId, ['name', 'id']) || pick(ctx.columns, action.columnId, ['name', 'id']);
    if (hit) return hit;
  }
  const status = STATUS[fold(action.statusKey).replace(/\s+/g, '_')] || '';
  if (status) {
    return columns.find((c) => c.statusKey === status) || columns.find((c) => fold(c.name).includes(status));
  }
  return columns[0] || null;
}

export async function applyAskActions(actions, { api, catalog }) {
  const ctx = {
    projects: [...(catalog.projects || [])],
    columns: [...(catalog.columns || [])],
    members: [...(catalog.members || [])],
    tasks: [...(catalog.tasks || [])],
  };
  const results = [];

  for (const action of actions || []) {
    try {
      if (action.op === 'create_project') {
        const name = action.name || action.title;
        if (!name) throw new Error('Projeto sem nome');
        const baseKey = (action.key || name).replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'PRJ';
        let project;
        try {
          project = await api.createProject({
            name,
            key: baseKey,
            description: action.description,
            color: action.color || '#F5A524',
            icon: ICONS.has(action.icon) ? action.icon : 'sparkle',
          });
        } catch (err) {
          project = await api.createProject({
            name,
            key: (baseKey.slice(0, 2) + Math.random().toString(36).slice(2, 3)).toUpperCase(),
            description: action.description,
            color: action.color || '#F5A524',
            icon: ICONS.has(action.icon) ? action.icon : 'sparkle',
          });
          void err;
        }
        const board = await api.projectBoard(project.id);
        ctx.projects.push(project);
        ctx.columns.push(
          ...board.columns.map((c) => ({
            id: c.id,
            name: c.name,
            statusKey: c.statusKey,
            projectId: project.id,
            projectName: project.name,
            projectKey: project.key,
          })),
        );
        results.push({ op: action.op, ok: true, project, label: 'Projeto ' + project.name });
        continue;
      }

      if (action.op === 'create_task') {
        const title = action.title || action.name;
        if (!title) throw new Error('Tarefa sem titulo');
        const project = pick(ctx.projects, action.projectId, ['name', 'key']);
        if (!project) throw new Error('Projeto nao encontrado: ' + (action.projectId || '?'));
        const column = resolveColumn({ ...action, project }, ctx);
        if (!column) throw new Error('Coluna nao encontrada em ' + project.key);
        const assignee = pick(ctx.members, action.assigneeId, ['name', 'email']);
        const task = await api.createTask({
          title,
          description: action.description,
          columnId: column.id,
          priority: PRIORITY[fold(action.priority)] || 'medium',
          assigneeId: assignee?.id || null,
          dueDate: dueOf(action.dueDate) || null,
          estimateHours: Number(action.estimateHours) || 4,
          progress: Number(action.progress) || 0,
          labels: labelsOf(action.labels),
        });
        ctx.tasks.push(task);
        results.push({ op: action.op, ok: true, task, label: 'Tarefa ' + task.title });
        continue;
      }

      if (action.op === 'update_task') {
        const current = pick(ctx.tasks, action.id || action.title, ['title']);
        if (!current) throw new Error('Tarefa nao encontrada: ' + (action.id || action.title || '?'));
        const patch = {};
        if (action.title) patch.title = action.title;
        if (action.description) patch.description = action.description;
        if (action.priority) patch.priority = PRIORITY[fold(action.priority)] || action.priority;
        if (action.assigneeId) {
          const assignee = pick(ctx.members, action.assigneeId, ['name', 'email']);
          if (assignee) patch.assigneeId = assignee.id;
          if (fold(action.assigneeId) === 'ninguem' || fold(action.assigneeId) === 'none') patch.assigneeId = null;
        }
        if (action.dueDate) patch.dueDate = dueOf(action.dueDate) || action.dueDate;
        if (action.estimateHours) patch.estimateHours = Number(action.estimateHours);
        if (action.progress) patch.progress = Number(action.progress);
        if (action.labels) patch.labels = labelsOf(action.labels);

        const project = pick(ctx.projects, action.projectId || current.projectId, ['name', 'key']) || {
          id: current.projectId,
        };
        const column = resolveColumn({ ...action, project }, ctx);
        if ((action.columnId || action.statusKey) && column) {
          await api.moveTask(current.id, { columnId: column.id });
        }
        const task = Object.keys(patch).length ? await api.updateTask(current.id, patch) : await api.updateTask(current.id, {});
        ctx.tasks = ctx.tasks.map((t) => (t.id === task.id ? task : t));
        results.push({ op: action.op, ok: true, task, label: 'Editou ' + task.title });
      }
    } catch (e) {
      results.push({ op: action.op, ok: false, error: e.message, label: e.message });
    }
  }

  return results;
}

export function mergeActionBlocks(reply, results) {
  const projects = results.filter((r) => r.ok && r.project).map((r) => r.project);
  const created = results.filter((r) => r.ok && r.task && r.op === 'create_task').map((r) => r.task);
  const updated = results.filter((r) => r.ok && r.task && r.op === 'update_task').map((r) => r.task);
  const failed = results.filter((r) => !r.ok);

  const extra = [];
  if (projects.length) extra.push({ id: 'act-p', type: 'projects', title: 'Projeto criado', items: projects });
  if (created.length) extra.push({ id: 'act-c', type: 'tasks', title: 'Tarefa criada', items: created });
  if (updated.length) extra.push({ id: 'act-u', type: 'tasks', title: 'Tarefa atualizada', items: updated });

  const answer = failed.length
    ? (reply.answer || '') + (reply.answer ? ' ' : '') + failed.map((f) => f.error).join(' ')
    : reply.answer;

  return { ...reply, answer, blocks: [...extra, ...(reply.blocks || [])], applied: results };
}
