import { useEffect, useMemo, useRef, useState } from 'react';
import TaskCard from './TaskCard';
import { IconDots, IconPlus } from '../../lib/icons';
import { useFocus } from '../../context/FocusContext';

const DRAG_THRESHOLD = 6;

/**
 * Renderizador de kanban compartilhado pelos tres contextos:
 * board de um projeto (`onMove` recebe columnId), board master (recebe
 * statusKey) e a visao agrupada da pagina Tasks — que passa `dropTarget` /
 * `sameColumn` proprios porque ali "soltar" pode significar reatribuir
 * responsavel ou trocar prioridade, nao so mover de coluna.
 *
 * Arraste e pointer-based (nao HTML5): o drop nativo some com re-render
 * do React e e instavel no WebView2.
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
  const { requestFocus } = useFocus();
  const [drag, setDrag] = useState(null); // { task, x, y }
  const [target, setTarget] = useState(null); // { columnId, index }
  const [selectedIds, setSelectedIds] = useState([]);

  const columnsRef = useRef(columns);
  const targetRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const onMoveRef = useRef(onMove);
  const resolveDropRef = useRef(null);
  const isSameColumnRef = useRef(null);

  columnsRef.current = columns;
  onMoveRef.current = onMove;

  const resolveDrop =
    dropTarget ?? ((column) => (mode === 'master' ? { statusKey: column.statusKey } : { columnId: column.id }));

  const isSameColumn =
    sameColumn ??
    ((task, column) => (mode === 'master' ? task.statusKey === column.statusKey : task.columnId === column.id));

  resolveDropRef.current = resolveDrop;
  isSameColumnRef.current = isSameColumn;

  const selectedTasks = useMemo(
    () => columns.flatMap((column) => column.tasks).filter((task) => selectedIds.includes(task.id)),
    [columns, selectedIds],
  );

  const toggleSelect = (task) => {
    setSelectedIds((ids) => (ids.includes(task.id) ? ids.filter((id) => id !== task.id) : [...ids, task.id]));
  };

  const commitDrop = (task, column, index) => {
    const wasSame = isSameColumnRef.current(task, column);
    const fromIndex = column.tasks.findIndex((t) => t.id === task.id);
    let finalIndex = index;
    if (wasSame && fromIndex >= 0 && fromIndex < index) finalIndex = index - 1;
    if (wasSame && fromIndex === finalIndex) return;
    onMoveRef.current?.(task, { ...resolveDropRef.current(column), position: finalIndex });
  };

  useEffect(() => {
    const clearCursor = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const onMove = (e) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        g.dragging = true;
        suppressClickRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        setDrag({ task: g.task, x: e.clientX, y: e.clientY });
      } else {
        e.preventDefault();
        setDrag((current) => (current ? { ...current, x: e.clientX, y: e.clientY } : current));
      }

      const hit = hitFromPoint(e.clientX, e.clientY);
      const prev = targetRef.current;
      if (hit && (!prev || prev.columnId !== hit.columnId || prev.index !== hit.index)) {
        targetRef.current = hit;
        setTarget(hit);
      } else if (!hit && prev) {
        targetRef.current = null;
        setTarget(null);
      }
    };

    const onUp = (e) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const task = g.task;
      const hit = targetRef.current;
      const wasDragging = g.dragging;
      gestureRef.current = null;
      clearCursor();
      setDrag(null);
      setTarget(null);
      targetRef.current = null;
      if (!wasDragging) return;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (!hit) return;
      const column = columnsRef.current.find((c) => String(c.id) === String(hit.columnId));
      if (column) commitDrop(task, column, hit.index);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearCursor();
    };
  }, []);

  const startPointer = (task) => (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target?.closest?.('button, a, input, textarea, select')) return;
    gestureRef.current = {
      pointerId: e.pointerId,
      task,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
  };

  const openTask = (task) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onOpenTask?.(task);
  };

  return (
    <div className={'relative h-full ' + (drag ? 'cursor-grabbing' : '')}>
      <div className="scroll-slim flex h-full gap-4 overflow-x-auto pb-16">
        {columns.map((column) => {
          const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;
          const isTargetCol = target?.columnId === column.id;

          return (
            <section
              key={column.id}
              data-drop-column=""
              data-column-id={column.id}
              data-drop-length={column.tasks.length}
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
                    data-drop-card=""
                    data-column-id={column.id}
                    data-index={index}
                  >
                    {isTargetCol && target.index === index && <DropLine />}
                    <TaskCard
                      task={task}
                      showProject={showProjectBadge}
                      dragging={drag?.task.id === task.id}
                      selected={selectedIds.includes(task.id)}
                      onPointerDown={startPointer(task)}
                      onOpen={openTask}
                      onToggleSelect={toggleSelect}
                      onStartFocus={requestFocus}
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
                requestFocus(selectedTasks);
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
      {drag && (
        <div
          className="pointer-events-none fixed z-[80] w-[248px] rounded-3xl border border-amber/45 bg-[#1a1a16]/95 px-3.5 py-3 shadow-lift"
          style={{ left: drag.x + 14, top: drag.y - 18 }}
        >
          <p className="truncate text-[13px] font-medium text-chalk/90">{drag.task.title}</p>
        </div>
      )}
    </div>
  );
}

function hitFromPoint(x, y) {
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
  for (const el of stack) {
    if (!el || typeof el.closest !== 'function') continue;
    const card = el.closest('[data-drop-card]');
    if (card) {
      const box = card.getBoundingClientRect();
      const after = y > box.top + box.height / 2;
      return {
        columnId: card.getAttribute('data-column-id'),
        index: Number(card.getAttribute('data-index')) + (after ? 1 : 0),
      };
    }
    const col = el.closest('[data-drop-column]');
    if (col) {
      return {
        columnId: col.getAttribute('data-column-id'),
        index: Number(col.getAttribute('data-drop-length') || 0),
      };
    }
  }
  return null;
}

const DropLine = () => (
  <div className="my-1 h-[3px] rounded-full bg-amber/70 shadow-[0_0_12px_rgba(245,165,36,.6)]" />
);
