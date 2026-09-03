# Plano de banco — Supabase

> Nada foi aplicado em nenhum projeto Supabase. Este documento + `schema.sql`
> são o plano pronto para rodar quando você quiser sair do mock.

O app hoje roda com dados **em memória** (`server/src/data/seed.js`). O formato
dos objetos do mock foi desenhado para espelhar 1:1 as tabelas abaixo, então a
migração é basicamente trocar o corpo das funções de `server/src/store.js` (ou
chamar o Supabase direto do front e aposentar o Node).

---

## 1. A ideia central: colunas livres, status compartilhado

O requisito "cada projeto tem um kanban personalizável **e** existe um kanban
master que une todos" se resolve com uma indireção:

```
master_statuses (por workspace)     board_columns (por projeto)
┌──────────────────────────┐        ┌────────────────────────────────┐
│ backlog                  │◄───────│ SFR · "Ideas"                  │
│ in_progress              │◄───────│ SFR · "Designing"   (wip 4)    │
│ review                   │◄───────│ STI · "Modeling"    (wip 3)    │
│ blocked                  │◄───────│ MCA · "Building"    (wip 5)    │
│ done                     │◄───────│ CMP · "Legal Sign-off"         │
└──────────────────────────┘        └────────────────────────────────┘
```

- **Board do projeto** → `select * from v_tasks_expanded where project_id = ?`
  agrupado por `column_id`, ordenado por `board_columns.position`.
- **Board master** → as mesmas tarefas agrupadas por `status_key`. É a view
  `v_master_board`.
- **Mover no master** → `move_task(task_id, p_master_status_key => 'review')`
  resolve a coluna equivalente *dentro do projeto do card*, sem quebrar o fluxo
  customizado daquele time.

O time pode renomear "In Progress" para "Cozinhando", pintar de roxo e colocar
WIP 2 — no master ele continua caindo em `in_progress`.

---

## 2. Tabelas

| Tabela | Papel |
|---|---|
| `workspaces` | Locatário raiz. Tudo pendura aqui. |
| `profiles` | Espelho público de `auth.users` (nome, avatar, cor). |
| `workspace_members` | Vínculo usuário↔workspace + papel (`owner`/`admin`/`member`/`viewer`). |
| `master_statuses` | Vocabulário de status do workspace. Une todos os boards. |
| `projects` | Projeto, com sigla, cor, dono e prazo. |
| `project_members` | Time por projeto (opcional; RLS usa o workspace). |
| `board_columns` | Coluna customizável → aponta para um `master_status`. |
| `tasks` | O card. `position` numérica para reordenar barato. |
| `labels` / `task_labels` | Etiquetas reaproveitáveis no workspace. |
| `checklist_items` | Subitens do card. |
| `comments` | Discussão no card. |
| `attachments` | Metadados; o arquivo vive no Storage. |
| `activity_log` | Feed "Sarah moveu X" e auditoria. |
| `ai_insights` | Sugestões + `payload` que o botão **Apply** executa. |
| `assistant_messages` | Histórico do chat do assistente. |

### Decisões que valem explicar

- **`position numeric`**, não `int`. Para inserir entre dois cards basta a média
  das posições vizinhas (`(1.0 + 2.0) / 2 = 1.5`) — nenhum `UPDATE` em massa a
  cada drag. Reindexar para inteiros vira uma rotina noturna, se um dia precisar.
- **FK composta `(column_id, project_id)`** em `tasks`. Impede no banco o estado
  impossível "card do projeto A numa coluna do projeto B".
- **`is_terminal` em `master_statuses`**, não uma coluna `done` booleana na
  task. Quem define "concluído" é o status, e o trigger `sync_task_completion`
  carimba `completed_at` sozinho.
- **Views (`v_tasks_expanded`, `v_master_board`, `v_project_progress`,
  `v_member_workload`)** existem para o front fazer uma query por tela em vez de
  N+1. São exatamente os payloads que hoje o Node monta na mão.

---

## 3. Segurança (RLS)

Toda tabela tem RLS ligado. O padrão é:

- **Leitura**: `is_workspace_member(workspace_id)`.
- **Escrita**: `can_edit_workspace(workspace_id)` — exclui `viewer`.
- **Exceções**: perfil e mensagens do assistente são do próprio usuário;
  comentário só é editável pelo autor.

As funções auxiliares são `security definer` + `search_path = public` para não
cair em recursão de policy nem em sequestro de schema.

> Antes de ir para produção rode `get_advisors` (ou o *Security Advisor* do
> painel) — ele aponta tabela sem RLS, view `security definer` esquecida e
> índice faltando em FK.

---

## 4. Realtime

`tasks`, `board_columns`, `comments` e `activity_log` entram na publicação
`supabase_realtime`. No front:

```js
supabase.channel('board:' + projectId)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: 'project_id=eq.' + projectId },
      refetchBoard)
  .subscribe();
```

Assim dois gerentes arrastando cards ao mesmo tempo veem o board convergir.

---

## 5. Storage

Bucket privado `task-attachments`, caminho
`{workspace_id}/{project_id}/{task_id}/{uuid}-{filename}`. Policy de leitura
espelhando `is_workspace_member` sobre o primeiro segmento do path; download via
URL assinada de curta duração.

---

## 6. Como migrar o app do mock para o banco

1. `supabase init` e salve `schema.sql` como
   `supabase/migrations/0001_init.sql`; rode `supabase db push`.
2. Crie o workspace e chame `select seed_master_statuses('<workspace_id>');`.
3. Traduza `server/src/data/seed.js` num script de carga (as chaves dos objetos
   já batem com as colunas).
4. Em `web/src/lib/api.js`, troque cada `fetch` pela chamada equivalente do
   `supabase-js`. O contrato de dados não muda — é o mesmo shape das views.
5. Substitua o `POST /api/assistant` mockado por uma Edge Function que consulta
   `v_tasks_expanded` e chama a Claude API. Guarde a chave em
   `supabase secrets set`, nunca no front.
6. Só então apague `server/` — ou mantenha o Node como BFF, se preferir
   concentrar as regras fora do banco.

### Equivalência endpoint → banco

| Endpoint mockado | Equivalente Supabase |
|---|---|
| `GET /api/bootstrap` | `profiles` + `workspace_members` + `v_project_progress` + `master_statuses` |
| `GET /api/projects` | `v_project_progress` |
| `GET /api/projects/:id/board` | `board_columns` + `v_tasks_expanded` filtrados por projeto |
| `GET /api/master-board` | `v_master_board` |
| `POST /api/tasks/:id/move` | `rpc('move_task', { p_task_id, p_column_id \| p_master_status_key, p_position })` |
| `GET /api/dashboard` | `v_project_progress` + `v_member_workload` + `activity_log` + `ai_insights` |
| `POST /api/insights/:id/apply` | Edge Function que aplica `payload` e carimba `applied_at` |
