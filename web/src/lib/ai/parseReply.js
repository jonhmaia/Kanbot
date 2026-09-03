import { BLOCK_TYPES } from './schema';
import { indexCatalog } from './catalog';
import { PRIORITY_META, STATUS_META } from '../format';

const CHART_TYPES = new Set(['bar', 'donut', 'line']);
const TONES = new Set(['default', 'warn', 'ok']);

function stripBom(s) {
  return String(s || '').replace(/^\uFEFF/, '');
}

function repairJson(text) {
  return stripBom(text)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
}

function extractFence(text) {
  const m = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}

function extractBalancedObject(text) {
  const src = String(text);
  const start = src.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  const text = stripBom(raw).trim();
  if (!text) return null;

  const candidates = [text, extractFence(text), extractBalancedObject(text)].filter(Boolean);
  for (const cand of candidates) {
    try {
      return JSON.parse(cand);
    } catch {
      try {
        return JSON.parse(repairJson(cand));
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

export function asString(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function normId(value) {
  return asString(value).trim();
}

export function fold(s) {
  return asString(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchByName(list, query, keys = ['name', 'title', 'key']) {
  const q = fold(query);
  if (!q) return null;
  return (
    list.find((item) => keys.some((k) => fold(item[k]) === q)) ||
    list.find((item) => keys.some((k) => fold(item[k]).includes(q))) ||
    list.find((item) => q.includes(fold(item.name || item.title || ''))) ||
    null
  );
}

function resolveIds(ids, list, byId, keys) {
  const out = [];
  const seen = new Set();
  for (const raw of asArray(ids)) {
    if (raw && typeof raw === 'object') {
      const hit = resolveEntity(raw, list, byId, keys);
      if (hit && !seen.has(hit.id)) {
        seen.add(hit.id);
        out.push(hit.id);
      }
      continue;
    }
    const id = normId(raw);
    if (!id) continue;
    if (byId[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
      continue;
    }
    const hit = matchByName(list, id, keys);
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id);
      out.push(hit.id);
    }
  }
  return out;
}

function resolveEntity(obj, list, byId, keys) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.id && byId[obj.id]) return byId[obj.id];
  return matchByName(list, obj.title || obj.name || obj.key || '', keys);
}

function normSeries(series) {
  return asArray(series)
    .map((p) => ({
      label: asString(p?.label || p?.name || p?.key),
      value: Number(p?.value ?? p?.count ?? p?.hours ?? 0) || 0,
      color: asString(p?.color) || '#F5A524',
    }))
    .filter((p) => p.label);
}

function normStats(stats) {
  return asArray(stats)
    .map((s) => ({
      label: asString(s?.label || s?.name),
      value: asString(s?.value ?? s?.count ?? ''),
      tone: TONES.has(s?.tone) ? s.tone : 'default',
    }))
    .filter((s) => s.label);
}

function normBlock(block, idx) {
  if (!block || typeof block !== 'object') return null;
  const type = asString(block.type || block.kind).toLowerCase();
  if (!BLOCK_TYPES.includes(type)) return null;
  return {
    id: 'b' + idx,
    type,
    title: asString(block.title),
    text: asString(block.text || block.detail || block.body),
    ids: asArray(block.ids || block.items || block.taskIds || block.memberIds || block.projectIds).map(normId).filter(Boolean),
    chartType: CHART_TYPES.has(block.chartType) ? block.chartType : type === 'chart' ? 'bar' : 'none',
    series: normSeries(block.series || block.data || block.points),
    stats: normStats(block.stats || block.metrics),
    columns: asArray(block.columns).map(asString).filter(Boolean),
    rows: asArray(block.rows).map((r) => asArray(r).map(asString)),
    raw: block,
  };
}

function collectLegacyBlocks(parsed) {
  const extras = [];
  if (parsed.tasks) extras.push({ type: 'tasks', ids: parsed.tasks, title: parsed.tasksTitle || '' });
  if (parsed.people || parsed.members) extras.push({ type: 'people', ids: parsed.people || parsed.members, title: '' });
  if (parsed.projects) extras.push({ type: 'projects', ids: parsed.projects, title: '' });
  if (parsed.chart) extras.push({ type: 'chart', ...parsed.chart });
  if (parsed.stats && !Array.isArray(parsed.blocks)) extras.push({ type: 'stats', stats: parsed.stats });
  return extras;
}

function inferBlocks(answer, catalog, existing) {
  const used = new Set(existing.map((b) => b.type));
  const text = fold(answer);
  if (!text || !catalog) return [];
  const extras = [];

  if (!used.has('tasks')) {
    const hits = (catalog.tasks || []).filter((t) => text.includes(fold(t.title))).slice(0, 6);
    if (hits.length) extras.push({ type: 'tasks', title: '', ids: hits.map((t) => t.id), text: '', chartType: 'none', series: [], stats: [], columns: [], rows: [] });
  }
  if (!used.has('people')) {
    const hits = (catalog.members || []).filter((m) => text.includes(fold(m.name)) || text.includes(fold(m.name.split(' ')[0]))).slice(0, 6);
    if (hits.length) extras.push({ type: 'people', title: '', ids: hits.map((m) => m.id), text: '', chartType: 'none', series: [], stats: [], columns: [], rows: [] });
  }
  if (!used.has('projects')) {
    const hits = (catalog.projects || []).filter((p) => text.includes(fold(p.name)) || text.includes(fold(p.key))).slice(0, 4);
    if (hits.length) extras.push({ type: 'projects', title: '', ids: hits.map((p) => p.id), text: '', chartType: 'none', series: [], stats: [], columns: [], rows: [] });
  }
  return extras;
}

function hydrateBlock(block, idx, live, catalog) {
  const { taskById, memberById, projectById, insightById, columnById, workloadById } = indexCatalog(catalog);
  const tasks = live.tasks || catalog.tasks || [];
  const members = live.members || catalog.members || [];
  const projects = live.projects || catalog.projects || [];
  const insights = live.insights || catalog.insights || [];

  const next = { ...block, id: block.id || 'b' + idx };

  if (next.type === 'tasks') {
    const ids = resolveIds(next.ids, catalog.tasks || [], taskById, ['title']);
    next.items = ids.map((id) => live.taskById?.[id] || taskById[id]).filter(Boolean);
    if (!next.items.length && next.raw?.items) {
      next.items = asArray(next.raw.items)
        .map((item) => {
          if (typeof item === 'string') return live.taskById?.[item] || taskById[item] || matchByName(tasks, item, ['title']);
          return resolveEntity(item, tasks, live.taskById || taskById, ['title']);
        })
        .filter(Boolean);
    }
  }

  if (next.type === 'people') {
    const ids = resolveIds(next.ids, catalog.members || [], memberById, ['name', 'email']);
    next.items = ids.map((id) => {
      const base = live.memberById?.[id] || memberById[id];
      const load = live.workloadById?.[id] || workloadById[id] || {};
      return base ? { ...base, ...load } : null;
    }).filter(Boolean);
  }

  if (next.type === 'projects') {
    const ids = resolveIds(next.ids, catalog.projects || [], projectById, ['name', 'key']);
    next.items = ids.map((id) => live.projectById?.[id] || projectById[id]).filter(Boolean);
  }

  if (next.type === 'insights') {
    const ids = resolveIds(next.ids, catalog.insights || [], insightById, ['title']);
    next.items = ids.map((id) => live.insightById?.[id] || insightById[id]).filter(Boolean);
  }

  if (next.type === 'columns') {
    const ids = resolveIds(next.ids, catalog.columns || [], columnById, ['name']);
    next.items = ids.map((id) => columnById[id]).filter(Boolean);
  }

  if (next.type === 'activity') {
    next.items = (catalog.activity || []).slice(0, 6).map((a) => ({
      ...a,
      member: memberById[a.memberId] || live.memberById?.[a.memberId] || null,
    }));
  }

  if (next.type === 'chart' && !next.series.length) {
    if (/status|distribu/i.test(next.title + next.text) && live.distribution) next.series = live.distribution;
    else if (/carga|workload|utiliza/i.test(next.title + next.text) && live.workload) {
      next.series = live.workload.map((m) => ({ label: m.name.split(' ')[0], value: m.hours, color: m.color || '#F5A524' }));
    }
  }

  void members;
  void projects;
  void insights;
  return next;
}

function liveIndex(live = {}) {
  return {
    tasks: live.tasks || [],
    members: live.members || [],
    projects: live.projects || [],
    insights: live.insights || [],
    workload: live.workload || [],
    distribution: (live.distribution || []).map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color === 'hatch' ? '#6E7A85' : d.color,
    })),
    taskById: Object.fromEntries((live.tasks || []).map((t) => [t.id, t])),
    memberById: Object.fromEntries((live.members || []).map((m) => [m.id, m])),
    projectById: Object.fromEntries((live.projects || []).map((p) => [p.id, p])),
    insightById: Object.fromEntries((live.insights || []).map((i) => [i.id, i])),
    workloadById: Object.fromEntries((live.workload || []).map((m) => [m.id, m])),
  };
}

export function parseAssistantReply(raw, { catalog, live } = {}) {
  const parsed = extractJson(raw);
  const answerFromText = typeof raw === 'string' && !parsed ? stripBom(raw).trim() : '';
  const answer = asString(parsed?.answer || parsed?.text || parsed?.message || answerFromText) || 'Nao consegui montar uma resposta estruturada.';

  const sourceBlocks = parsed
    ? [...asArray(parsed.blocks), ...collectLegacyBlocks(parsed)]
    : [];

  let blocks = sourceBlocks.map(normBlock).filter(Boolean);
  blocks = blocks.concat(inferBlocks(answer, catalog, blocks).map(normBlock).filter(Boolean));

  const idx = liveIndex(live);
  blocks = blocks
    .map((b, i) => hydrateBlock(b, i, idx, catalog || {}))
    .filter((b) => {
      if (b.type === 'text') return Boolean(b.text);
      if (b.type === 'tasks' || b.type === 'people' || b.type === 'projects' || b.type === 'insights' || b.type === 'columns') {
        return (b.items || []).length > 0;
      }
      if (b.type === 'chart') return b.series.length > 0;
      if (b.type === 'stats') return b.stats.length > 0;
      if (b.type === 'table') return b.columns.length > 0 && b.rows.length > 0;
      if (b.type === 'activity') return (b.items || []).length > 0;
      return true;
    });

  const suggestions = asArray(parsed?.suggestions || parsed?.chips)
    .map(asString)
    .filter(Boolean)
    .slice(0, 4);

  return {
    answer,
    suggestions: suggestions.length
      ? suggestions
      : ['Resumo do sprint', 'Cria uma tarefa no SFR', 'Quem esta sobrecarregado?'],
    blocks,
    actions: parseActions(parsed),
    model: parsed ? 'structured' : 'text',
  };
}

const ACTION_OPS = {
  create_project: 'create_project',
  createproject: 'create_project',
  criar_projeto: 'create_project',
  create_task: 'create_task',
  createtask: 'create_task',
  criar_tarefa: 'create_task',
  update_task: 'update_task',
  updatetask: 'update_task',
  edit_task: 'update_task',
  editar_tarefa: 'update_task',
};

export function parseActions(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  return asArray(parsed.actions || parsed.mutations)
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const op = ACTION_OPS[fold(raw.op || raw.action || raw.type).replace(/\s+/g, '_')];
      if (!op) return null;
      return {
        op,
        id: asString(raw.id || raw.taskId),
        name: asString(raw.name),
        key: asString(raw.key),
        title: asString(raw.title),
        description: asString(raw.description),
        color: asString(raw.color),
        icon: asString(raw.icon),
        projectId: asString(raw.projectId || raw.project),
        columnId: asString(raw.columnId || raw.column),
        statusKey: asString(raw.statusKey || raw.status),
        priority: asString(raw.priority),
        assigneeId: asString(raw.assigneeId || raw.assignee),
        dueDate: asString(raw.dueDate || raw.due),
        estimateHours: asString(raw.estimateHours ?? raw.hours),
        progress: asString(raw.progress),
        labels: asString(Array.isArray(raw.labels) ? raw.labels.join(', ') : raw.labels),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

export function heuristicReply(prompt, { catalog, live } = {}) {
  const q = fold(prompt);
  const tasks = live?.tasks || catalog?.tasks || [];
  const projects = live?.projects || catalog?.projects || [];
  const stats = live?.stats || catalog?.stats || {};
  const workload = live?.workload || catalog?.workload || [];
  const open = tasks.filter((t) => (t.statusKey || t.status) !== 'done');

  if (q.includes('bloque') || q.includes('risco')) {
    const blocked = tasks.filter((t) => (t.statusKey || t.status) === 'blocked');
    return parseAssistantReply(
      {
        answer:
          blocked.length === 0
            ? 'Nenhum card bloqueado agora.'
            : blocked.length + ' card(s) bloqueado(s) no workspace.',
        suggestions: ['Quem esta sobrecarregado?', 'O que vence hoje?'],
        blocks: [
          { type: 'tasks', title: 'Bloqueios', ids: blocked.map((t) => t.id), text: '', chartType: 'none', series: [], stats: [], columns: [], rows: [] },
        ],
      },
      { catalog, live },
    );
  }

  if (q.includes('vence') || q.includes('hoje') || q.includes('prazo') || q.includes('atras')) {
    const today = catalog?.today;
    const due = open.filter((t) => t.dueDate && t.dueDate <= today);
    return parseAssistantReply(
      {
        answer: due.length + ' tarefa(s) vencem ate hoje.',
        suggestions: ['Mostrar bloqueios', 'Resumo do sprint'],
        blocks: [
          { type: 'tasks', title: 'Prazos', ids: due.map((t) => t.id), text: '', chartType: 'none', series: [], stats: [], columns: [], rows: [] },
        ],
      },
      { catalog, live },
    );
  }

  if (q.includes('sobrecarr') || q.includes('carga') || q.includes('quem')) {
    const top = [...workload].sort((a, b) => (b.hours || 0) - (a.hours || 0))[0];
    return parseAssistantReply(
      {
        answer: top
          ? top.name + ' lidera a carga com ' + top.openTasks + ' tarefas abertas (' + top.hours + 'h).'
          : 'Ninguem tem carga aberta agora.',
        suggestions: ['Mostrar bloqueios', 'Resumo do sprint'],
        blocks: [
          {
            type: 'people',
            title: 'Carga do time',
            ids: workload.map((m) => m.id),
            text: '',
            chartType: 'none',
            series: [],
            stats: [],
            columns: [],
            rows: [],
          },
          {
            type: 'chart',
            title: 'Horas por pessoa',
            chartType: 'bar',
            series: workload.map((m) => ({ label: m.name.split(' ')[0], value: m.hours, color: m.color || '#F5A524' })),
            ids: [],
            text: '',
            stats: [],
            columns: [],
            rows: [],
          },
        ],
      },
      { catalog, live },
    );
  }

  const dist = (live?.distribution || []).map((d) => ({
    label: d.label,
    value: d.value,
    color: d.color === 'hatch' ? '#6E7A85' : d.color,
  }));

  return parseAssistantReply(
    {
      answer:
        'Sprint: ' +
        (stats.completed ?? 0) +
        ' concluidas, ' +
        (stats.activeTasks ?? 0) +
        ' em andamento, ' +
        (stats.overdue ?? 0) +
        ' atrasadas em ' +
        (stats.projectsActive ?? projects.length) +
        ' projetos.',
      suggestions: ['O que vence hoje?', 'Mostrar bloqueios', 'Quem esta sobrecarregado?'],
      blocks: [
        {
          type: 'stats',
          title: 'Pulso',
          stats: [
            { label: 'Ativas', value: String(stats.activeTasks ?? open.length), tone: 'default' },
            { label: 'Atrasadas', value: String(stats.overdue ?? 0), tone: 'warn' },
            { label: 'Concluidas', value: String(stats.completed ?? 0), tone: 'ok' },
          ],
          ids: [],
          text: '',
          chartType: 'none',
          series: [],
          columns: [],
          rows: [],
        },
        {
          type: 'chart',
          title: 'Distribuicao',
          chartType: 'donut',
          series: dist,
          ids: [],
          text: '',
          stats: [],
          columns: [],
          rows: [],
        },
      ],
    },
    { catalog, live },
  );
}

export function statusColor(key) {
  return STATUS_META[key]?.color || '#6E7A85';
}

export function priorityColor(key) {
  return PRIORITY_META[key]?.color || '#BFE3F2';
}
