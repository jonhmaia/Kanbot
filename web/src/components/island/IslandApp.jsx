import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import { useFocus } from '../../context/FocusContext';
import { dragIslandThenSnap, invokeDesktop } from '../../lib/desktop';
import { phaseMinutes } from '../../lib/focusSession';
import { IconClose, IconFlame, IconLogo, IconPause, IconPlay, IconSpark } from '../../lib/icons';
import { isIslandDock, isIslandSide } from '../../lib/islandPrefs';
import { useScreenWatch } from '../../lib/screenWatch';
import IslandChat from './IslandChat';

const DRAG_PX = 8;

function phaseDurationMs(session) {
  return Math.max(1, phaseMinutes(session) || 25) * 60 * 1000;
}

function splitClock(clock) {
  const [mm = '00', ss = '00'] = String(clock || '00:00').split(':');
  return { mm, ss };
}

function Ring({ progress, color, children, live }) {
  const radius = 14;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <span className={'relative grid h-11 w-11 place-items-center ' + (live ? 'island-live' : '')}>
      <svg className="absolute inset-0 h-11 w-11" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.4" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      {children}
    </span>
  );
}

function shellRadius(edge, dock) {
  if (dock) return 'rounded-full';
  if (edge === 'left') return 'rounded-l-none rounded-r-[28px]';
  if (edge === 'right') return 'rounded-r-none rounded-l-[28px]';
  return 'rounded-t-none rounded-b-[22px]';
}

export default function IslandApp() {
  const { session } = useApp();
  const { thinking } = useChat();
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

  const [panel, setPanel] = useState(null);
  const [watching, setWatching] = useState(false);
  const drag = useRef({ live: false, x: 0, y: 0 });
  const skipClickUntil = useRef(0);
  const edgeRef = useRef(prefs.edge);
  const loggedIn = Boolean(session);
  const side = isIslandSide(prefs.edge);
  const dock = isIslandDock(prefs.edge);
  const { mm, ss } = splitClock(clock);
  const progress = idle ? 0 : Math.min(1, Math.max(0, 1 - remaining / phaseDurationMs(focus)));
  const watch = useScreenWatch(watching && panel === 'chat');
  const expanded = Boolean(panel);

  useEffect(() => {
    if (watch.error) setWatching(false);
  }, [watch.error]);

  useEffect(() => {
    if (prefs.visible === false) {
      setPanel(null);
      setWatching(false);
      invokeDesktop('hide_island');
      return;
    }
    invokeDesktop('show_island');
  }, [prefs.visible]);

  useEffect(() => {
    if (edgeRef.current !== prefs.edge) {
      edgeRef.current = prefs.edge;
      setPanel(null);
    }
  }, [prefs.edge]);

  useEffect(() => {
    if (prefs.visible === false || drag.current.live) return;
    invokeDesktop('resize_island', { expanded, edge: prefs.edge });
  }, [expanded, prefs.edge, prefs.visible]);

  const blocked = () => drag.current.live || Date.now() < skipClickUntil.current;

  const openPanel = (next) => {
    if (blocked()) return;
    if (!loggedIn) {
      invokeDesktop('show_main');
      return;
    }
    setPanel(next);
  };

  const hideIsland = () => {
    setPanel(null);
    setWatching(false);
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
    setPanel(null);
    if (typeof edge === 'string') setIslandPrefs({ edge });
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
  const aiStatus = thinking ? '…' : watching ? 'vendo' : 'ok';

  const dragBind = { onPointerDown, onPointerMove };
  const stopDrag = { onPointerDown: (e) => e.stopPropagation() };
  const radius = shellRadius(prefs.edge, dock);
  const shell = {
    '--island-accent': accent,
    boxShadow: 'inset 0 0 0 1.5px ' + accent,
  };

  const focusCell = (
    <button
      type="button"
      onClick={() => openPanel('focus')}
      className={
        dock
          ? 'hidden'
          : side
            ? 'flex flex-1 flex-col items-center justify-center gap-1 px-1'
            : 'flex min-w-0 flex-1 items-center gap-2 px-2'
      }
      aria-label="Abrir foco"
    >
      {side ? (
        <>
          <Ring progress={idle ? 1 : progress} color={accent} live={running}>
            {idle ? <IconLogo size={16} /> : <i className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
          </Ring>
          <span className="text-[11px] font-medium text-chalk">Foco</span>
          <span className="text-[10px] tabular-nums text-white/45">{idle ? 'ok' : `${mm}:${ss}`}</span>
        </>
      ) : (
        <>
          <span className={'relative grid place-items-center ' + (running ? 'island-live' : '')}>
            {idle ? <IconLogo size={16} /> : <i className="h-2 w-2 rounded-full" style={{ background: accent }} />}
          </span>
          {!idle && (
            <span className="text-[13px] font-medium tabular-nums tracking-tight" style={{ color: accent }}>
              {clock}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-left text-[12px] font-medium">{title}</span>
        </>
      )}
    </button>
  );

  const aiCell = (
    <button
      type="button"
      onClick={() => openPanel('chat')}
      className={
        dock
          ? 'grid h-full w-full place-items-center'
          : side
            ? 'flex flex-1 flex-col items-center justify-center gap-1 px-1'
            : 'grid h-9 w-9 shrink-0 place-items-center'
      }
      aria-label="Abrir chat"
    >
      {dock ? (
        thinking || watching ? (
          <span className="text-[11px] font-medium" style={{ color: accent }}>
            {aiStatus}
          </span>
        ) : (
          <IconLogo size={28} />
        )
      ) : side ? (
        <>
          <Ring progress={watching || thinking ? 0.72 : 1} color={watching ? '#8FE3B0' : accent} live={thinking}>
            <IconSpark size={14} />
          </Ring>
          <span className="text-[11px] font-medium text-chalk">AI</span>
          <span className="text-[10px] text-white/45">{aiStatus}</span>
        </>
      ) : (
        <IconSpark size={15} />
      )}
    </button>
  );

  const rail = !expanded && (
    <div
      {...dragBind}
      className={'island-shell flex h-full w-full overflow-hidden ' + radius + (side ? ' flex-col py-2' : ' items-center')}
      style={shell}
    >
      {focusCell}
      {aiCell}
    </div>
  );

  const focusPanel = panel === 'focus' && loggedIn && (
    <div className={'island-shell flex h-full w-full flex-col overflow-hidden ' + radius} style={shell}>
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
            onClick={() => setPanel(null)}
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

  const chatPanel = panel === 'chat' && loggedIn && (
    <div className={'island-shell flex h-full w-full flex-col overflow-hidden ' + radius} style={shell}>
      <div {...dragBind} className="flex cursor-grab flex-col items-center pt-2 active:cursor-grabbing">
        <i className="h-1 w-10 rounded-full bg-white/20" />
      </div>
      <IslandChat
        watching={watching}
        setWatching={setWatching}
        frame={watch.frame}
        watchError={watch.error}
        onClose={() => setPanel(null)}
        accent={accent}
      />
    </div>
  );

  return (
    <div className="island-root flex h-full w-full select-none">
      {rail}
      {focusPanel}
      {chatPanel}
    </div>
  );
}
