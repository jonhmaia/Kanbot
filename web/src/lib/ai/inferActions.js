import { asString, fold, matchByName } from './parseReply';

const MUTATION_RE =
  /\b(cria(?:r|e)?|adicion(?:a|e|ar)?|add|nova tarefa|novo card|edita(?:r)?|renomeia(?:r)?|atualiza(?:r)?|altera(?:r)?|muda(?:r)?|move(?:r)?|mova|passa(?:r)?|exclui(?:r)?|apaga(?:r)?|deleta(?:r)?|remove(?:r)?|create|update|edit|rename|delete)\b/;

const CREATE_RE = /\b(cria(?:r|e)?|adicion(?:a|e|ar)?|add|nova tarefa|novo card|create)\b/;
const CREATE_PROJECT_RE =
  /\b(cria(?:r|e)?|adicion(?:a|e|ar)?|novo)\s+(?:um\s+)?(?:novo\s+)?(projeto|produto|product)\b/;
const CREATE_BOARD_RE = /\b(cria(?:r|e)?|adicion(?:a|e|ar)?)\s+(?:um\s+)?(?:novo\s+)?board\b/;
const CREATE_SPRINT_RE =
  /\b(cria(?:r|e)?|adicion(?:a|e|ar)?|abre|abrir)\s+(?:um\s+)?(?:novo\s+)?sprint\b/;
const DELETE_RE = /\b(exclui(?:r)?|apaga(?:r)?|deleta(?:r)?|remove(?:r)?|delete)\b/;
const MOVE_RE = /\b(move(?:r)?|mova|passa(?:r)?|joga|manda|coloca|coloque)\b/;
const EDIT_RE = /\b(edita(?:r)?|renomeia(?:r)?|atualiza(?:r)?|altera(?:r)?|muda(?:r)?)\b/;

const STATUS = {
  backlog: 'backlog',
  ideias: 'backlog',
  ideas: 'backlog',
  'a_fazer': 'backlog',
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
  revisando: 'review',
  blocked: 'blocked',
  bloqueado: 'blocked',
  bloqueada: 'blocked',
  done: 'done',
  concluido: 'done',
  concluida: 'done',
  pronto: 'done',
  pronta: 'done',
  finalizado: 'done',
};

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

export function isMutationPrompt(prompt) {
  return MUTATION_RE.test(fold(prompt));
}

function blank(overrides = {}) {
  return {
    op: '',
    id: '',
    name: '',
    key: '',
    title: '',
    description: '',
    color: '',
    icon: '',
    projectId: '',
    boardId: '',
    sprintId: '',
    columnId: '',
    statusKey: '',
    priority: '',
    assigneeId: '',
    dueDate: '',
    estimateHours: '',
    progress: '',
    labels: '',
    kind: '',
    frequencyDays: '',
    startsOn: '',
    endsOn: '',
    ...overrides,
  };
}

function pickProject(catalog, query) {
  const list = catalog?.projects || [];
  const q = asString(query).trim();
  if (!q) return null;
  if (list.some((p) => p.id === q)) return list.find((p) => p.id === q);
  return matchByName(list, q, ['name', 'key']);
}

function extractQuoted(prompt) {
  const m = asString(prompt).match(/["“”']([^"'“”']{1,120})["“”']/);
  return m ? m[1].trim() : '';
}

function stripTail(title) {
  return asString(title)
    .replace(/^(?:no|na|em)\s+[\w-]{1,24}\s*$/i, '')
    .replace(/\s+(?:no|na|do|da|em)\s+[\w-]{1,24}\s*$/i, '')
    .replace(/\s+(?:para|pra|pro)\s+.+$/i, '')
    .replace(/\s+com prioridade\s+\w+\s*$/i, '')
    .replace(/[.?!]+$/g, '')
    .trim();
}

function extractStatus(prompt) {
  const q = fold(prompt).replace(/\s+/g, '_');
  const keys = Object.keys(STATUS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (q.includes(key)) return STATUS[key];
  }
  return '';
}

function extractPriority(prompt) {
  const q = fold(prompt);
  for (const [key, value] of Object.entries(PRIORITY)) {
    if (q.includes(key)) return value;
  }
  return '';
}

function extractProject(prompt, catalog, context) {
  const projects = catalog?.projects || [];
  const q = fold(prompt);
  let best = null;
  for (const project of projects) {
    const key = fold(project.key);
    const name = fold(project.name);
    if ((key && q.includes(key)) || (name && q.includes(name))) {
      if (!best || (project.key || '').length > (best.key || '').length) best = project;
    }
  }
  if (best) return best;
  if (context?.projectId) {
    return pickProject(catalog, context.projectId) || {
      id: context.projectId,
      key: context.projectKey,
      name: context.projectName,
    };
  }
  return null;
}

function extractColumn(prompt, catalog, project) {
  const columns = (catalog?.columns || []).filter((c) => !project || !c.projectId || c.projectId === project.id);
  const q = fold(prompt);
  let best = null;
  for (const column of columns) {
    const name = fold(column.name);
    if (name && q.includes(name) && (!best || name.length > fold(best.name).length)) best = column;
  }
  return best;
}

function resolveTask(prompt, catalog, context) {
  const tasks = catalog?.tasks || [];
  const quoted = extractQuoted(prompt);
  if (quoted) {
    const hit = matchByName(tasks, quoted, ['title']);
    if (hit) return hit;
  }
  let best = null;
  const q = fold(prompt);
  for (const task of tasks) {
    const title = fold(task.title);
    if (title.length >= 3 && q.includes(title) && (!best || task.title.length > best.title.length)) best = task;
  }
  if (best) return best;
  if (context?.openTask?.id) {
    return tasks.find((t) => t.id === context.openTask.id) || context.openTask;
  }
  return null;
}

function extractNamedAfter(prompt, kind) {
  const quoted = extractQuoted(prompt);
  if (quoted) return quoted;
  const named = asString(prompt).match(/(?:chamad[oa]|nome)\s*[:\s]+["“”']?([^"'“”'\n]{2,80})/i);
  if (named) return stripTail(named[1]);
  const m = asString(prompt).match(
    new RegExp(
      '(?:cria(?:r|e)?|adicion(?:e|a|ar)|novo)\\s+(?:um\\s+)?(?:novo\\s+)?' +
        kind +
        '(?:\\s+novo)?(?:\\s+(?:chamad[oa]|com(?: o)? nome))?(?:\\s+(?:do|da|de|para))?\\s*[:\\-]?\\s*(.+)',
      'i',
    ),
  );
  if (!m) return '';
  return stripTail(m[1]).replace(/^(?:novo|nova)\s+/i, '');
}

function extractCreateTitle(prompt) {
  const quoted = extractQuoted(prompt);
  if (quoted) return quoted;
  const named = asString(prompt).match(/(?:chamad[oa]|t[ií]tulo|nome)\s*[:\s]+["“”']?([^"'“”'\n]{2,80})/i);
  if (named) return stripTail(named[1]);
  const m = asString(prompt).match(
    /(?:cria(?:r|e)?|adicion(?:e|a|ar)|add|nova tarefa|novo card)(?:\s+uma)?(?:\s+(?:nova|novo))?(?:\s+(?:tarefa|card|task))?(?:\s+(?:chamad[oa]|com(?: o)? (?:t[ií]tulo|nome)))?\s*[:\-]?\s*(.+)/i,
  );
  if (!m) return '';
  return stripTail(m[1]);
}

function extractRename(prompt) {
  const m = asString(prompt).match(
    /(?:renome(?:ia|ar|ie)|muda(?:r)? o (?:t[ií]tulo|nome)|altera(?:r)? o (?:t[ií]tulo|nome))\s+(.+?)\s+(?:para|pra)\s+["“”']?(.+?)["“”']?\s*$/i,
  );
  if (!m) return null;
  return { from: stripTail(m[1]), to: stripTail(m[2]) };
}

/**
 * Quando o modelo devolve actions vazio mas o usuario pediu criar/editar/mover,
 * monta as mutacoes a partir do texto + catalogo + tela.
 */
export function inferActions(prompt, { catalog = {}, context = null } = {}) {
  if (!isMutationPrompt(prompt)) return [];
  const q = fold(prompt);
  const project = extractProject(prompt, catalog, context);
  const statusKey = extractStatus(prompt);
  const column = extractColumn(prompt, catalog, project);
  const boardId = asString(context?.boardId);
  const sprintId = asString(context?.sprintId);

  if (DELETE_RE.test(q) && !CREATE_PROJECT_RE.test(q)) {
    const task = resolveTask(prompt, catalog, context);
    if (!task) return [];
    return [blank({ op: 'delete_task', id: task.id, title: task.title })];
  }

  if (CREATE_PROJECT_RE.test(q)) {
    const name = extractNamedAfter(prompt, '(?:projeto|produto|product)') || 'Novo projeto';
    return [blank({ op: 'create_project', name, title: name })];
  }

  if (CREATE_BOARD_RE.test(q)) {
    const name = extractNamedAfter(prompt, 'board') || 'Novo board';
    const kind = /\bdinamico|dynamic\b/.test(q) ? 'dynamic' : 'normal';
    const frequencyDays = asString(prompt).match(/(\d+)\s*dias?/)?.[1] || '';
    return [
      blank({
        op: 'create_board',
        name,
        title: name,
        projectId: project?.id || project?.key || asString(context?.projectId),
        kind,
        frequencyDays,
      }),
    ];
  }

  if (CREATE_SPRINT_RE.test(q)) {
    const name = extractNamedAfter(prompt, 'sprint');
    return [
      blank({
        op: 'create_sprint',
        name,
        title: name,
        boardId,
        projectId: project?.id || project?.key || asString(context?.projectId),
      }),
    ];
  }

  if (CREATE_RE.test(q) && !/\b(cria(?:r|e)?|adicion(?:a|e|ar)?)\s+(?:um|uma|o|a)?\s*(projeto|produto|board|sprint|coluna)\b/.test(q)) {
    const title = extractCreateTitle(prompt) || 'Nova tarefa';
    return [
      blank({
        op: 'create_task',
        title,
        projectId: project?.id || project?.key || asString(context?.projectId),
        boardId,
        sprintId,
        columnId: column?.id || '',
        statusKey,
        priority: extractPriority(prompt),
      }),
    ];
  }

  if (MOVE_RE.test(q) || statusKey) {
    const wantsMove = MOVE_RE.test(q) || /\b(para|pra|pro)\b/.test(q);
    if (wantsMove && (statusKey || column)) {
      const task = resolveTask(prompt, catalog, context);
      if (task) {
        return [
          blank({
            op: 'move_task',
            id: task.id,
            title: task.title,
            boardId: asString(task.boardId) || boardId,
            columnId: column?.id || '',
            statusKey,
          }),
        ];
      }
    }
  }

  if (EDIT_RE.test(q)) {
    const renamed = extractRename(prompt);
    if (renamed) {
      const task =
        matchByName(catalog.tasks || [], renamed.from, ['title']) || resolveTask(renamed.from, catalog, context);
      if (task && renamed.to) {
        return [blank({ op: 'update_task', id: task.id, title: renamed.to })];
      }
    }
    const task = resolveTask(prompt, catalog, context);
    if (!task) return [];
    const patch = blank({ op: 'update_task', id: task.id, title: '' });
    const priority = extractPriority(prompt);
    if (priority) patch.priority = priority;
    const newTitle = extractQuoted(prompt);
    if (newTitle && fold(newTitle) !== fold(task.title)) patch.title = newTitle;
    if (statusKey || column) {
      return [
        blank({
          op: 'move_task',
          id: task.id,
          title: task.title,
          boardId: asString(task.boardId) || boardId,
          columnId: column?.id || '',
          statusKey,
        }),
      ];
    }
    if (patch.title || patch.priority) return [patch];
  }

  return [];
}
