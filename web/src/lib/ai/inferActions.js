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
const HERE_RE =
  /\b(nele|nela|neste|nesse|nessa|nisto|nisso|aqui|este projeto|esse projeto|este produto|esse produto|neste projeto|nesse projeto)\b/;

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

function includesToken(hay, needle) {
  const n = fold(needle);
  if (!n) return false;
  if (n.length <= 3) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)').test(hay);
  }
  return hay.includes(n);
}

/** Projeto citado no texto (nome/key), sem cair na tela atual. */
export function matchProjectInText(text, catalog) {
  const projects = catalog?.projects || [];
  const q = fold(text);
  if (!q) return null;
  const hits = [];
  for (const project of projects) {
    const name = fold(project.name);
    const key = fold(project.key);
    const nameHit = name && name.length >= 4 && q.includes(name);
    const keyHit = key && includesToken(q, key);
    if (nameHit || keyHit) hits.push(project);
  }
  if (!hits.length) {
    for (const project of projects) {
      const tokens = fold(project.name)
        .split(/\s+/)
        .filter((t) => t.length >= 4);
      if (tokens.length >= 2 && tokens.every((t) => q.includes(t))) hits.push(project);
    }
  }
  hits.sort((a, b) => (b.name || '').length - (a.name || '').length || (b.key || '').length - (a.key || '').length);
  return hits[0] || null;
}

function projectFromHistory(history, catalog) {
  const msgs = [...(history || [])].reverse();
  for (const msg of msgs) {
    const applied = Array.isArray(msg.applied) ? msg.applied : [];
    const created = [...applied].reverse().find((a) => a.ok && a.project)?.project;
    if (created) {
      const hit = pickProject(catalog, created.id) || pickProject(catalog, created.name) || created;
      if (hit) return hit;
    }
    const text = asString(msg.text);
    const labeled = text.match(/projeto\s+([^.]{2,80})/i);
    if (labeled) {
      const hit = matchByName(catalog?.projects || [], stripTail(labeled[1]), ['name', 'key']);
      if (hit) return hit;
    }
  }
  return null;
}

function threadProject(catalog, context) {
  return (
    pickProject(catalog, context?.threadProjectId) ||
    pickProject(catalog, context?.threadProjectName) ||
    pickProject(catalog, context?.threadProjectKey) ||
    (context?.threadProjectId
      ? {
          id: context.threadProjectId,
          key: context.threadProjectKey,
          name: context.threadProjectName,
        }
      : null)
  );
}

function screenProject(catalog, context) {
  return pickProject(catalog, context?.projectId) || (context?.projectId
    ? { id: context.projectId, key: context.projectKey, name: context.projectName }
    : null);
}

/**
 * 1. nome/key no prompt
 * 2. "nele/nesse" → projeto da conversa, depois historico, depois tela
 * 3. tela atual, depois conversa
 */
export function resolveDestProject(prompt, catalog, context, history) {
  const named = matchProjectInText(prompt, catalog);
  if (named) return named;
  const here = HERE_RE.test(fold(prompt));
  const thread = threadProject(catalog, context);
  const fromHistory = projectFromHistory(history, catalog);
  const screen = screenProject(catalog, context);
  if (here) return thread || fromHistory || screen || null;
  return screen || thread || fromHistory || null;
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

function extractProject(prompt, catalog, context, history) {
  return resolveDestProject(prompt, catalog, context, history);
}

function cleanTaskTitle(title) {
  return asString(title)
    .replace(/^(?:nele|nela|aqui)\s+/i, '')
    .replace(/^(?:as\s+)?(?:seguintes\s+)?tarefas?\s*(?:de|:|,)?\s+/i, '')
    .replace(/^(?:a tarefa|uma tarefa|um card|a task)\s+/i, '')
    .replace(/[.?!]+$/g, '')
    .trim();
}

function peelListBody(body) {
  return asString(body)
    .trim()
    .replace(/^(?:nele|nela|aqui|neste|nesse|nessa)\s+/i, '')
    .replace(/^(?:de|:|,|\-|—)\s*/i, '')
    .replace(/^(?:no|na|em)\s+(?:projeto|produto)?\s*[\w-]{1,32}\s*(?:de|:|,)?\s*/i, '')
    .replace(/^(?:de|:|,|\-|—)\s*/i, '')
    .trim();
}

function splitTaskItems(body) {
  let text = peelListBody(body);
  if (!text) return [];
  text = text.replace(/(?:^|\s)(?:[-*•]|[\d]+[.)])\s+/g, '\n');
  const andAsComma = /\s+e\s+(?=[^,;\n]+$)/i.test(text);
  if (andAsComma) text = text.replace(/\s+e\s+(?=[^,;\n]+$)/i, ', ');
  const hasSep = /[,;\n]/.test(text);
  const parts = (hasSep ? text.split(/[,;\n]+/) : [text])
    .map((s) => cleanTaskTitle(s))
    .filter((s) => s.length >= 3 && s.length <= 160)
    .filter((s) => !/^(?:as\s+)?(?:seguintes\s+)?tarefas?$/i.test(s));
  return parts.slice(0, 20);
}

const LIST_HEAD =
  /(?:cria(?:r|e)?|adicion(?:a|e|ar)?|add|nova|novo)\b[\s\S]*?\b(?:as\s+)?(?:seguintes\s+)?(?:tarefas?|cards?|tasks?)\b/i;

/**
 * "cria as tarefas, A, B e C" / "cria as tarefas de A, B" → ["A", "B", "C"].
 * Nao corta "para ..." no titulo.
 */
export function extractTaskList(prompt) {
  const raw = asString(prompt).trim();
  if (!raw) return [];
  let body = '';
  const head = raw.match(LIST_HEAD);
  if (head) body = raw.slice(head.index + head[0].length);
  else {
    const alt = raw.match(/\b(?:tarefas?|cards?|tasks?)\s*(?:de|:|,|\-)\s+(.+)/i);
    if (alt) body = alt[1];
  }
  return splitTaskItems(body);
}

function makeCreates(titles, dest, template = {}) {
  return titles.slice(0, 20).map((title) =>
    blank({
      ...template,
      op: 'create_task',
      title,
      name: '',
      projectId: destId(dest, template.projectId),
    }),
  );
}

function emptyTitle(action) {
  const t = asString(action?.title || action?.name).trim();
  return !t || /^tarefa sem t[ií]tulo$/i.test(t) || /^untitled(\s+task)?$/i.test(t);
}

function destId(dest, fallback = '') {
  return dest?.id || dest?.key || asString(fallback);
}

/**
 * Completa create_task do modelo: titulos de lista, projeto da conversa/"nele".
 */
export function repairActions(actions, { prompt, catalog = {}, context = null, history = [] } = {}) {
  const next = (actions || []).map((a) => ({ ...a }));
  const titles = extractTaskList(prompt);
  const dest = resolveDestProject(prompt, catalog, context, history);
  const named = matchProjectInText(prompt, catalog);
  const here = HERE_RE.test(fold(prompt));
  const creates = next.filter((a) => a.op === 'create_task');

  const stampProject = (action) => {
    if ((named || here) && dest) action.projectId = destId(dest);
    else if (!asString(action.projectId).trim() && dest) action.projectId = destId(dest);
  };

  const others = next.filter((a) => a.op !== 'create_task');
  const template = creates[0] || {};
  const fatSingle =
    creates.length === 1 &&
    titles.length > 1 &&
    (emptyTitle(creates[0]) || fold(creates[0].title || creates[0].name).length > fold(titles[0]).length + 10);

  if (titles.length >= 2 && (creates.length < titles.length || fatSingle)) {
    return [...others, ...makeCreates(titles, dest, template)];
  }
  if (!creates.length && titles.length) {
    return [...others, ...makeCreates(titles, dest)];
  }

  creates.forEach((action, i) => {
    if (emptyTitle(action) && titles[i]) action.title = titles[i];
    else if (emptyTitle(action) && titles.length === 1) action.title = titles[0];
    stampProject(action);
  });

  return next.filter((a) => a.op !== 'create_task' || !emptyTitle(a));
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
export function inferActions(prompt, { catalog = {}, context = null, history = [] } = {}) {
  if (!isMutationPrompt(prompt)) return [];
  const q = fold(prompt);
  const project = extractProject(prompt, catalog, context, history);
  const statusKey = extractStatus(prompt);
  const column = extractColumn(prompt, catalog, project);
  const screenIsDest = project && asString(context?.projectId) && project.id === context.projectId;
  const boardId = screenIsDest ? asString(context?.boardId) : '';
  const sprintId = screenIsDest ? asString(context?.sprintId) : '';

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
    const titles = extractTaskList(prompt);
    const wantsList = /\btarefas\b/.test(q);
    if (wantsList && !titles.length) return [];
    const list = titles.length ? titles : [cleanTaskTitle(extractCreateTitle(prompt)) || 'Nova tarefa'];
    const projectId = destId(project, asString(context?.threadProjectId) || asString(context?.projectId));
    return list.map((title) =>
      blank({
        op: 'create_task',
        title,
        projectId,
        boardId,
        sprintId,
        columnId: screenIsDest ? column?.id || '' : '',
        statusKey,
        priority: extractPriority(prompt),
      }),
    );
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
