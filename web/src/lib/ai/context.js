import { MASTER_SCOPE, parseTaskLocation } from '../taskScope.js';

/**
 * Contexto do assistente unico: descreve a tela que o usuario esta olhando
 * (e a tarefa aberta, quando houver) para o modelo resolver "esta tarefa",
 * "este projeto", "aqui" sem o usuario precisar repetir nomes.
 */

export const SURFACE_LABEL = {
  board: 'Board',
  reports: 'Reports',
  team: 'Team',
  insights: 'Insights',
  projects: 'Projetos',
  settings: 'Configuracoes',
  focus: 'Foco',
  profile: 'Perfil',
  invite: 'Convite',
  app: 'Kanbot',
};

/** Deriva o contexto basico a partir da rota + projetos conhecidos. */
export function routeContext(pathname = '', { projects = [] } = {}) {
  const task = parseTaskLocation(pathname);
  if (task) {
    const isMaster = !task.scope || task.scope === MASTER_SCOPE;
    const project = isMaster ? null : projects.find((p) => p.id === task.scope);
    return {
      surface: task.tab || 'board',
      scope: isMaster ? MASTER_SCOPE : task.scope,
      isMaster,
      projectId: project?.id || null,
      projectName: project?.name || null,
      projectKey: project?.key || null,
    };
  }
  if (pathname.startsWith('/projects')) return { surface: 'projects', scope: MASTER_SCOPE, isMaster: true };
  if (pathname.startsWith('/settings')) return { surface: 'settings', scope: MASTER_SCOPE, isMaster: true };
  if (pathname.startsWith('/focus')) return { surface: 'focus', scope: MASTER_SCOPE, isMaster: true };
  if (pathname.startsWith('/me') || pathname.startsWith('/u/'))
    return { surface: 'profile', scope: MASTER_SCOPE, isMaster: true };
  if (pathname.startsWith('/invite')) return { surface: 'invite', scope: MASTER_SCOPE, isMaster: true };
  return { surface: 'app', scope: MASTER_SCOPE, isMaster: true };
}

/** Junta o contexto da rota com o que cada tela publicou (tarefa aberta, filtros, numeros). */
export function mergeContext(route, extras = {}) {
  const merged = { ...route };
  for (const value of Object.values(extras)) {
    if (!value) continue;
    const { openTask, view, ...rest } = value;
    Object.assign(merged, rest);
    if (openTask) merged.openTask = openTask;
    if (view) merged.view = { ...(merged.view || {}), ...view };
  }
  return merged;
}

/** Rotulo curto para o cabecalho do assistente. */
export function contextLabel(ctx = {}) {
  const parts = [];
  parts.push(SURFACE_LABEL[ctx.surface] || SURFACE_LABEL.app);
  if (ctx.projectKey || ctx.projectName) parts.push(ctx.projectKey || ctx.projectName);
  else if (ctx.isMaster && ctx.surface !== 'projects' && ctx.surface !== 'settings') parts.push('Master');
  if (ctx.openTask?.title) parts.push(truncate(ctx.openTask.title, 28));
  else if (ctx.openTaskDraft) parts.push('Nova tarefa');
  return parts.join(' · ');
}

/** Chips sugeridos pela tela atual, usados enquanto o modelo nao devolve outros. */
export function contextChips(ctx = {}) {
  if (ctx.openTask) {
    return [
      'Resuma esta tarefa',
      'Quebre esta tarefa em subtarefas',
      'Move esta tarefa para review',
      'Quem deveria pegar esta tarefa?',
    ];
  }
  const here = ctx.projectKey ? ' no ' + ctx.projectKey : '';
  switch (ctx.surface) {
    case 'board':
      return ['O que esta travado aqui?', 'Cria uma tarefa' + here, 'Quais vencem esta semana?', 'Alguma coluna estourando o WIP?'];
    case 'reports':
      return ['Resuma estes numeros', 'O que caiu vs a semana passada?', 'Onde estao os atrasos' + here + '?', 'Risco de prazo'];
    case 'team':
      return ['Quem esta sobrecarregado?', 'Como rebalancear a carga?', 'Quem esta livre?', 'Quem tem mais atrasos?'];
    case 'insights':
      return ['Explique estes insights', 'Qual insight aplico primeiro?', 'O que voce faria hoje' + here + '?', 'Mostrar bloqueios'];
    case 'projects':
      return ['Qual projeto esta em risco?', 'Compare o progresso dos projetos', 'Cria um projeto novo', 'Resumo geral'];
    case 'focus':
      return ['O que focar agora?', 'Monte um plano de foco', 'Minhas tarefas urgentes', 'Como foi minha semana?'];
    default:
      return ['Resumo do sprint', 'Quem esta sobrecarregado?', 'Mostrar bloqueios', 'O que vence hoje?'];
  }
}

/** Payload compacto enviado ao modelo. Nada de objeto gordo aqui. */
export function contextPayload(ctx = {}) {
  if (!ctx || !ctx.surface) return null;
  const payload = {
    screen: ctx.surface,
    screenLabel: SURFACE_LABEL[ctx.surface] || SURFACE_LABEL.app,
    scope: ctx.isMaster ? 'master' : 'project',
  };
  if (ctx.projectId) {
    payload.projectId = ctx.projectId;
    payload.projectName = ctx.projectName || null;
    payload.projectKey = ctx.projectKey || null;
  }
  if (ctx.openTask) {
    const t = ctx.openTask;
    payload.openTask = clean({
      id: t.id,
      title: t.title,
      status: t.statusKey || t.status,
      column: t.columnName || t.column,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assignee: t.assignee?.name || t.assignee,
      due: t.dueDate || t.due,
      progress: t.progress,
      hours: t.estimateHours,
      projectId: t.projectId,
      project: t.projectKey || t.projectName,
      description: truncate(t.description, 400),
      labels: t.labels?.length ? t.labels : undefined,
    });
  }
  if (ctx.openTaskDraft) {
    payload.openTaskDraft = true;
  }
  if (ctx.view) payload.view = clean(ctx.view);
  if (ctx.focus?.taskId) {
    payload.focusSession = clean({
      taskId: ctx.focus.taskId,
      title: ctx.focus.title,
      phase: ctx.focus.phase,
    });
  }
  return payload;
}

/** Bloco de texto que entra no system prompt. */
export function describeContext(context) {
  if (!context) return '';
  const lines = ['CONTEXTO ATUAL DA TELA (o usuario esta olhando isto agora):', JSON.stringify(context)];
  lines.push(
    'Use este contexto para resolver referencias como "esta tarefa", "este projeto", "essa coluna", "aqui", "isso".',
  );
  if (context.openTask?.id) {
    lines.push(
      'Ha uma tarefa aberta na tela: id ' +
        context.openTask.id +
        ' ("' +
        (context.openTask.title || '') +
        '"). "esta tarefa" = esse id em update_task.',
    );
  } else if (context.openTaskDraft) {
    lines.push('O usuario esta com o formulario de nova tarefa aberto.');
  }
  if (context.projectId) {
    lines.push(
      'Projeto em foco: ' +
        (context.projectName || context.projectKey || context.projectId) +
        ' (id ' +
        context.projectId +
        '). Use-o como projectId padrao quando o usuario nao citar outro projeto.',
    );
  } else {
    lines.push('O usuario esta na visao master (todos os projetos).');
  }
  if (context.focusSession?.taskId) {
    lines.push(
      'O usuario esta em sessao de foco na tarefa ' +
        context.focusSession.taskId +
        ' ("' +
        (context.focusSession.title || '') +
        '"). "a tarefa que estou fazendo agora" = essa.',
    );
  }
  lines.push('Priorize o que esta na tela, mas responda sobre o resto do workspace se perguntarem.');
  return lines.join('\n');
}

function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)),
  );
}

function truncate(text, max) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
