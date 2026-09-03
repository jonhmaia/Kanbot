# Kanbot

Kanban multi-projeto com **board master**: cada projeto desenha o próprio fluxo
de colunas, e uma tela geral reúne as tarefas de todos eles.

Front em **React + Tailwind** ligado ao **Supabase Kanbam** (Auth + RLS).
A API Node mockada em `server/` continua no repo, mas o Vite não precisa mais dela.

---

## Rodar

```bash
npm run install:all   # raiz + server + web
cp web/.env.example web/.env.local   # URL + anon key do projeto Kanbam
npm run dev:web       # front em :5173
```

Abra <http://localhost:5173> e entre com `jason@kanbot.io` / `Kanbot!demo` depois do seed.

Scripts avulsos: `npm run dev:server`, `npm run dev:web`, `npm run build`.

Produção (Vercel + instaladores Windows/Mac + updates): veja [`DEPLOY.md`](DEPLOY.md).

---

## A ideia: colunas livres, status compartilhado

O problema de unir kanbans é que cada time nomeia as etapas do seu jeito. A
solução aqui é uma indireção: cada coluna de projeto aponta para um **status
master** do workspace.

```
master_statuses            board_columns (por projeto)
┌───────────────┐          ┌──────────────────────────────┐
│ backlog       │◄─────────│ SFR · "Ideas"                │
│ in_progress   │◄─────────│ SFR · "Designing"    (WIP 4) │
│ review        │◄─────────│ STI · "Modeling"     (WIP 3) │
│ blocked       │◄─────────│ MCA · "Building"     (WIP 5) │
│ done          │◄─────────│ CMP · "Legal Sign-off"       │
└───────────────┘          └──────────────────────────────┘
```

- **Board do projeto** (`/projects/:id`) — colunas próprias, renomeáveis,
  coloridas, com limite de WIP. Drag & drop entre colunas.
- **Board master** (`/master`) — uma coluna por status, cards de todos os
  projetos com o selo do projeto de origem. Ao arrastar um card para
  "In Progress", ele vai para a coluna equivalente **dentro do projeto dele**
  ("Designing", "Building", "Auditing"...), sem quebrar o fluxo daquele time.

- **Tasks** (`/tasks`) — as mesmas tarefas em kanban **agrupável por qualquer
  eixo**, ou em lista. O agrupamento decide o que arrastar significa: por status
  move o card, por projeto troca de projeto mantendo o estágio do fluxo, por
  responsável reatribui, por prioridade muda a prioridade.

O mapeamento completo fica visível em **Settings → Mapeamento de status**.

---

## Telas

| Rota | O que faz |
|---|---|
| `/` | Dashboard: métricas, distribuição de carga, cobertura de capacidade, previsão de entrega, timeline do dia, insights de IA e assistente. |
| `/projects` | Lista de projetos com progresso e time; criar/editar/excluir. |
| `/projects/:id` | Kanban do projeto, com CRUD de colunas e cards. |
| `/master` | Board master unificado, com filtro por projeto e responsável. |
| `/tasks` | Todas as tarefas em **Kanban ou Lista**. No kanban dá para agrupar por status, projeto, responsável ou prioridade. |
| `/team` | Carga e utilização por pessoa + feed de atividade. |
| `/insights` | Todos os insights de IA + assistente em tela cheia. |
| `/reports` | Consolidado de entrega, capacidade e progresso por projeto. |
| `/settings` | Workspace, mapeamento de status, origem dos dados. |

---

## Estrutura

```
server/
  src/data/seed.js      dados mockados (o "banco")
  src/store.js          CRUD em memória — troque por queries Supabase
  src/index.js          rotas Express
web/
  src/components/
    layout/             TopNav, PageHeader
    ui/Primitives.jsx   Card, Sheet, Dropdown, Avatar, Toast...
    dashboard/          StatCards, WorkloadSummary, CoverageChart,
                        ForecastCard, LiveTaskBoard, AiRail, AiWaves
    board/              BoardCanvas (kanban + DnD), TaskCard, BoardSheets
  src/pages/            uma por rota
  src/context/          AppContext (bootstrap, projetos, toasts)
  src/lib/              api.js, format.js, icons.jsx
supabase/
  schema.sql            tabelas, índices, triggers, RLS, views, realtime
  DATABASE_PLAN.md      decisões de modelagem e roteiro de migração
```

Os gráficos são SVG escritos à mão (sem biblioteca) e o drag & drop usa a API
nativa de HTML5 — as únicas dependências do front são `react`, `react-dom` e
`react-router-dom`.

Criar e editar tarefa, coluna e projeto acontece em **sheets laterais**
(`Sheet`, em `ui/Primitives.jsx`), não em modais: o board continua visível atrás
do painel, o que ajuda a manter o contexto enquanto se edita um card.

---

## API mockada

```
GET    /api/bootstrap                    usuário, workspaces, membros, projetos, status
GET    /api/dashboard                    métricas, séries, insights, timeline
GET    /api/projects                     lista com progresso
POST   /api/projects                     cria (aceita template de colunas)
PATCH  /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/board           colunas + cards
POST   /api/projects/:id/columns
PATCH  /api/columns/:id
DELETE /api/columns/:id                  realoca os cards para outra coluna
PUT    /api/projects/:id/columns/order
GET    /api/tasks?projectId&assigneeId&priority&q
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/move               { columnId } ou { statusKey } + position
GET    /api/master-board                 board unificado por status
POST   /api/insights/:id/apply           aplica a sugestão nos cards
POST   /api/assistant                    respostas mockadas por palavra-chave
```

O estado vive em memória: reiniciar o servidor volta ao seed original.

---

## Migrar para o Supabase

Está tudo em [`supabase/DATABASE_PLAN.md`](supabase/DATABASE_PLAN.md), incluindo
a tabela de equivalência endpoint → query. Em resumo: rode `schema.sql` como
migration, chame `seed_master_statuses(workspace_id)`, e troque os `fetch` de
`web/src/lib/api.js` pelas chamadas do `supabase-js` — o formato dos dados já é
o mesmo das views (`v_tasks_expanded`, `v_master_board`, `v_project_progress`,
`v_member_workload`).
