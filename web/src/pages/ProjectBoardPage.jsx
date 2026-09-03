import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import BoardCanvas from '../components/board/BoardCanvas';
import { ColumnSheet, TaskSheet } from '../components/board/BoardSheets';
import { AvatarStack, Dropdown, EmptyState } from '../components/ui/Primitives';
import { IconChevronRight, IconPlus, projectIcons } from '../lib/icons';
import { api } from '../lib/api';
import CachedGate from '../components/ui/CachedGate';
import { useCached } from '../lib/useCached';
import {
  addColumnToBoard,
  addTaskToBoard,
  applyTaskPatch,
  draftTask,
  moveOnBoard,
  patchColumnOnBoard,
  removeColumnFromBoard,
  removeTaskFromBoard,
  replaceTaskOnBoard,
  tempId,
} from '../lib/optimistic';
import { useApp } from '../context/AppContext';

const PRIORITY_FILTERS = [
  { value: '', label: 'Todas prioridades' },
  { value: 'urgent', label: 'Urgente', dot: '#E5484D' },
  { value: 'high', label: 'Alta', dot: '#F5A524' },
  { value: 'medium', label: 'Media', dot: '#BFE3F2' },
  { value: 'low', label: 'Baixa', dot: '#6E7A85' },
];

export default function ProjectBoardPage() {
  const { projectId } = useParams();
  const { members, notify, loadProjects } = useApp();
  const fetchBoard = useCallback(() => api.projectBoard(projectId), [projectId]);
  const [board, setBoard, reload, error] = useCached('board:' + projectId, fetchBoard);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [taskSheet, setTaskSheet] = useState(null); // { task?, columnId? }
  const [columnSheet, setColumnSheet] = useState(null); // { column? }

  const filtered = useMemo(() => {
    if (!board) return [];
    const q = search.trim().toLowerCase();
    return board.columns.map((c) => ({
      ...c,
      tasks: c.tasks.filter(
        (t) =>
          (!q || t.title.toLowerCase().includes(q) || t.labels.some((l) => l.includes(q))) &&
          (!priority || t.priority === priority) &&
          (!assignee || t.assigneeId === assignee),
      ),
    }));
  }, [board, search, priority, assignee]);

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

  const saveTask = async (payload) => {
    const editing = taskSheet?.task;
    setTaskSheet(null);
    if (editing) {
      setBoard((b) => applyTaskPatch(b, editing, payload, members));
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
    const col = board.columns.find((c) => c.id === payload.columnId) || board.columns[0];
    const draft = draftTask(payload, {
      projectId: board.project.id,
      columnId: col?.id,
      statusKey: col?.statusKey,
      columnName: col?.name,
      projectName: board.project.name,
      projectKey: board.project.key,
      projectColor: board.project.color,
      assignee: members.find((m) => m.id === payload.assigneeId) || null,
    });
    setBoard((b) => addTaskToBoard(b, draft, draft.columnId));
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

  const removeTask = async (task) => {
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
  };

  const saveColumn = async (payload) => {
    const editing = columnSheet?.column;
    setColumnSheet(null);
    if (editing) {
      setBoard((b) => patchColumnOnBoard(b, editing.id, payload));
      try {
        await api.updateColumn(editing.id, payload);
      } catch (e) {
        notify(e.message, 'warn');
        reload();
      }
      return;
    }
    const draft = {
      id: tempId(),
      projectId,
      name: payload.name?.trim() || 'Nova coluna',
      statusKey: payload.statusKey || 'backlog',
      color: payload.color || '#6E7A85',
      wipLimit: payload.wipLimit ?? null,
      position: board.columns.length,
      tasks: [],
    };
    setBoard((b) => addColumnToBoard(b, draft));
    try {
      const created = await api.createColumn(projectId, payload);
      setBoard((b) => ({
        ...b,
        columns: b.columns.map((c) => (c.id === draft.id ? { ...created, tasks: [] } : c)),
      }));
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      setBoard((b) => ({ ...b, columns: b.columns.filter((c) => c.id !== draft.id) }));
    }
  };

  const removeColumn = async (column) => {
    const fallback = board.columns.find((c) => c.id !== column.id);
    setColumnSheet(null);
    setBoard((b) => removeColumnFromBoard(b, column));
    notify('Coluna removida — cards foram realocados', 'warn');
    try {
      await api.deleteColumn(column.id, fallback?.id);
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      reload();
    }
  };

  if (!board) return <CachedGate error={error} onRetry={reload} />;

  const { project } = board;
  const Icon = projectIcons[project.icon] || projectIcons.layers;
  const team = members.filter((m) => board.columns.some((c) => c.tasks.some((t) => t.assigneeId === m.id)));
  const total = board.columns.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <>
      <PageHeader
        title={project.name}
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link to="/projects" className="transition hover:text-dust">
              Projects
            </Link>
            <IconChevronRight size={11} />
            <span className="text-dust">{project.key}</span>
          </span>
        }
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar card..."
        right={
          <>
            <Dropdown value={priority} options={PRIORITY_FILTERS} onChange={setPriority} />
            <Dropdown
              value={assignee}
              options={[{ value: '', label: 'Time todo' }, ...members.map((m) => ({ value: m.id, label: m.name, dot: m.color }))]}
              onChange={setAssignee}
            />
          </>
        }
        action={
          <button type="button" onClick={() => setTaskSheet({ columnId: board.columns[0]?.id })} className="btn-primary">
            <IconPlus size={14} /> Nova tarefa
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 px-5 sm:px-7">
        <span
          className="grid h-9 w-9 place-items-center rounded-2xl"
          style={{ background: project.color + '22', color: project.color }}
        >
          <Icon size={16} />
        </span>
        <p className="max-w-md text-[12.5px] text-smoke">{project.description}</p>
        <div className="ml-auto flex items-center gap-4">
          <AvatarStack members={team} size={26} />
          <span className="text-[12px] text-smoke">{total} cards</span>
        </div>
      </div>

      <div className="min-h-[520px] px-5 pb-10 sm:px-7">
        {board.columns.length === 0 ? (
          <EmptyState
            title="Board vazio"
            description="Crie a primeira coluna para comecar a organizar este projeto."
            action={
              <button type="button" onClick={() => setColumnSheet({})} className="btn-primary">
                <IconPlus size={14} /> Nova coluna
              </button>
            }
          />
        ) : (
          <BoardCanvas
            columns={filtered}
            mode="project"
            onMove={move}
            onOpenTask={(task) => setTaskSheet({ task })}
            onAddTask={(column) => setTaskSheet({ columnId: column.id })}
            onEditColumn={(column) => setColumnSheet({ column })}
            onAddColumn={() => setColumnSheet({})}
            emptyHint="Arraste um card para ca."
          />
        )}
      </div>

      <TaskSheet
        open={!!taskSheet}
        task={taskSheet?.task}
        defaultColumnId={taskSheet?.columnId}
        columns={board.columns}
        onClose={() => setTaskSheet(null)}
        onSave={saveTask}
        onDelete={removeTask}
      />

      <ColumnSheet
        open={!!columnSheet}
        column={columnSheet?.column}
        columns={board.columns}
        onClose={() => setColumnSheet(null)}
        onSave={saveColumn}
        onDelete={removeColumn}
      />
    </>
  );
}
