import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useFocus } from '../../context/FocusContext';
import { dragIslandThenSnap, invokeDesktop } from '../../lib/desktop';
import { phaseMinutes } from '../../lib/focusSession';
import { IconClose, IconFlame, IconLogo, IconPause, IconPlay } from '../../lib/icons';
import { isIslandDock, isIslandSide } from '../../lib/islandPrefs';

const DRAG_PX = 8;

function phaseDurationMs(session) {
  return Math.max(1, phaseMinutes(session) || 25) * 60 * 1000;
}

function splitClock(clock) {
  const [mm = '00', ss = '00'] = String(clock || '00:00').split(':');
  return { mm, ss };
}

export default function IslandApp() {
  const { session } = useApp();
  const {
    prefs,
    setIslandPrefs,
    accent,
    session: focus,
    clock,
    remaining,
    activeTask,
    running,
    paused,
    idle,
    streak,
    requestFocus,
    pause,
    resume,
    stop,
    skipPhase,
    switchTask,
  } = useFocus();

  const [expanded, setExpanded] = useState(false);
  const drag = useRef({ live: false, x: 0, y: 0 });
  const skipClickUntil = useRef(0);
  const edgeRef = useRef(prefs.edge);
  const loggedIn = Boolean(session);
  const side = isIslandSide(prefs.edge);
  const dock = isIslandDock(prefs.edge);
  const { mm, ss } = splitClock(clock);
  const progress = idle ? 0 : Math.min(1, Math.max(0, 1 - remaining / phaseDurationMs(focus)));

  useEffect(() => {
    if (prefs.visible === false) {
      setExpanded(false);
      invokeDesktop('hide_island');
      return;
    }
    invokeDesktop('show_island');
  }, [prefs.visible]);

  useEffect(() => {
    if (edgeRef.current !== prefs.edge) {
      edgeRef.current = prefs.edge;
      setExpanded(false);
    }
  }, [prefs.edge]);

  useEffect(() => {
    if (prefs.visible === false || drag.current.live) return;
    invokeDesktop('resize_island', { expanded, edge: prefs.edge });
  }, [expanded, prefs.edge, prefs.visible]);

  const blocked = () => drag.current.live || Date.now() < skipClickUntil.current;

  const hideIsland = () => {
    setExpanded(false);
    setIslandPrefs({ visible: false });
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { live: false, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = async (e) => {
    if (drag.current.x == null || drag.current.live) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (dx * dx + dy * dy < DRAG_PX * DRAG_PX) return;
    drag.current.live = true;
    skipClickUntil.current = Date.now() + 8000;
    const edge = await dragIslandThenSnap();
    skipClickUntil.current = Date.now() + 400;
    drag.current.live = false;
    drag.current.x = null;
    setExpanded(false);
    if (typeof edge === 'string') setIslandPrefs({ edge });
  };

  const onCollapsedClick = () => {
    if (blocked()) return;
    if (!loggedIn) {
      invokeDesktop('show_main');
      return;
    }
    setExpanded(true);
  };

  const onFocusToggle = (e) => {
    e.stopPropagation();
    if (idle) {
      invokeDesktop('show_main');
      return;
    }
    if (running) pause();
    else resume();
  };

  const onTaskAction = (task, active) => {
    if (active && running) {
      pause();
      return;
    }
    switchTask(task.id);
    if (paused) resume();
    else if (idle) requestFocus([task]);
  };

  const title = idle ? (loggedIn ? 'Kanbot' : 'Entrar') : activeTask?.title || 'Foco';
  const phase = idle
    ? loggedIn
      ? 'Pronto'
      : 'Desconectado'
    : focus.phase === 'break'
      ? paused
        ? 'Pausa pronta'
        : 'Pausa'
      : paused
        ? 'Pausado'
        : 'Foco';

  const dragBind = {
    onPointerDown,
    onPointerMove,
  };

  const stopDrag = {
    onPointerDown: (e) => e.stopPropagation(),
  };

  const shell = {
    '--island-accent': accent,
    boxShadow: 'inset 0 0 0 1.5px ' + accent,
  };

  const collapsed = !expanded && (
    <button
      type="button"
      {...dragBind}
      onClick={onCollapsedClick}
      className={
        'island-shell relative overflow-hidden ' +
        (dock
          ? 'grid h-full w-full place-items-center rounded-full'
          : side
            ? 'flex h-full w-full flex-col items-center justify-center gap-2 rounded-full px-1 py-3'
            : 'flex h-full w-full items-center gap-2 rounded-full px-3')
      }
      style={shell}
      aria-label={loggedIn ? 'Abrir notch' : 'Abrir Kanbot'}
    >
      {dock ? (
        idle ? (
          <IconLogo size={28} />
        ) : (
          <span className="text-[11px] font-medium tabular-nums" style={{ color: accent }}>
            {clock}
          </span>
        )
      ) : side ? (
        <>
          <span className={'relative grid place-items-center ' + (running ? 'island-live' : '')}>
            {idle ? <IconLogo size={16} /> : <i className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
          </span>
          {!idle && (
            <span className="flex flex-col items-center font-medium leading-none tabular-nums" style={{ color: accent }}>
              <span className="text-[11px]">{mm}</span>
              <span className="py-0.5 text-[7px] text-white/35">:</span>
              <span className="text-[11px]">{ss}</span>
            </span>
          )}
        </>
      ) : (
        <>
          <span className={'relative grid place-items-center ' + (running ? 'island-live' : '')}>
            {idle ? <IconLogo size={18} /> : <i className="h-2 w-2 rounded-full" style={{ background: accent }} />}
          </span>
          {!idle && (
            <span className="text-[13px] font-medium tabular-nums tracking-tight" style={{ color: accent }}>
              {clock}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium tracking-tight">
            {title}
          </span>
        </>
      )}
      {!idle && !dock && (
        <i
          className={'pointer-events-none absolute bg-[var(--island-accent)] ' + (side ? 'bottom-3 top-3 w-0.5 rounded-full' : 'inset-x-4 bottom-1 h-0.5 rounded-full')}
          style={{
            opacity: 0.85,
            transform: side ? `scaleY(${progress})` : `scaleX(${progress})`,
            transformOrigin: side ? 'top' : 'left',
          }}
        />
      )}
    </button>
  );

  const expandedCard = expanded && loggedIn && (
    <div className="island-shell flex h-full w-full flex-col overflow-hidden rounded-[26px]" style={shell}>
      <div {...dragBind} className="flex cursor-grab flex-col items-center pt-2 active:cursor-grabbing">
        <i className="h-1 w-10 rounded-full bg-white/20" />
      </div>
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">{phase}</p>
          <p className="mt-1 font-display text-[34px] leading-none tabular-nums tracking-tight" style={{ color: idle ? undefined : accent }}>
            {idle ? '—' : clock}
          </p>
          <p className="mt-2 truncate text-[13px] text-chalk/90">{title}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...stopDrag}
            onClick={onFocusToggle}
            className="grid h-9 w-9 place-items-center rounded-full text-[#111]"
            style={{ background: running ? '#E5484D' : accent }}
            aria-label={idle ? 'Abrir Kanbot' : running ? 'Pausar' : 'Retomar'}
          >
            {running ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          <button
            type="button"
            {...stopDrag}
            onClick={() => setExpanded(false)}
            className="grid h-9 w-9 place-items-center rounded-full text-dust hover:bg-white/[0.06] hover:text-chalk"
            aria-label="Recolher"
          >
            <IconClose size={14} />
          </button>
        </div>
      </header>

      <section className="min-h-0 flex-1 space-y-1 overflow-y-auto border-t border-white/[0.06] px-2.5 py-2">
        {focus.tasks.length === 0 && (
          <button
            type="button"
            onClick={() => invokeDesktop('show_main')}
            className="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-6 text-center"
          >
            <p className="text-[12px] text-smoke">Inicie um foco no board</p>
            <p className="text-[11px]" style={{ color: accent }}>Abrir Kanbot</p>
          </button>
        )}
        {focus.tasks.map((task) => {
          const active = task.id === focus.currentTaskId;
          return (
            <div
              key={task.id}
              className={'flex items-center gap-2 rounded-2xl px-2 py-2 ' + (active ? 'bg-white/[0.06]' : '')}
            >
              <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: active ? accent : 'rgba(255,255,255,0.25)' }} />
              <p className="min-w-0 flex-1 truncate text-[12.5px] text-chalk/90">{task.title}</p>
              <button
                type="button"
                onClick={() => onTaskAction(task, active)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#111]"
                style={{ background: active && running ? '#E5484D' : accent }}
                aria-label={active && running ? 'Pausar' : 'Focar'}
              >
                {active && running ? <IconPause size={12} /> : <IconPlay size={12} />}
              </button>
            </div>
          );
        })}
      </section>

      <footer className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-smoke">
          <IconFlame size={12} style={{ color: accent }} />
          <span className="text-[11px] tabular-nums">{streak.filter((cell) => cell.count).length}d</span>
        </span>
        <div className="flex items-center gap-1">
          {!idle && (
            <button type="button" onClick={skipPhase} className="rounded-full px-2 py-1 text-[11px] text-smoke hover:text-chalk">
              Pular
            </button>
          )}
          {!idle && (
            <button type="button" onClick={stop} className="rounded-full px-2 py-1 text-[11px] text-smoke hover:text-chalk">
              Encerrar
            </button>
          )}
          <button type="button" onClick={hideIsland} className="rounded-full px-2 py-1 text-[11px] text-rose/80 hover:text-rose">
            Esconder
          </button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="island-root flex h-full w-full select-none">
      {collapsed}
      {expandedCard}
    </div>
  );
}
