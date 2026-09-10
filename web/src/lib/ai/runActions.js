import { asString, fold, matchByName, isBlankAssistantAnswer } from './parseReply';

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
  a_fazer: 'backlog',
  todo: 'backlog',
  in_progress: 'in_progress',
  progresso: 'in_progress',
  andamento: 'in_progress',
  em_andamento: 'in_progress',
  em_progresso: 'in_progress',
  fazendo: 'in_progress',
  building: 'in_progress',
  designing: 'in_progress',
  review: 'review',
  revisao: 'review',
  em_revisao: 'review',
  blocked: 'blocked',
  bloqueado: 'blocked',
  done: 'done',
  concluido: 'done',
  concluida: 'done',
  pronto: 'done',
  pronta: 'done',
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
  const board = action.board || null;
  let columns = ctx.columns.filter((c) => !project || c.projectId === project.id);
  if (board) columns = columns.filter((c) => !c.boardId || c.boardId === board.id);
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

function resolveProject(action, ctx, context) {
  return (
    pick(ctx.projects, action.projectId, ['name', 'key']) ||
    pick(ctx.projects, context?.projectId, ['name', 'key']) ||
    pick(ctx.projects, context?.threadProjectId, ['name', 'key']) ||
    pick(ctx.projects, context?.threadProjectName, ['name', 'key']) ||
    pick(ctx.projects, context?.threadProjectKey, ['name', 'key']) ||
    (ctx.projects.length === 1 ? ctx.projects[0] : null)
  );
}

function resolveBoard(action, ctx, project, context, task) {
  const list = (ctx.boards || []).filter((b) => !project || b.projectId === project.id);
  const fromContext = pick(ctx.boards || [], context?.boardId, ['name', 'id']);
  const contextFits = fromContext && (!project || fromContext.projectId === project.id);
  return (
    pick(list, action.boardId, ['name', 'id']) ||
    pick(list, task?.boardId, ['name', 'id']) ||
    (contextFits ? fromContext : null) ||
    list.find((b) => b.isDefault) ||
    list[0] ||
    null
  );
}

function resolveSprint(action, ctx, project, context) {
  const fromAction = pick(ctx.sprints, action.sprintId, ['name']);
  if (fromAction) return fromAction;
  const fromScreen = pick(ctx.sprints, context?.sprintId, ['name']);
  if (!fromScreen) return null;
  const board = ctx.boards.find((b) => b.id === fromScreen.boardId);
  if (project && board && board.projectId !== project.id) return null;
  return fromScreen;
}

const THIS_TASK = /^(esta|essa|a|the|this)\s+(tarefa|task|card)$|^(isto|isso|aqui)$/;

/** "esta tarefa" / id vazio caem na tarefa aberta na tela. */
function contextTaskRef(ref, context) {
  const q = asString(ref).trim();
  if (!q || THIS_TASK.test(fold(q))) return context?.openTask?.id || q;
  return q;
}

export async function applyAskActions(actions, { api, catalog, context = null }) {
  const ctx = {
    projects: [...(catalog.projects || [])],
    columns: [...(catalog.columns || [])],
    members: [...(catalog.members || [])],
    tasks: [...(catalog.tasks || [])],
    boards: [...(catalog.boards || [])],
    sprints: [...(catalog.sprints || [])],
  };
  const results = [];
  let askedProduct = false;

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
        const view = await api.projectBoard(project.id);
        ctx.projects.push(project);
        if (view.board) ctx.boards.push(view.board);
        ctx.columns.push(
          ...view.columns.map((c) => ({
            id: c.id,
            name: c.name,
            statusKey: c.statusKey,
            projectId: project.id,
            projectName: project.name,
            projectKey: project.key,
            boardId: view.board?.id,
            boardName: view.board?.name,
          })),
        );
        results.push({ op: action.op, ok: true, project, label: 'Projeto ' + project.name });
        continue;
      }

      if (action.op === 'create_board') {
        const project = resolveProject(action, ctx, context);
        if (!project) throw new Error('Diga em qual produto eu crio o board.');
        const kind = fold(action.kind) === 'dynamic' ? 'dynamic' : 'normal';
        const created = await api.createBoard(project.id, {
          name: action.name || action.title || 'Novo board',
          kind,
          frequencyDays: kind === 'dynamic' ? Number(action.frequencyDays) || 7 : null,
        });
        ctx.boards.push(created);
        const view = await api.projectBoard(project.id, { boardId: created.id });
        ctx.columns.push(
          ...view.columns.map((c) => ({
            id: c.id,
            name: c.name,
            statusKey: c.statusKey,
            projectId: project.id,
            boardId: created.id,
            boardName: created.name,
          })),
        );
        if (view.sprint) ctx.sprints.unshift(view.sprint);
        results.push({ op: action.op, ok: true, board: created, label: 'Board ' + created.name });
        continue;
      }

      if (action.op === 'update_board') {
        const current = pick(ctx.boards, action.id || action.boardId || action.name, ['name']);
        if (!current) throw new Error('Board nao encontrado: ' + (action.id || action.name || '?'));
        const patch = {};
        if (action.name) patch.name = action.name;
        if (action.kind) patch.kind = fold(action.kind) === 'dynamic' ? 'dynamic' : 'normal';
        if (action.frequencyDays) patch.frequencyDays = Number(action.frequencyDays);
        const board = await api.updateBoard(current.id, patch);
        ctx.boards = ctx.boards.map((b) => (b.id === board.id ? board : b));
        results.push({ op: action.op, ok: true, board, label: 'Board ' + board.name });
        continue;
      }

      if (action.op === 'delete_board') {
        const current = pick(ctx.boards, action.id || action.boardId || action.name, ['name']);
        if (!current) throw new Error('Board nao encontrado: ' + (action.id || action.name || '?'));
        await api.deleteBoard(current.id);
        ctx.boards = ctx.boards.filter((b) => b.id !== current.id);
        results.push({ op: action.op, ok: true, label: 'Excluiu board ' + current.name });
        continue;
      }

      if (action.op === 'create_sprint') {
        let board =
          pick(ctx.boards, action.boardId || action.id, ['name']) ||
          pick(ctx.boards, context?.boardId, ['name']);
        const project =
          pick(ctx.projects, action.projectId, ['name', 'key']) ||
          pick(ctx.projects, context?.projectId, ['name', 'key']);
        if (!board && project) {
          board = ctx.boards.find((b) => b.projectId === project.id && b.kind === 'dynamic') || null;
        }
        if (!board && project) {
          board = await api.createBoard(project.id, {
            name: action.name || 'Sprint',
            kind: 'dynamic',
            frequencyDays: Number(action.frequencyDays) || 7,
          });
          ctx.boards.push(board);
          const view = await api.projectBoard(project.id, { boardId: board.id });
          ctx.columns.push(
            ...view.columns.map((c) => ({
              id: c.id,
              name: c.name,
              statusKey: c.statusKey,
              projectId: project.id,
              boardId: board.id,
              boardName: board.name,
            })),
          );
          if (view.sprint) {
            ctx.sprints.unshift(view.sprint);
            results.push({ op: action.op, ok: true, sprint: view.sprint, board, label: 'Sprint ' + view.sprint.name });
            continue;
          }
        }
        if (!board) throw new Error('Board nao encontrado para o sprint');
        const sprint = await api.createSprint(board.id, {
          name: action.name || action.title,
          startsOn: dueOf(action.startsOn) || null,
          endsOn: dueOf(action.endsOn) || null,
        });
        ctx.sprints.unshift(sprint);
        results.push({ op: action.op, ok: true, sprint, label: 'Sprint ' + sprint.name });
        continue;
      }

      if (action.op === 'close_sprint') {
        const sprint =
          pick(ctx.sprints, action.id || action.sprintId || action.name, ['name']) ||
          pick(ctx.sprints, context?.sprintId, ['name']) ||
          ctx.sprints.find((s) => s.status === 'active' && (!context?.boardId || s.boardId === context.boardId));
        if (!sprint) throw new Error('Sprint nao encontrado');
        const next = await api.closeSprint(sprint.id);
        ctx.sprints = ctx.sprints.map((s) => (s.id === sprint.id ? { ...s, status: 'closed' } : s));
        if (next) ctx.sprints.unshift(next);
        results.push({ op: action.op, ok: true, sprint: next, label: 'Fechou sprint e abriu ' + (next?.name || 'o proximo') });
        continue;
      }

      if (action.op === 'create_task') {
        const title = action.title || action.name;
        if (!title) throw new Error('Tarefa sem titulo');
        const project = resolveProject(action, ctx, context);
        if (!project) {
          if (askedProduct) continue;
          askedProduct = true;
          throw new Error('Diga em qual produto eu crio a tarefa (ex.: a key SFR).');
        }
        const board = resolveBoard(action, ctx, project, context);
        const column = resolveColumn({ ...action, project, board }, ctx);
        if (!column) throw new Error('Coluna nao encontrada em ' + project.key);
        const assignee = pick(ctx.members, action.assigneeId, ['name', 'email']);
        const sprint = resolveSprint(action, ctx, project, context);
        const created = await api.createTask({
          title,
          description: action.description,
          columnId: column.id,
          sprintId: sprint?.id || null,
          priority: PRIORITY[fold(action.priority)] || 'medium',
          assigneeId: assignee?.id || null,
          dueDate: dueOf(action.dueDate) || null,
          estimateHours: Number(action.estimateHours) || 4,
          progress: Number(action.progress) || 0,
          labels: labelsOf(action.labels),
        });
        const task = {
          ...(created || {}),
          title: created?.title || title,
          projectId: created?.projectId || project.id,
          columnId: created?.columnId || column.id,
        };
        ctx.tasks.push(task);
        results.push({ op: action.op, ok: true, task, label: 'Tarefa ' + (task.title || title) });
        continue;
      }

      if (action.op === 'delete_task') {
        const current = pick(ctx.tasks, contextTaskRef(action.id || action.title, context), ['title']);
        if (!current) throw new Error('Tarefa nao encontrada: ' + (action.id || action.title || '?'));
        await api.deleteTask(current.id);
        ctx.tasks = ctx.tasks.filter((t) => t.id !== current.id);
        results.push({ op: action.op, ok: true, label: 'Excluiu ' + current.title });
        continue;
      }

      if (action.op === 'move_task' || action.op === 'update_task') {
        const current = pick(ctx.tasks, contextTaskRef(action.id || action.title, context), ['title']);
        if (!current) throw new Error('Tarefa nao encontrada: ' + (action.id || action.title || '?'));
        const project = pick(ctx.projects, action.projectId || current.projectId, ['name', 'key']) || {
          id: current.projectId,
        };
        const board = resolveBoard(action, ctx, project, context, current);
        const column = resolveColumn({ ...action, project, board }, ctx);
        let task = current;
        if (action.op === 'move_task' || action.columnId || action.statusKey) {
          if (!column) throw new Error('Coluna destino nao encontrada');
          task =
            (await api.moveTask(current.id, { columnId: column.id })) || {
              ...current,
              columnId: column.id,
              statusKey: column.statusKey || current.statusKey,
            };
        }
        const patch = {};
        if (action.op === 'update_task') {
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
        }
        if (Object.keys(patch).length) {
          task = (await api.updateTask(current.id, patch)) || { ...task, ...patch };
        }
        ctx.tasks = ctx.tasks.map((t) => (t.id === current.id ? { ...t, ...task, id: current.id } : t));
        results.push({
          op: action.op,
          ok: true,
          task,
          label: (action.op === 'move_task' ? 'Moveu ' : 'Editou ') + (task.title || current.title),
        });
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
  const updated = results.filter((r) => r.ok && r.task && (r.op === 'update_task' || r.op === 'move_task')).map((r) => r.task);
  const failed = results.filter((r) => !r.ok);

  const extra = [];
  if (projects.length) extra.push({ id: 'act-p', type: 'projects', title: 'Projeto criado', items: projects });
  const boards = results.filter((r) => r.ok && r.board).map((r) => r.board);
  if (boards.length) {
    extra.push({
      id: 'act-b',
      type: 'table',
      title: 'Boards',
      columns: ['Nome', 'Tipo'],
      rows: boards.map((b) => [b.name, b.kind === 'dynamic' ? 'dinamico' : 'normal']),
    });
  }
  const sprints = results.filter((r) => r.ok && r.sprint).map((r) => r.sprint);
  if (sprints.length) {
    extra.push({
      id: 'act-s',
      type: 'table',
      title: 'Sprints',
      columns: ['Nome', 'Status'],
      rows: sprints.map((s) => [s.name, s.status || 'active']),
    });
  }
  if (created.length) extra.push({ id: 'act-c', type: 'tasks', title: 'Tarefa criada', items: created });
  if (updated.length) extra.push({ id: 'act-u', type: 'tasks', title: 'Tarefa atualizada', items: updated });

  const okLabels = results.filter((r) => r.ok).map((r) => r.label).filter(Boolean);
  const useless = isBlankAssistantAnswer(reply.answer);
  let answer = reply.answer;
  if (failed.length) {
    const errors = failed.map((f) => f.error).join(' ');
    answer = useless || !reply.answer ? errors : reply.answer + ' ' + errors;
  } else if (useless && okLabels.length) {
    answer = okLabels.join(' · ') + '.';
  }

  return { ...reply, answer, blocks: [...extra, ...(reply.blocks || [])], applied: results };
}
