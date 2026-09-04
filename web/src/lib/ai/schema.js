export const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const BLOCK_TYPES = [
  'text',
  'tasks',
  'people',
  'projects',
  'stats',
  'chart',
  'table',
  'insights',
  'activity',
  'columns',
];

const seriesItem = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'value', 'color'],
  properties: {
    label: { type: 'string' },
    value: { type: 'number' },
    color: { type: 'string' },
  },
};

const statItem = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'value', 'tone'],
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
    tone: { type: 'string', enum: ['default', 'warn', 'ok', ''] },
  },
};

const actionItem = {
  type: 'object',
  additionalProperties: false,
  required: [
    'op',
    'id',
    'name',
    'key',
    'title',
    'description',
    'color',
    'icon',
    'projectId',
    'columnId',
    'statusKey',
    'priority',
    'assigneeId',
    'dueDate',
    'estimateHours',
    'progress',
    'labels',
  ],
  properties: {
    op: { type: 'string', enum: ['create_project', 'create_task', 'update_task'] },
    id: { type: 'string', description: 'ID ou titulo da tarefa ao editar. Vazio em create.' },
    name: { type: 'string', description: 'Nome do projeto' },
    key: { type: 'string', description: 'Sigla do projeto, 3 letras' },
    title: { type: 'string', description: 'Titulo da tarefa' },
    description: { type: 'string' },
    color: { type: 'string' },
    icon: { type: 'string', description: 'sparkle|pulse|device|shield|layers|target' },
    projectId: { type: 'string', description: 'ID, key ou nome do projeto' },
    columnId: { type: 'string' },
    statusKey: { type: 'string', description: 'backlog|in_progress|review|blocked|done' },
    priority: { type: 'string', description: 'urgent|high|medium|low' },
    assigneeId: { type: 'string', description: 'ID ou nome da pessoa' },
    dueDate: { type: 'string', description: 'YYYY-MM-DD' },
    estimateHours: { type: 'string' },
    progress: { type: 'string' },
    labels: { type: 'string', description: 'labels separados por virgula' },
  },
};

/** Schema estrito para structured outputs do OpenRouter. Campos vazios = nao usar. */
export const REPLY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'suggestions', 'blocks', 'actions'],
  properties: {
    answer: { type: 'string', description: 'Resposta curta em portugues, 1 a 4 frases.' },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ate 4 proximos chips de pergunta.',
    },
    actions: {
      type: 'array',
      items: actionItem,
      description: 'Mutacoes reais. Vazio se for so consulta.',
    },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'title', 'text', 'ids', 'chartType', 'series', 'stats', 'columns', 'rows'],
        properties: {
          type: { type: 'string', enum: BLOCK_TYPES },
          title: { type: 'string' },
          text: { type: 'string' },
          ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs reais do catalogo (tarefas, pessoas, projetos, insights, colunas).',
          },
          chartType: { type: 'string', enum: ['bar', 'donut', 'line', 'none'] },
          series: { type: 'array', items: seriesItem },
          stats: { type: 'array', items: statItem },
          columns: { type: 'array', items: { type: 'string' } },
          rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        },
      },
    },
  },
};

export function buildSystemPrompt() {
  return [
    'Voce e o Kanbot, copiloto de um kanban multi-projeto (board master + boards por projeto).',
    'Responda SEMPRE com JSON no schema kanbot_reply. Nunca invente IDs: use so os do catalogo.',
    'Escreva em portugues, tom direto, sem markdown de codigo.',
    '',
    'Quando usar cada bloco:',
    '- tasks: listar, priorizar, atrasadas, bloqueadas, de uma pessoa ou projeto. ids = task.id',
    '- people: carga, donos, sobrecarga, time. ids = member.id',
    '- projects: saude, progresso, comparar projetos. ids = project.id',
    '- stats: metricas (atrasadas, WIP, velocity). stats[{label,value,tone}]',
    '- chart: distribuicao, carga, tendencia. chartType bar|donut|line + series[{label,value,color}]',
    '- table: comparativos tabulares. columns + rows',
    '- insights: sugerir acao ja existente. ids = insight.id',
    '- activity: movimento recente. text descreve, ids opcionais',
    '- columns: colunas/WIP. ids = column.id se houver no catalogo',
    '- text: so complemento. Evite repetir o campo answer.',
    '',
    'Regras:',
    '- Prefira 1 a 3 blocos visuais alem do answer.',
    '- Cores: urgent/blocked #E5484D, high/in_progress #F5A524, review #BFE3F2, done #8FE3B0, backlog #6E7A85.',
    '- Se nao souber, diga o que o catalogo mostra. Nao alucine cards.',
    '- suggestions: perguntas naturais que o usuario pode clicar.',
    '- Campos nao usados: string vazia, array vazio, chartType "none".',
    '',
    'MUTACOES (actions): o sistema executa de verdade. So preencha actions se o usuario pediu criar/editar.',
    '- create_project: name obrigatorio. key com 3 letras. description/color/icon opcionais.',
    '- create_task: title obrigatorio + projectId (id, key tipo SFR, ou nome). columnId ou statusKey (backlog, in_progress, review, blocked, done).',
    '- update_task: id = UUID ou titulo existente. So preencha campos que mudam.',
    '- Em um mesmo turno, crie o projeto primeiro; nas tasks seguintes projectId pode ser a key nova.',
    '- Nao invente UUID. Consultas (resumo, quem, prazos) devem ter actions: [].',
    '',
    'CONTEXTO DE TELA: quando vier um bloco CONTEXTO ATUAL DA TELA, ele manda na desambiguacao.',
    '- "esta tarefa", "essa tarefa", "isso" = openTask do contexto. Use o id dela em update_task.',
    '- "este projeto", "aqui", "nesta tela" = projectId do contexto; use-o ao criar tarefa sem projeto citado.',
    '- Comece pelo que esta na tela antes de trazer o resto do workspace.',
  ].join('\n');
}
