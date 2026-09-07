import type { AuthCtx } from './kanbot.ts';
import {
  applyInsight,
  closeSprint,
  createBoard,
  createProject,
  createSprint,
  createTask,
  deleteBoard,
  deleteTask,
  getCatalog,
  getDashboard,
  getMasterBoard,
  getProjectBoard,
  listActivity,
  listBoards,
  listInsights,
  listProjects,
  listSprints,
  listTasks,
  moveTask,
  updateBoard,
  updateProject,
  updateTask,
} from './kanbot.ts';

const str = { type: 'string' };

export const TOOLS = [
  {
    name: 'get_catalog',
    description:
      'Snapshot compacto do workspace (projetos, boards, sprints, tasks, membros, colunas). Use como primeira chamada. Rola sprints dinamicos vencidos.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_projects',
    description: 'Lista projetos do workspace com progresso.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_boards',
    description: 'Lista boards de um produto (ou de todo o workspace).',
    inputSchema: {
      type: 'object',
      properties: { projectId: { ...str, description: 'UUID, key ou nome do projeto' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_project_board',
    description:
      'Board de um produto: colunas e tasks. Sem boardId usa o default. Em board dinamico, sprintId filtra (omitido = sprint ativo).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { ...str, description: 'UUID, key ou nome do projeto' },
        boardId: { ...str, description: 'UUID ou nome do board' },
        sprintId: { ...str, description: 'UUID ou nome do sprint (historico se fechado)' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_sprints',
    description: 'Lista sprints de um board ou produto (ativos e fechados).',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { ...str, description: 'UUID ou nome do board' },
        projectId: { ...str, description: 'UUID, key ou nome' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tasks com filtros opcionais. Sem sprintId, so o sprint ativo / boards normal.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { ...str, description: 'UUID, key ou nome' },
        boardId: { ...str, description: 'UUID ou nome do board' },
        sprintId: { ...str, description: 'UUID do sprint (inclui historico fechado)' },
        assigneeId: { ...str, description: 'UUID, nome ou e-mail' },
        priority: { ...str, description: 'urgent|high|medium|low' },
        statusKey: { ...str, description: 'backlog|in_progress|review|blocked|done' },
        q: { ...str, description: 'Busca em titulo/descricao' },
        includeHistory: { type: 'boolean', description: 'Inclui sprints fechados' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_master_board',
    description: 'Board master: tasks atuais (boards normal + sprint ativo) agrupadas por status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: str,
        assigneeId: str,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_dashboard',
    description: 'Metricas, distribuicao, carga do time, insights e atividade recente.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_insights',
    description: 'Insights de IA ainda nao dispensados.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_activity',
    description: 'Feed de atividade recente do workspace.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_project',
    description: 'Cria projeto com board default Tarefas e colunas padrao.',
    inputSchema: {
      type: 'object',
      properties: {
        name: str,
        key: { ...str, description: 'Sigla de 3 letras' },
        description: str,
        color: str,
        icon: { ...str, description: 'sparkle|pulse|device|shield|layers|target' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_project',
    description: 'Atualiza um projeto existente.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID, key ou nome' },
        name: str,
        key: str,
        description: str,
        color: str,
        icon: str,
        status: { ...str, description: 'active|on_hold|archived' },
        dueDate: { ...str, description: 'YYYY-MM-DD' },
        startDate: { ...str, description: 'YYYY-MM-DD' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_board',
    description: 'Cria um board no produto. kind=normal (continuo) ou dynamic (sprints).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { ...str, description: 'UUID, key ou nome' },
        name: str,
        kind: { ...str, description: 'normal|dynamic' },
        frequencyDays: { type: 'number', description: 'Obrigatorio se dynamic. Tipico 7, 14, 30' },
        isDefault: { type: 'boolean' },
      },
      required: ['projectId', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_board',
    description: 'Atualiza nome, tipo ou frequencia de um board.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou nome do board' },
        name: str,
        kind: { ...str, description: 'normal|dynamic' },
        frequencyDays: { type: 'number' },
        isDefault: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_board',
    description: 'Remove um board. Nao apaga o ultimo board do produto.',
    inputSchema: {
      type: 'object',
      properties: { id: { ...str, description: 'UUID ou nome' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_sprint',
    description:
      'Fecha o sprint ativo do board dinamico (se houver) e abre o proximo. Se o produto so tem board normal, cria um board dinamico.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { ...str, description: 'UUID ou nome do board dinamico' },
        projectId: { ...str, description: 'UUID, key ou nome — usado se boardId omitido' },
        name: str,
        startsOn: { ...str, description: 'YYYY-MM-DD' },
        endsOn: { ...str, description: 'YYYY-MM-DD' },
        frequencyDays: { type: 'number', description: 'Ao criar board dinamico novo' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'close_sprint',
    description: 'Fecha o sprint e carrega tarefas incompletas para o proximo (mesma coluna).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou nome do sprint' },
        boardId: { ...str, description: 'Se id omitido, fecha o ativo deste board' },
        projectId: str,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_task',
    description: 'Cria task em um produto. boardId escolhe o board; sprint ativo e atribuido automaticamente em boards dinamicos.',
    inputSchema: {
      type: 'object',
      properties: {
        title: str,
        projectId: { ...str, description: 'UUID, key ou nome' },
        description: str,
        boardId: { ...str, description: 'UUID ou nome do board' },
        sprintId: { ...str, description: 'UUID ou nome do sprint' },
        columnId: str,
        statusKey: { ...str, description: 'backlog|in_progress|review|blocked|done' },
        priority: { ...str, description: 'urgent|high|medium|low' },
        assigneeId: { ...str, description: 'UUID, nome ou e-mail' },
        dueDate: { ...str, description: 'YYYY-MM-DD' },
        estimateHours: { type: 'number' },
        progress: { type: 'number' },
        labels: { description: 'Array de nomes ou string separada por virgula', anyOf: [{ type: 'string' }, { type: 'array', items: str }] },
      },
      required: ['title', 'projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_task',
    description: 'Edita uma task. id aceita UUID ou titulo. So envie campos que mudam. boardId move de board.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou titulo' },
        title: str,
        description: str,
        projectId: str,
        boardId: str,
        columnId: str,
        statusKey: str,
        priority: str,
        assigneeId: str,
        dueDate: str,
        estimateHours: { type: 'number' },
        progress: { type: 'number' },
        labels: { anyOf: [{ type: 'string' }, { type: 'array', items: str }] },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'move_task',
    description: 'Move uma task de coluna, status ou board.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou titulo' },
        boardId: { ...str, description: 'UUID ou nome do board destino' },
        columnId: str,
        statusKey: { ...str, description: 'backlog|in_progress|review|blocked|done' },
        position: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_task',
    description: 'Remove uma task.',
    inputSchema: {
      type: 'object',
      properties: { id: { ...str, description: 'UUID ou titulo' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_insight',
    description: 'Aplica o payload de um insight de IA (reatribuir, prioridade, status).',
    inputSchema: {
      type: 'object',
      properties: { id: str },
      required: ['id'],
      additionalProperties: false,
    },
  },
];

const handlers: Record<string, (ctx: AuthCtx, args: Record<string, unknown>) => Promise<unknown>> = {
  get_catalog: (ctx) => getCatalog(ctx),
  list_projects: (ctx) => listProjects(ctx),
  list_boards: (ctx, args) => listBoards(ctx, args),
  get_project_board: (ctx, args) => getProjectBoard(ctx, args),
  list_sprints: (ctx, args) => listSprints(ctx, args),
  list_tasks: (ctx, args) => listTasks(ctx, args),
  get_master_board: (ctx, args) => getMasterBoard(ctx, args),
  get_dashboard: (ctx) => getDashboard(ctx),
  list_insights: (ctx) => listInsights(ctx),
  list_activity: (ctx) => listActivity(ctx),
  create_project: (ctx, args) => createProject(ctx, args),
  update_project: (ctx, args) => updateProject(ctx, args),
  create_board: (ctx, args) => createBoard(ctx, args),
  update_board: (ctx, args) => updateBoard(ctx, args),
  delete_board: (ctx, args) => deleteBoard(ctx, args),
  create_sprint: (ctx, args) => createSprint(ctx, args),
  close_sprint: (ctx, args) => closeSprint(ctx, args),
  create_task: (ctx, args) => createTask(ctx, args),
  update_task: (ctx, args) => updateTask(ctx, args),
  move_task: (ctx, args) => moveTask(ctx, args),
  delete_task: (ctx, args) => deleteTask(ctx, args),
  apply_insight: (ctx, args) => applyInsight(ctx, args),
};

export async function callTool(ctx: AuthCtx, name: string, args: Record<string, unknown> = {}) {
  const handler = handlers[name];
  if (!handler) throw new Error('Tool desconhecida: ' + name);
  return handler(ctx, args || {});
}
