import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import BoardCanvas from '../components/board/BoardCanvas';
import { TaskSheet } from '../components/board/BoardSheets';
import { Dropdown } from '../components/ui/Primitives';
import { IconPlus } from '../lib/icons';
import { api } from '../lib/api';
import CachedGate from '../components/ui/CachedGate';
import { useCached } from '../lib/useCached';
import {
  addTaskToBoard,
  applyTaskPatch,
  draftTask,
  moveOnBoard,
  removeTaskFromBoard,
  replaceTaskOnBoard,
} from '../lib/optimistic';
import useAllColumns from '../lib/useAllColumns';
import { useApp } from '../context/AppContext';
import { useAssistantContext } from '../context/ChatContext';

/**
 * Board master: uma unica tela com as tarefas de todos os projetos,
 * agrupadas pelo status master ao qual cada coluna customizada aponta.
 */
export default function MasterBoardPage() {
  const navigate = useNavigate();
  const { projects, members, notify, loadProjects } = useApp();
  const fetchBoard = useCallback(() => api.masterBoard(), []);
  const [board, setBoard, reload, error] = useCached('master-board', fetchBoard);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [taskSheet, setTaskSheet] = useState(null);
  const { columns: allColumns } = useAllColumns();

  const toggleProject = (id) =>
    setProjectFilter((f) => (f.includes(id) ? f.filter((p) => p !== id) : [...f, id]));

  const filtered = useMemo(() => {
    if (!board) return [];
    const q = search.trim().toLowerCase();
    return board.columns.map((c) => ({
      ...c,
      tasks: c.tasks.filter(
        (t) =>
          (!q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q)) &&
          (projectFilter.length === 0 || projectFilter.includes(t.projectId)) &&
          (!assignee || t.assigneeId === assignee),
      ),
    }));
  }, [board, search, projectFilter, assignee]);

  /* o assistente enxerga o board master e a tarefa aberta */
  useAssistantContext(
    'board',
    useMemo(() => {
      if (!board) return null;
      return {
        isMaster: true,
        view: {
          columns: board.columns.map((c) => c.name + ' (' + c.tasks.length + ')'),
          tasks: board.columns.reduce((n, c) => n + c.tasks.length, 0),
          search: search || undefined,
          projectFilter: projects.filter((p) => projectFilter.includes(p.id)).map((p) => p.key),
          assigneeFilter: members.find((m) => m.id === assignee)?.name,
        },
        openTask: taskSheet?.task || null,
        openTaskDraft: Boolean(taskSheet && !taskSheet.task),
      };
    }, [board, projects, members, search, projectFilter, assignee, taskSheet]),
  );

  const move = async (task, target) => {
    setBoard((b) => moveOnBoard(b, task, target));
    try {
      await api.moveTask(task.id, target);
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      reload();
    }
  };

  const openCreate = () => setTaskSheet({});

  const saveTask = async (payload) => {
    const editing = taskSheet?.task;
    setTaskSheet(null);
    if (!board) {
      try {
        if (editing) await api.updateTask(editing.id, payload);
        else await api.createTask(payload);
        notify(editing ? 'Tarefa atualizada' : 'Tarefa criada', 'success');
        reload();
        loadProjects();
      } catch (e) {
        notify(e.message, 'warn');
      }
      return;
    }
    if (editing) {
      const destCol = allColumns.find((c) => c.id === payload.columnId);
      setBoard((b) => {
        const patched = applyTaskPatch(b, editing, payload, members);
        if (destCol && destCol.statusKey !== editing.statusKey) {
          const current = patched.columns.flatMap((c) => c.tasks).find((t) => t.id === editing.id);
          return moveOnBoard(patched, current || editing, { statusKey: destCol.statusKey });
        }
        return patched;
      });
      notify('Tarefa atualizada', 'success');
      try {
        await api.updateTask(editing.id, payload);
        loadProjects();
      } catch (e) {
        notify(e.message, 'warn');
        reload();
      }
      return;
    }
    const col = allColumns.find((c) => c.id === payload.columnId) || allColumns[0];
    const project = projects.find((p) => p.id === col?.projectId);
    const draft = draftTask(payload, {
      projectId: project?.id || col?.projectId,
      columnId: col?.id,
      statusKey: col?.statusKey,
      columnName: col?.name,
      projectName: project?.name || col?.projectName,
      projectKey: project?.key,
      projectColor: project?.color,
      assignee: members.find((m) => m.id === payload.assigneeId) || null,
    });
    setBoard((b) => addTaskToBoard(b, draft, draft.statusKey));
    notify('Tarefa criada', 'success');
    try {
      const created = await api.createTask(payload);
      setBoard((b) => replaceTaskOnBoard(b, draft.id, created));
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      setBoard((b) => removeTaskFromBoard(b, draft.id));
    }
  };

  const openTask = (task) => setTaskSheet({ task });

  const total = filtered.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <>
      <PageHeader
        title="Master Board"
        eyebrow={total + ' tarefas de ' + projects.length + ' projetos em uma tela so'}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar em todos os projetos..."
        right={
          <Dropdown
            value={assignee}
            options={[{ value: '', label: 'Time todo' }, ...members.map((m) => ({ value: m.id, label: m.name, dot: m.color }))]}
            onChange={setAssignee}
          />
        }
        action={
          <button type="button" onClick={openCreate} className="btn-primary">
            <IconPlus size={14} /> Nova tarefa
          </button>
        }
      />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-5 sm:px-7">
        <button
          type="button"
          onClick={() => setProjectFilter([])}
          className={
            'chip shrink-0 ' + (projectFilter.length === 0 ? '!border-white/25 !text-chalk' : '')
          }
        >
          Todos os projetos
        </button>
        {projects.map((p) => {
          const on = projectFilter.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProject(p.id)}
              className={'chip shrink-0 ' + (on ? '!border-white/25 !text-chalk' : '')}
              style={on ? { background: p.color + '1F', borderColor: p.color + '66' } : undefined}
            >
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="min-h-[520px] px-5 pb-10 sm:px-7">
        {board ? (
          <BoardCanvas
            columns={filtered}
            mode="master"
            showProjectBadge
            onMove={move}
            onOpenTask={openTask}
            emptyHint="Nenhum card neste status."
          />
        ) : (
          <CachedGate error={error} onRetry={reload} flush />
        )}
      </div>

      <TaskSheet
        open={!!taskSheet}
        task={taskSheet?.task}
        columns={allColumns}
        onClose={() => setTaskSheet(null)}
        onSave={saveTask}
        onDelete={async (task) => {
          setTaskSheet(null);
          setBoard((b) => removeTaskFromBoard(b, task.id));
          notify('Tarefa excluida', 'warn');
          try {
            await api.deleteTask(task.id);
            loadProjects();
          } catch (e) {
            notify(e.message, 'warn');
            reload();
          }
        }}
      />

      <p className="px-5 pb-8 text-[11.5px] text-smoke sm:px-7">
        Cada coluna aqui e um status master. Ao mover um card, ele vai para a coluna equivalente dentro do
        proprio projeto —{' '}
        <button type="button" onClick={() => navigate('/settings')} className="text-dust underline underline-offset-2 hover:text-chalk">
          ver mapeamento
        </button>
        .
      </p>
    </>
  );
}
