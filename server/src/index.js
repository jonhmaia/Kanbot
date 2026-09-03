import express from 'express';
import cors from 'cors';
import * as store from './store.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const ok = (res, data) => res.json(data);
const notFound = (res, what = 'Recurso') => res.status(404).json({ error: what + ' nao encontrado' });

app.get('/api/health', (_req, res) => ok(res, { status: 'up', mode: 'mock-memory', at: new Date().toISOString() }));

/* bootstrap: tudo que a UI precisa no primeiro paint */
app.get('/api/bootstrap', (_req, res) =>
  ok(res, {
    currentUser: store.currentUser,
    workspaces: store.listWorkspaces(),
    members: store.listMembers(),
    projects: store.listProjects(),
    notifications: store.listNotifications(),
    statuses: store.MASTER_STATUSES,
  }),
);

app.get('/api/members', (_req, res) => ok(res, store.listMembers()));
app.get('/api/statuses', (_req, res) => ok(res, store.MASTER_STATUSES));
app.get('/api/notifications', (_req, res) => ok(res, store.listNotifications()));
app.get('/api/activity', (_req, res) => ok(res, store.listActivity()));

/* projetos */
app.get('/api/projects', (_req, res) => ok(res, store.listProjects()));
app.post('/api/projects', (req, res) => res.status(201).json(store.createProject(req.body || {})));
app.patch('/api/projects/:id', (req, res) => {
  const p = store.updateProject(req.params.id, req.body || {});
  return p ? ok(res, p) : notFound(res, 'Projeto');
});
app.delete('/api/projects/:id', (req, res) =>
  store.deleteProject(req.params.id) ? res.status(204).end() : notFound(res, 'Projeto'),
);

/* board de um projeto */
app.get('/api/projects/:id/board', (req, res) => {
  const board = store.getProjectBoard(req.params.id);
  return board ? ok(res, board) : notFound(res, 'Projeto');
});

/* colunas */
app.get('/api/projects/:id/columns', (req, res) => ok(res, store.listColumns(req.params.id)));
app.post('/api/projects/:id/columns', (req, res) => {
  const c = store.createColumn(req.params.id, req.body || {});
  return c ? res.status(201).json(c) : notFound(res, 'Projeto');
});
app.patch('/api/columns/:id', (req, res) => {
  const c = store.updateColumn(req.params.id, req.body || {});
  return c ? ok(res, c) : notFound(res, 'Coluna');
});
app.delete('/api/columns/:id', (req, res) =>
  store.deleteColumn(req.params.id, req.query.fallbackColumnId) ? res.status(204).end() : notFound(res, 'Coluna'),
);
app.put('/api/projects/:id/columns/order', (req, res) =>
  ok(res, store.reorderColumns(req.params.id, req.body?.orderedIds || [])),
);

/* tarefas */
app.get('/api/tasks', (req, res) => ok(res, store.listTasks(req.query)));
app.get('/api/tasks/:id', (req, res) => {
  const t = store.getTask(req.params.id);
  return t ? ok(res, t) : notFound(res, 'Tarefa');
});
app.post('/api/tasks', (req, res) => {
  const t = store.createTask(req.body || {});
  return t ? res.status(201).json(t) : res.status(400).json({ error: 'columnId invalido' });
});
app.patch('/api/tasks/:id', (req, res) => {
  const t = store.updateTask(req.params.id, req.body || {});
  return t ? ok(res, t) : notFound(res, 'Tarefa');
});
app.delete('/api/tasks/:id', (req, res) =>
  store.deleteTask(req.params.id) ? res.status(204).end() : notFound(res, 'Tarefa'),
);
app.post('/api/tasks/:id/move', (req, res) => {
  const t = store.moveTask(req.params.id, req.body || {});
  return t ? ok(res, t) : res.status(400).json({ error: 'Destino invalido' });
});

/* board master + dashboard */
app.get('/api/master-board', (req, res) => ok(res, store.getMasterBoard(req.query)));
app.get('/api/dashboard', (_req, res) => ok(res, store.getDashboard()));

/* IA mockada */
app.post('/api/insights/:id/apply', (req, res) => {
  const i = store.applyInsight(req.params.id);
  return i ? ok(res, i) : notFound(res, 'Insight');
});
app.delete('/api/insights/:id', (req, res) => {
  store.dismissInsight(req.params.id);
  res.status(204).end();
});
app.post('/api/assistant', (req, res) => ok(res, store.askAssistant(req.body?.prompt || '')));

app.use((_req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));

app.listen(PORT, () => {
  console.log('[kanbot] API mockada em http://localhost:' + PORT + '/api');
});
