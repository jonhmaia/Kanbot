import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Avatar, Card, Dropdown, EmptyState, SegmentedControl } from '../components/ui/Primitives';
import { TaskSheet } from '../components/board/BoardSheets';
import BoardCanvas from '../components/board/BoardCanvas';
import { IconFlag, IconLayers, IconPlus } from '../lib/icons';
import { PRIORITY_META, STATUS_META, dueState, formatDate } from '../lib/format';
import { api } from '../lib/api';
import CachedGate from '../components/ui/CachedGate';
import { useCached } from '../lib/useCached';
import { draftTask, mergeTask } from '../lib/optimistic';
import useAllColumns from '../lib/useAllColumns';
import { useApp } from '../context/AppContext';

const SORTS = [
  { value: 'due', label: 'Por prazo' },
  { value: 'priority', label: 'Por prioridade' },
  { value: 'project', label: 'Por projeto' },
  { value: 'updated', label: 'Atualizadas' },
];

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

/* Na visao kanban desta pagina o agrupamento e livre: soltar um card em outra
   coluna significa mover de status, trocar de projeto, reatribuir ou repriorizar,
   conforme o eixo escolhido. */
const GROUPS = [
  { value: 'status', label: 'Agrupar por status' },
  { value: 'project', label: 'Agrupar por projeto' },
  { value: 'assignee', label: 'Agrupar por responsavel' },
  { value: 'priority', label: 'Agrupar por prioridade' },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { projects, members, statuses, notify, loadProjects } = useApp();
  const fetchTasks = useCallback(() => api.tasks(), []);
  const [tasks, setTasks, reload, error] = useCached('tasks', fetchTasks);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState('all');
  const [project, setProject] = useState('');
  const [sort, setSort] = useState('due');
  const [view, setView] = useState('board');
  const [groupBy, setGroupBy] = useState('status');
  const [taskSheet, setTaskSheet] = useState(null);
  const { columns } = useAllColumns();
  const list = tasks || [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = list
      .filter((t) => (status === 'all' ? true : status === 'open' ? t.statusKey !== 'done' : t.statusKey === status))
      .filter((t) => !project || t.projectId === project)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q));

    const sorters = {
      due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      project: (a, b) => a.projectName.localeCompare(b.projectName),
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    };
    return out.sort(sorters[sort]);
  }, [list, search, status, project, sort]);

  const groupOf = useCallback(
    (task) => {
      if (groupBy === 'status') return task.statusKey;
      if (groupBy === 'project') return task.projectId;
      if (groupBy === 'assignee') return task.assigneeId || 'none';
      return task.priority;
    },
    [groupBy],
  );

  const groups = useMemo(() => {
    let defs;
    if (groupBy === 'status') {
      defs = statuses.map((s) => ({ id: s.key, name: s.name, color: s.color, statusKey: s.key }));
    } else if (groupBy === 'project') {
      defs = projects.map((p) => ({ id: p.id, name: p.name, color: p.color }));
    } else if (groupBy === 'assignee') {
      defs = [
        ...members.map((m) => ({ id: m.id, name: m.name, color: m.color })),
        { id: 'none', name: 'Sem responsavel', color: '#6E7A85' },
      ];
    } else {
      defs = Object.entries(PRIORITY_META).map(([k, v]) => ({ id: k, name: v.label, color: v.color }));
    }
    return defs.map((d) => ({ ...d, wipLimit: null, tasks: rows.filter((t) => groupOf(t) === d.id) }));
  }, [rows, groupBy, groupOf, statuses, projects, members]);

  const move = async (task, target) => {
    const column = target.column;
    if (groupOf(task) === column.id && groupBy !== 'status') return;
    const destCol =
      groupBy === 'project'
        ? columns.find((c) => c.projectId === column.id && c.statusKey === task.statusKey) ||
          columns.find((c) => c.projectId === column.id)
        : null;
    if (groupBy === 'project' && !destCol) {
      notify('Esse projeto ainda nao tem colunas', 'warn');
      return;
    }
    const projectMeta = groupBy === 'project' ? projects.find((p) => p.id === column.id) : null;
    setTasks((rows) =>
      (rows || []).map((t) => {
        if (t.id !== task.id) return t;
        if (groupBy === 'status') return { ...t, statusKey: column.statusKey };
        if (groupBy === 'project') {
          return {
            ...t,
            projectId: column.id,
            projectName: projectMeta?.name || t.projectName,
            projectKey: projectMeta?.key || t.projectKey,
            projectColor: projectMeta?.color || t.projectColor,
            columnId: destCol.id,
            statusKey: destCol.statusKey || t.statusKey,
          };
        }
        if (groupBy === 'assignee') {
          const nextId = column.id === 'none' ? null : column.id;
          return { ...t, assigneeId: nextId, assignee: members.find((m) => m.id === nextId) || null };
        }
        return { ...t, priority: column.id };
      }),
    );
    try {
      if (groupBy === 'status') {
        await api.moveTask(task.id, { statusKey: column.statusKey, position: target.position });
      } else if (groupBy === 'project') {
        await api.moveTask(task.id, { columnId: destCol.id, position: target.position });
      } else if (groupBy === 'assignee') {
        await api.updateTask(task.id, { assigneeId: column.id === 'none' ? null : column.id });
      } else {
        await api.updateTask(task.id, { priority: column.id });
      }
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      reload();
    }
  };

  const open = (task) => setTaskSheet({ task });

  const save = async (payload) => {
    const editing = taskSheet?.task;
    setTaskSheet(null);
    if (editing) {
      const dest = columns.find((c) => c.id === payload.columnId);
      setTasks((rows) =>
        (rows || []).map((t) => (t.id === editing.id ? mergeTask(t, payload, members, dest) : t)),
      );
      notify('Tarefa salva', 'success');
      try {
        await api.updateTask(editing.id, payload);
        loadProjects();
      } catch (e) {
        notify(e.message, 'warn');
        reload();
      }
      return;
    }
    const dest = columns.find((c) => c.id === payload.columnId) || columns[0];
    const projectMeta = projects.find((p) => p.id === dest?.projectId);
    const draft = draftTask(payload, {
      projectId: dest?.projectId,
      columnId: dest?.id,
      statusKey: dest?.statusKey,
      columnName: dest?.name,
      projectName: projectMeta?.name || dest?.projectName,
      projectKey: projectMeta?.key,
      projectColor: projectMeta?.color,
      assignee: members.find((m) => m.id === payload.assigneeId) || null,
    });
    setTasks((rows) => [draft, ...(rows || [])]);
    notify('Tarefa salva', 'success');
    try {
      const created = await api.createTask(payload);
      setTasks((rows) => (rows || []).map((t) => (t.id === draft.id ? created : t)));
      loadProjects();
    } catch (e) {
      notify(e.message, 'warn');
      setTasks((rows) => (rows || []).filter((t) => t.id !== draft.id));
    }
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        eyebrow={rows.length + ' tarefas encontradas'}
        searchValue={search}
        onSearch={setSearch}
        right={
          <>
            <Dropdown
              value={project}
              options={[{ value: '', label: 'Todos os projetos' }, ...projects.map((p) => ({ value: p.id, label: p.name, dot: p.color }))]}
              onChange={setProject}
            />
            <Dropdown value={sort} options={SORTS} onChange={setSort} />
          </>
        }
        action={
          <button
            type="button"
            onClick={() => setTaskSheet({})}
            className="btn-primary"
          >
            <IconPlus size={14} /> Nova tarefa
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 sm:px-7">
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'open', label: 'Abertas' },
            { value: 'in_progress', label: 'Em progresso' },
            { value: 'review', label: 'Revisao' },
            { value: 'blocked', label: 'Bloqueadas' },
            { value: 'done', label: 'Concluidas' },
          ]}
        />

        <div className="flex items-center gap-2.5">
          {view === 'board' && (
            <Dropdown value={groupBy} options={GROUPS} onChange={setGroupBy} icon={<IconLayers size={13} />} />
          )}
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Kanban' },
              { value: 'list', label: 'Lista' },
            ]}
          />
        </div>
      </div>

      <div className="px-5 pb-10 sm:px-7">
        {tasks == null ? (
          <CachedGate error={error} onRetry={reload} flush />
        ) : rows.length === 0 ? (
          <EmptyState title="Nada por aqui" description="Ajuste os filtros ou crie uma nova tarefa." />
        ) : view === 'board' ? (
          <div className="min-h-[520px]">
            <BoardCanvas
              columns={groups}
              showProjectBadge={groupBy !== 'project'}
              dropTarget={(column) => ({ column })}
              sameColumn={(task, column) => groupOf(task) === column.id}
              onMove={move}
              onOpenTask={open}
              emptyHint="Arraste um card para ca."
            />
          </div>
        ) : (
          <Card className="grain overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-lineSoft text-[10.5px] uppercase tracking-[0.14em] text-smoke">
                    <th className="px-5 py-3.5 font-normal">Tarefa</th>
                    <th className="px-3 py-3.5 font-normal">Projeto</th>
                    <th className="px-3 py-3.5 font-normal">Status</th>
                    <th className="px-3 py-3.5 font-normal">Prioridade</th>
                    <th className="px-3 py-3.5 font-normal">Responsavel</th>
                    <th className="px-3 py-3.5 font-normal">Prazo</th>
                    <th className="px-5 py-3.5 text-right font-normal">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const due = dueState(t.dueDate);
                    const meta = PRIORITY_META[t.priority];
                    const st = STATUS_META[t.statusKey];
                    return (
                      <tr
                        key={t.id}
                        onClick={() => open(t)}
                        className="cursor-pointer border-b border-white/[0.035] transition last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="max-w-[300px] px-5 py-3.5">
                          <p className="truncate text-[13px] text-chalk/90">{t.title}</p>
                          {t.labels.length > 0 && (
                            <p className="mt-1 truncate text-[10.5px] text-smoke">{t.labels.join(' · ')}</p>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/projects/' + t.projectId);
                            }}
                            className="flex items-center gap-1.5 text-[12px] text-dust transition hover:text-chalk"
                          >
                            <i className="h-1.5 w-1.5 rounded-full" style={{ background: t.projectColor }} />
                            {t.projectName}
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px]"
                            style={{ background: st.color + '1F', color: st.color }}
                          >
                            {t.columnName}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: meta.color }}>
                            <IconFlag size={12} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          {t.assignee ? (
                            <span className="flex items-center gap-2 text-[12px] text-dust">
                              <Avatar member={t.assignee} size={22} />
                              {t.assignee.name.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-[12px] text-smoke">--</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={
                              'text-[12px] ' +
                              (due === 'late' ? 'text-rose' : due === 'today' ? 'text-amber' : 'text-smoke')
                            }
                          >
                            {formatDate(t.dueDate)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="ml-auto flex w-[110px] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: t.progress + '%', background: meta.color }}
                              />
                            </div>
                            <span className="w-8 text-right text-[11px] tabular-nums text-smoke">{t.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <TaskSheet
        open={!!taskSheet}
        task={taskSheet?.task}
        columns={columns}
        onClose={() => setTaskSheet(null)}
        onSave={save}
        onDelete={async (task) => {
          setTaskSheet(null);
          setTasks((rows) => (rows || []).filter((t) => t.id !== task.id));
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
    </>
  );
}
