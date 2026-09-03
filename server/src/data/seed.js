/**
 * Dados mockados do Kanbot.
 * Nenhum banco real: tudo vive em memoria e reinicia junto com o servidor.
 * O formato espelha 1:1 o schema Supabase descrito em /supabase/schema.sql,
 * entao trocar este seed por queries reais depois e so plugar.
 */

/* Status "master": vocabulario unico que une os boards de todos os projetos.
   Cada coluna customizada de um projeto aponta para um destes. */
export const MASTER_STATUSES = [
  { key: 'backlog', name: 'Backlog', color: '#6E7A85', position: 0 },
  { key: 'in_progress', name: 'In Progress', color: '#F5A524', position: 1 },
  { key: 'review', name: 'In Review', color: '#BFE3F2', position: 2 },
  { key: 'blocked', name: 'Blocked', color: '#E5484D', position: 3 },
  { key: 'done', name: 'Done', color: '#8FE3B0', position: 4 },
];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const members = [
  { id: 'u1', name: 'Jason Reed', role: 'Head of Product', initials: 'JR', color: '#F5A524', email: 'jason@kanbot.io' },
  { id: 'u2', name: 'Sarah Lin', role: 'Product Designer', initials: 'SL', color: '#BFE3F2', email: 'sarah@kanbot.io' },
  { id: 'u3', name: 'Alex Moreau', role: 'Frontend Engineer', initials: 'AM', color: '#8FE3B0', email: 'alex@kanbot.io' },
  { id: 'u4', name: 'Priya Nair', role: 'Backend Engineer', initials: 'PN', color: '#C4B5FD', email: 'priya@kanbot.io' },
  { id: 'u5', name: 'Diego Souza', role: 'QA Analyst', initials: 'DS', color: '#FDA4AF', email: 'diego@kanbot.io' },
  { id: 'u6', name: 'Mei Tanaka', role: 'Data Analyst', initials: 'MT', color: '#7DD3FC', email: 'mei@kanbot.io' },
];

export const workspaces = [
  { id: 'w1', name: 'Downtown Store #21', plan: 'Business' },
  { id: 'w2', name: 'Riverside Store #08', plan: 'Business' },
  { id: 'w3', name: 'HQ Operations', plan: 'Enterprise' },
];

export const projects = [
  {
    id: 'p1',
    workspaceId: 'w1',
    name: 'Storefront Redesign',
    key: 'SFR',
    description: 'Nova vitrine digital e checkout unificado da loja.',
    color: '#F5A524',
    icon: 'sparkle',
    status: 'active',
    ownerId: 'u1',
    startDate: '2026-07-14',
    dueDate: '2026-09-30',
    createdAt: '2026-07-14T09:00:00.000Z',
  },
  {
    id: 'p2',
    workspaceId: 'w1',
    name: 'Staffing Intelligence',
    key: 'STI',
    description: 'Previsao de footfall e alocacao automatica de turnos.',
    color: '#BFE3F2',
    icon: 'pulse',
    status: 'active',
    ownerId: 'u6',
    startDate: '2026-06-02',
    dueDate: '2026-10-15',
    createdAt: '2026-06-02T09:00:00.000Z',
  },
  {
    id: 'p3',
    workspaceId: 'w1',
    name: 'Mobile Companion App',
    key: 'MCA',
    description: 'App de bolso para gerentes acompanharem a operacao.',
    color: '#8FE3B0',
    icon: 'device',
    status: 'active',
    ownerId: 'u3',
    startDate: '2026-08-01',
    dueDate: '2026-11-20',
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'p4',
    workspaceId: 'w1',
    name: 'Compliance 2026',
    key: 'CMP',
    description: 'Auditoria de jornada, pausas e documentacao legal.',
    color: '#C4B5FD',
    icon: 'shield',
    status: 'on_hold',
    ownerId: 'u4',
    startDate: '2026-05-10',
    dueDate: '2026-12-01',
    createdAt: '2026-05-10T09:00:00.000Z',
  },
];

/* Colunas: cada projeto tem o proprio fluxo, com nomes e cores proprios,
   mas todas ancoradas em um statusKey do vocabulario master. */
export const columns = [
  { id: 'c1', projectId: 'p1', name: 'Ideas', statusKey: 'backlog', color: '#6E7A85', wipLimit: null, position: 0 },
  { id: 'c2', projectId: 'p1', name: 'Designing', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4, position: 1 },
  { id: 'c3', projectId: 'p1', name: 'Client Review', statusKey: 'review', color: '#BFE3F2', wipLimit: 3, position: 2 },
  { id: 'c4', projectId: 'p1', name: 'Shipped', statusKey: 'done', color: '#8FE3B0', wipLimit: null, position: 3 },

  { id: 'c5', projectId: 'p2', name: 'Discovery', statusKey: 'backlog', color: '#6E7A85', wipLimit: null, position: 0 },
  { id: 'c6', projectId: 'p2', name: 'Modeling', statusKey: 'in_progress', color: '#F5A524', wipLimit: 3, position: 1 },
  { id: 'c7', projectId: 'p2', name: 'Validation', statusKey: 'review', color: '#BFE3F2', wipLimit: 2, position: 2 },
  { id: 'c8', projectId: 'p2', name: 'Blocked', statusKey: 'blocked', color: '#E5484D', wipLimit: null, position: 3 },
  { id: 'c9', projectId: 'p2', name: 'Live', statusKey: 'done', color: '#8FE3B0', wipLimit: null, position: 4 },

  { id: 'c10', projectId: 'p3', name: 'Backlog', statusKey: 'backlog', color: '#6E7A85', wipLimit: null, position: 0 },
  { id: 'c11', projectId: 'p3', name: 'Building', statusKey: 'in_progress', color: '#F5A524', wipLimit: 5, position: 1 },
  { id: 'c12', projectId: 'p3', name: 'Code Review', statusKey: 'review', color: '#BFE3F2', wipLimit: 3, position: 2 },
  { id: 'c13', projectId: 'p3', name: 'Released', statusKey: 'done', color: '#8FE3B0', wipLimit: null, position: 3 },

  { id: 'c14', projectId: 'p4', name: 'Mapped', statusKey: 'backlog', color: '#6E7A85', wipLimit: null, position: 0 },
  { id: 'c15', projectId: 'p4', name: 'Auditing', statusKey: 'in_progress', color: '#F5A524', wipLimit: 2, position: 1 },
  { id: 'c16', projectId: 'p4', name: 'Legal Sign-off', statusKey: 'review', color: '#BFE3F2', wipLimit: 2, position: 2 },
  { id: 'c17', projectId: 'p4', name: 'Archived', statusKey: 'done', color: '#8FE3B0', wipLimit: null, position: 3 },
];

const t = (id, projectId, columnId, title, opts = {}) => ({
  id,
  projectId,
  columnId,
  title,
  description: opts.description ?? '',
  priority: opts.priority ?? 'medium',
  assigneeId: opts.assigneeId ?? null,
  labels: opts.labels ?? [],
  dueDate: opts.dueDate ?? null,
  estimateHours: opts.estimateHours ?? 4,
  loggedHours: opts.loggedHours ?? 0,
  progress: opts.progress ?? 0,
  checklist: opts.checklist ?? [],
  comments: opts.comments ?? 0,
  attachments: opts.attachments ?? 0,
  position: opts.position ?? 0,
  createdAt: opts.createdAt ?? '2026-08-20T10:00:00.000Z',
  updatedAt: opts.updatedAt ?? '2026-09-01T10:00:00.000Z',
});

export const tasks = [
  t('t1', 'p1', 'c1', 'Mapear jornada de checkout atual', { priority: 'medium', assigneeId: 'u2', labels: ['research'], estimateHours: 6, position: 0, dueDate: '2026-09-08' }),
  t('t2', 'p1', 'c1', 'Benchmark de 5 concorrentes diretos', { priority: 'low', assigneeId: 'u6', labels: ['research'], estimateHours: 5, position: 1, dueDate: '2026-09-12' }),
  t('t3', 'p1', 'c1', 'Definir tokens de cor da nova marca', { priority: 'medium', assigneeId: 'u2', labels: ['design-system'], estimateHours: 4, position: 2 }),
  t('t4', 'p1', 'c2', 'Hero da home com previsao de estoque', { priority: 'high', assigneeId: 'u2', labels: ['ui'], estimateHours: 10, loggedHours: 6, progress: 60, position: 0, dueDate: '2026-09-05', comments: 4, attachments: 2, checklist: [{ id: 'k1', text: 'Wireframe', done: true }, { id: 'k2', text: 'Alta fidelidade', done: true }, { id: 'k3', text: 'Handoff', done: false }] }),
  t('t5', 'p1', 'c2', 'Fluxo de pagamento em 2 passos', { priority: 'urgent', assigneeId: 'u3', labels: ['ui', 'checkout'], estimateHours: 12, loggedHours: 9, progress: 75, position: 1, dueDate: '2026-09-03', comments: 7 }),
  t('t6', 'p1', 'c2', 'Estados vazios e de erro', { priority: 'medium', assigneeId: 'u2', labels: ['ui'], estimateHours: 5, loggedHours: 1, progress: 20, position: 2 }),
  t('t7', 'p1', 'c3', 'Revisao de acessibilidade AA', { priority: 'high', assigneeId: 'u5', labels: ['a11y'], estimateHours: 6, loggedHours: 5, progress: 85, position: 0, dueDate: '2026-09-04', comments: 3 }),
  t('t8', 'p1', 'c3', 'Aprovacao visual com stakeholders', { priority: 'medium', assigneeId: 'u1', labels: ['review'], estimateHours: 3, progress: 50, position: 1 }),
  t('t9', 'p1', 'c4', 'Nova grid de categorias', { priority: 'medium', assigneeId: 'u3', labels: ['ui'], estimateHours: 8, loggedHours: 8, progress: 100, position: 0 }),
  t('t10', 'p1', 'c4', 'Migracao dos assets para CDN', { priority: 'low', assigneeId: 'u4', labels: ['infra'], estimateHours: 4, loggedHours: 4, progress: 100, position: 1 }),

  t('t11', 'p2', 'c5', 'Coletar historico de footfall 24 meses', { priority: 'medium', assigneeId: 'u6', labels: ['data'], estimateHours: 8, position: 0 }),
  t('t12', 'p2', 'c5', 'Definir metricas de cobertura', { priority: 'high', assigneeId: 'u1', labels: ['discovery'], estimateHours: 4, position: 1, dueDate: '2026-09-10' }),
  t('t13', 'p2', 'c6', 'Modelo de previsao de pico 17-19h', { priority: 'urgent', assigneeId: 'u6', labels: ['ml'], estimateHours: 16, loggedHours: 11, progress: 70, position: 0, dueDate: '2026-09-06', comments: 9, attachments: 3 }),
  t('t14', 'p2', 'c6', 'Pipeline de ingestao horaria', { priority: 'high', assigneeId: 'u4', labels: ['data', 'infra'], estimateHours: 12, loggedHours: 5, progress: 40, position: 1 }),
  t('t15', 'p2', 'c7', 'Backtest do modelo contra Q2', { priority: 'high', assigneeId: 'u6', labels: ['ml'], estimateHours: 7, loggedHours: 6, progress: 80, position: 0, dueDate: '2026-09-07' }),
  t('t16', 'p2', 'c8', 'Acesso ao ERP de turnos negado', { priority: 'urgent', assigneeId: 'u4', labels: ['blocker'], estimateHours: 2, progress: 10, position: 0, dueDate: '2026-09-02', comments: 12 }),
  t('t17', 'p2', 'c9', 'Dashboard de variancia de cobertura', { priority: 'medium', assigneeId: 'u6', labels: ['ui', 'data'], estimateHours: 9, loggedHours: 9, progress: 100, position: 0 }),
  t('t18', 'p2', 'c9', 'Alertas de overtime por e-mail', { priority: 'low', assigneeId: 'u4', labels: ['infra'], estimateHours: 5, loggedHours: 5, progress: 100, position: 1 }),

  t('t19', 'p3', 'c10', 'Especificar push de escala do dia', { priority: 'medium', assigneeId: 'u1', labels: ['spec'], estimateHours: 4, position: 0 }),
  t('t20', 'p3', 'c10', 'Escolher stack de build mobile', { priority: 'high', assigneeId: 'u3', labels: ['arch'], estimateHours: 6, position: 1, dueDate: '2026-09-09' }),
  t('t21', 'p3', 'c10', 'Design do onboarding em 3 telas', { priority: 'low', assigneeId: 'u2', labels: ['ui'], estimateHours: 7, position: 2 }),
  t('t22', 'p3', 'c11', 'Autenticacao com magic link', { priority: 'high', assigneeId: 'u4', labels: ['auth'], estimateHours: 10, loggedHours: 7, progress: 65, position: 0, dueDate: '2026-09-05', comments: 5 }),
  t('t23', 'p3', 'c11', 'Tela de tarefas ao vivo', { priority: 'urgent', assigneeId: 'u3', labels: ['ui'], estimateHours: 14, loggedHours: 4, progress: 30, position: 1, dueDate: '2026-09-11', attachments: 1 }),
  t('t24', 'p3', 'c11', 'Sincronizacao offline-first', { priority: 'high', assigneeId: 'u4', labels: ['arch'], estimateHours: 18, loggedHours: 3, progress: 15, position: 2 }),
  t('t25', 'p3', 'c12', 'PR: componente de timeline', { priority: 'medium', assigneeId: 'u5', labels: ['review'], estimateHours: 3, loggedHours: 2, progress: 70, position: 0 }),
  t('t26', 'p3', 'c13', 'Setup do CI mobile', { priority: 'medium', assigneeId: 'u4', labels: ['infra'], estimateHours: 6, loggedHours: 6, progress: 100, position: 0 }),

  t('t27', 'p4', 'c14', 'Levantar exigencias de pausa por regiao', { priority: 'medium', assigneeId: 'u5', labels: ['legal'], estimateHours: 8, position: 0 }),
  t('t28', 'p4', 'c14', 'Checklist de documentos obrigatorios', { priority: 'low', assigneeId: 'u5', labels: ['legal'], estimateHours: 4, position: 1 }),
  t('t29', 'p4', 'c15', 'Auditoria de jornada agosto', { priority: 'high', assigneeId: 'u5', labels: ['audit'], estimateHours: 12, loggedHours: 8, progress: 55, position: 0, dueDate: '2026-09-15', comments: 2 }),
  t('t30', 'p4', 'c16', 'Parecer juridico sobre banco de horas', { priority: 'urgent', assigneeId: 'u1', labels: ['legal'], estimateHours: 5, loggedHours: 3, progress: 60, position: 0, dueDate: '2026-09-04' }),
  t('t31', 'p4', 'c17', 'Politica de pausas publicada', { priority: 'medium', assigneeId: 'u1', labels: ['legal'], estimateHours: 4, loggedHours: 4, progress: 100, position: 0 }),
];

export const insights = [
  {
    id: 'i1',
    title: 'Mover 2 tarefas de Alex para Priya',
    detail: 'Building esta 140% acima do WIP limit nesta semana.',
    kind: 'balance',
    applied: false,
    payload: { taskIds: ['t24'], toMemberId: 'u4' },
  },
  {
    id: 'i2',
    title: 'Priorizar "Acesso ao ERP de turnos"',
    detail: 'Bloqueio ativo ha 6 dias travando 3 tarefas dependentes.',
    kind: 'risk',
    applied: false,
    payload: { taskIds: ['t16'], priority: 'urgent' },
  },
  {
    id: 'i3',
    title: 'Antecipar review do checkout em 1 dia',
    detail: 'Client Review fica ocioso na quinta-feira segundo o historico.',
    kind: 'schedule',
    applied: false,
    payload: { taskIds: ['t5'], toStatus: 'review' },
  },
  {
    id: 'i4',
    title: 'Arquivar 4 cards parados no Backlog',
    detail: 'Sem atualizacao ha mais de 45 dias no Compliance 2026.',
    kind: 'cleanup',
    applied: false,
    payload: { projectId: 'p4' },
  },
];

export const activity = [
  { id: 'a1', memberId: 'u2', action: 'moveu', target: 'Hero da home', projectId: 'p1', at: '2026-09-02T08:12:00.000Z' },
  { id: 'a2', memberId: 'u4', action: 'comentou em', target: 'Acesso ao ERP', projectId: 'p2', at: '2026-09-02T07:48:00.000Z' },
  { id: 'a3', memberId: 'u3', action: 'concluiu', target: 'Setup do CI mobile', projectId: 'p3', at: '2026-09-01T18:30:00.000Z' },
  { id: 'a4', memberId: 'u5', action: 'criou', target: 'Auditoria de jornada', projectId: 'p4', at: '2026-09-01T16:05:00.000Z' },
];

/* Serie do grafico de cobertura: uma barra por faixa de hora.
   scheduled = capacidade alocada, required = capacidade necessaria. */
export const coverageSeries = [
  { hour: '09:00', scheduled: 4, required: 4 },
  { hour: '10:00', scheduled: 5, required: 4 },
  { hour: '11:00', scheduled: 6, required: 5 },
  { hour: '12:00', scheduled: 5, required: 7 },
  { hour: '13:00', scheduled: 7, required: 7 },
  { hour: '14:00', scheduled: 6, required: 5 },
  { hour: '15:00', scheduled: 4, required: 6 },
  { hour: '16:00', scheduled: 6, required: 5 },
  { hour: '17:00', scheduled: 8, required: 8 },
  { hour: '18:00', scheduled: 7, required: 9 },
  { hour: '19:00', scheduled: 5, required: 6 },
  { hour: '20:00', scheduled: 4, required: 4 },
];

export const forecastSeries = [
  { hour: '08:00', value: 38 },
  { hour: '09:00', value: 44 },
  { hour: '10:00', value: 41 },
  { hour: '11:00', value: 57 },
  { hour: '12:00', value: 72 },
  { hour: '13:00', value: 64 },
  { hour: '14:00', value: 69 },
  { hour: '15:00', value: 58 },
  { hour: '16:00', value: 76 },
  { hour: '17:00', value: 96 },
  { hour: '18:00', value: 84 },
  { hour: '19:00', value: 61 },
  { hour: '20:00', value: 47 },
];

/* Linha do tempo do "Live Task Board" (barras posicionadas por hora). */
export const liveTimeline = [
  { id: 'l1', memberId: 'u2', taskId: 't4', label: 'Hero da home', start: 9, end: 13, projectId: 'p1' },
  { id: 'l2', memberId: 'u3', taskId: 't23', label: 'Tela de tarefas ao vivo', start: 10, end: 13, projectId: 'p3' },
  { id: 'l3', memberId: 'u6', taskId: 't13', label: 'Modelo de previsao', start: 8, end: 12, projectId: 'p2' },
  { id: 'l4', memberId: 'u4', taskId: 't22', label: 'Magic link', start: 11, end: 14, projectId: 'p3' },
  { id: 'l5', memberId: 'u5', taskId: 't29', label: 'Auditoria de agosto', start: 9, end: 11, projectId: 'p4' },
];

export const notifications = [
  { id: 'n1', title: 'Priya te mencionou em "Acesso ao ERP"', at: '2026-09-02T07:48:00.000Z', read: false },
  { id: 'n2', title: 'WIP limit estourado em Building', at: '2026-09-02T06:10:00.000Z', read: false },
  { id: 'n3', title: '3 tarefas vencem hoje', at: '2026-09-02T05:00:00.000Z', read: true },
];

export const currentUser = members[0];
