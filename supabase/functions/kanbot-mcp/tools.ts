import type { AuthCtx } from './kanbot.ts';
import {
  applyInsight,
  createProject,
  createTask,
  deleteTask,
  getCatalog,
  getDashboard,
  getMasterBoard,
  getProjectBoard,
  listActivity,
  listInsights,
  listProjects,
  listTasks,
  moveTask,
  updateProject,
  updateTask,
} from './kanbot.ts';

const str = { type: 'string' };

export const TOOLS = [
  {
    name: 'get_catalog',
    description:
      'Snapshot compacto do workspace (projetos, tasks, membros, colunas, insights, carga). Use como primeira chamada.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_projects',
    description: 'Lista projetos do workspace com progresso.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_project_board',
    description: 'Board de um projeto: colunas e tasks. projectId aceita UUID, key (SFR) ou nome.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { ...str, description: 'UUID, key ou nome do projeto' } },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tasks com filtros opcionais.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { ...str, description: 'UUID, key ou nome' },
        assigneeId: { ...str, description: 'UUID, nome ou e-mail' },
        priority: { ...str, description: 'urgent|high|medium|low' },
        statusKey: { ...str, description: 'backlog|in_progress|review|blocked|done' },
        q: { ...str, description: 'Busca em titulo/descricao' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_master_board',
    description: 'Board master: tasks de todos os projetos agrupadas por status.',
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
    description: 'Cria projeto com colunas padrao (Backlog, In Progress, Review, Done).',
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
    name: 'create_task',
    description: 'Cria task em um projeto. Informe columnId ou statusKey.',
    inputSchema: {
      type: 'object',
      properties: {
        title: str,
        projectId: { ...str, description: 'UUID, key ou nome' },
        description: str,
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
    description: 'Edita uma task. id aceita UUID ou titulo. So envie campos que mudam.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou titulo' },
        title: str,
        description: str,
        projectId: str,
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
    description: 'Move uma task de coluna/status (board do projeto ou master).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { ...str, description: 'UUID ou titulo' },
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
  get_project_board: (ctx, args) => getProjectBoard(ctx, args),
  list_tasks: (ctx, args) => listTasks(ctx, args),
  get_master_board: (ctx, args) => getMasterBoard(ctx, args),
  get_dashboard: (ctx) => getDashboard(ctx),
  list_insights: (ctx) => listInsights(ctx),
  list_activity: (ctx) => listActivity(ctx),
  create_project: (ctx, args) => createProject(ctx, args),
  update_project: (ctx, args) => updateProject(ctx, args),
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
