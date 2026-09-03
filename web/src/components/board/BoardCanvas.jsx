import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';
import { IconDots, IconPlus } from '../../lib/icons';
import { useFocus } from '../../context/FocusContext';

/**
 * Renderizador de kanban compartilhado pelos tres contextos:
 * board de um projeto (`onMove` recebe columnId), board master (recebe
 * statusKey) e a visao agrupada da pagina Tasks — que passa `dropTarget` /
 * `sameColumn` proprios porque ali "soltar" pode significar reatribuir
 * responsavel ou trocar prioridade, nao so mover de coluna.
 */
export default function BoardCanvas({
  columns = [],
  mode = 'project',
  showProjectBadge = false,
  onMove,
  onOpenTask,
  onAddTask,
  onEditColumn,
  onAddColumn,
  dropTarget,
  sameColumn,
  emptyHint = 'Nenhuma tarefa aqui.',
}) {
  const { startFocus } = useFocus();
  const [drag, setDrag] = useState(null); // { task }
  const [target, setTarget] = useState(null); // { columnId, index }
  const [selectedIds, setSelectedIds] = useState([]);

  const selectedTasks = useMemo(
    () => columns.flatMap((column) => column.tasks).filter((task) => selectedIds.includes(task.id)),
    [columns, selectedIds],
  );

  const toggleSelect = (task) => {
    setSelectedIds((ids) => (ids.includes(task.id) ? ids.filter((id) => id !== task.id) : [...ids, task.id]));
  };

  const resolveDrop =
    dropTarget ?? ((column) => (mode === 'master' ? { statusKey: column.statusKey } : { columnId: column.id }));

  const isSameColumn =
    sameColumn ??
    ((task, column) => (mode === 'master' ? task.statusKey === column.statusKey : task.columnId === column.id));

  const handleDrop = (column, index) => {
    if (!drag) return;
    setTarget(null);
    const wasSame = isSameColumn(drag.task, column);
    const finalIndex = wasSame && drag.task.position < index ? index - 1 : index;
    onMove?.(drag.task, { ...resolveDrop(column), position: finalIndex });
    setDrag(null);
  };

  return (
    <div className="relative h-full">
    <div className="scroll-slim flex h-full gap-4 overflow-x-auto pb-16">
      {columns.map((column) => {
        const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;
        const isTargetCol = target?.columnId === column.id;

        return (
          <section
            key={column.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (!target || target.columnId !== column.id) setTarget({ columnId: column.id, index: column.tasks.length });
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setTarget((t) => (t?.columnId === column.id ? null : t));
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(column, target?.columnId === column.id ? target.index : column.tasks.length);
            }}
            className={
              'flex w-[292px] shrink-0 flex-col rounded-4xl border p-3 transition-colors duration-200 ' +
              (isTargetCol ? 'border-amber/35 bg-amber/[0.05]' : 'border-lineSoft bg-white/[0.022]')
            }
          >
            <header className="flex items-center justify-between px-2 pb-3 pt-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: column.color }} />
                <h3 className="truncate text-[13px] font-medium text-chalk/90">{column.name}</h3>
                <span
                  className={
                    'rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums ' +
                    (overLimit ? 'bg-rose/15 text-rose' : 'bg-white/[0.07] text-smoke')
                  }
                  title={column.wipLimit != null ? 'Limite WIP: ' + column.wipLimit : undefined}
                >
                  {column.tasks.length}
                  {column.wipLimit != null && '/' + column.wipLimit}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {onAddTask && (
                  <button
                    type="button"
                    onClick={() => onAddTask(column)}
                    className="grid h-7 w-7 place-items-center rounded-full text-smoke transition hover:bg-white/[0.07] hover:text-chalk"
                    aria-label="Nova tarefa"
                  >
                    <IconPlus size={14} />
                  </button>
                )}
                {onEditColumn && (
                  <button
                    type="button"
                    onClick={() => onEditColumn(column)}
                    className="grid h-7 w-7 place-items-center rounded-full text-smoke transition hover:bg-white/[0.07] hover:text-chalk"
                    aria-label="Editar coluna"
                  >
                    <IconDots size={14} />
                  </button>
                )}
              </div>
            </header>

            <div className="scroll-slim flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto px-0.5 pb-1">
              {column.tasks.map((task, index) => (
                <div
                  key={task.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const box = e.currentTarget.getBoundingClientRect();
                    const after = e.clientY > box.top + box.height / 2;
                    setTarget({ columnId: column.id, index: index + (after ? 1 : 0) });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(column, target?.index ?? index);
                  }}
                >
                  {isTargetCol && target.index === index && <DropLine />}
                  <TaskCard
                    task={task}
                    showProject={showProjectBadge}
                    dragging={drag?.task.id === task.id}
                    selected={selectedIds.includes(task.id)}
                    onDragStart={(t) => setDrag({ task: t })}
                    onDragEnd={() => {
                      setDrag(null);
                      setTarget(null);
                    }}
                    onOpen={onOpenTask}
                    onToggleSelect={toggleSelect}
                    onStartFocus={startFocus}
                  />
                </div>
              ))}

              {isTargetCol && target.index >= column.tasks.length && <DropLine />}

              {column.tasks.length === 0 && !isTargetCol && (
                <p className="mt-6 px-3 text-center text-[11.5px] leading-relaxed text-smoke">{emptyHint}</p>
              )}
            </div>

            {onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask(column)}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-2.5 text-[12px] text-smoke transition hover:border-white/25 hover:text-chalk"
              >
                <IconPlus size={13} /> Adicionar tarefa
              </button>
            )}
          </section>
        );
      })}

      {onAddColumn && (
        <button
          type="button"
          onClick={onAddColumn}
          className="flex w-[212px] shrink-0 flex-col items-center justify-center gap-2 rounded-4xl border border-dashed border-line text-smoke transition hover:border-amber/40 hover:text-amber"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.04]">
            <IconPlus size={15} />
          </span>
          <span className="text-[12.5px]">Nova coluna</span>
        </button>
      )}
    </div>
      {selectedTasks.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-[#141415]/92 px-3 py-2 shadow-lift backdrop-blur-2xl">
            <span className="px-1 text-[12.5px] text-chalk/90">{selectedTasks.length} selecionadas</span>
            <button
              type="button"
              onClick={() => {
                startFocus(selectedTasks);
                setSelectedIds([]);
              }}
              className="btn-primary !px-3 !py-1.5"
            >
              Iniciar foco
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="btn-ghost !px-3 !py-1.5">
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DropLine = () => (
  <div className="my-1 h-[3px] rounded-full bg-amber/70 shadow-[0_0_12px_rgba(245,165,36,.6)]" />
);
