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

/* ── Ring with neon glow SVG ─────────────────────────────── */
function Ring({ progress, color, children, live, size = 'sm' }) {
  const isBig = size === 'lg';
  const radius = isBig ? 38 : 14;
  const viewBox = isBig ? 84 : 36;
  const cx = viewBox / 2;
  const strokeW = isBig ? 3.6 : 3.0;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  const dim = isBig ? 'h-[84px] w-[84px]' : 'h-11 w-11';

  return (
    <span className={'relative grid place-items-center ' + dim + (live ? ' island-live' : '')}>
      <svg className={'absolute inset-0 ' + dim} viewBox={`0 0 ${viewBox} ${viewBox}`} aria-hidden="true">
        <defs>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          filter="url(#ring-glow)"
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

/* ── Phase badge ─────────────────────────────────────────── */
function PhaseBadge({ phase, accent, isBreak }) {
  const bg = isBreak ? 'rgba(143, 227, 176, 0.15)' : `color-mix(in srgb, ${accent} 15%, transparent)`;
  const fg = isBreak ? '#8FE3B0' : accent;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em]"
      style={{ background: bg, color: fg }}
    >
      {isBreak ? '☕' : '●'} {phase}
    </span>
  );
}

/* ── Streak dots (7-day mini vis) ────────────────────────── */
function StreakDots({ streak, accent }) {
  const days = (streak || []).slice(0, 7);
  while (days.length < 7) days.push({ count: 0 });
  return (
    <span className="flex items-center gap-1">
      {days.map((cell, i) => (
        <i
          key={i}
          className="island-streak-dot"
          style={{ background: cell.count ? accent : 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </span>
  );
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
  const isBreak = focus.phase === 'break';

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
    const settle = window.setTimeout(() => {
      if (drag.current.live) return;
      invokeDesktop('resize_island', { expanded, edge: prefs.edge });
    }, 80);
    return () => window.clearTimeout(settle);
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
    : isBreak
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

  /* Shell style: CSS var accent, thin border via CSS class */
  const shell = { '--island-accent': accent };

  /* ── Rail: collapsed state ─────────────────────────────── */
  const focusCell = (
    <button
      type="button"
      onClick={() => openPanel('focus')}
      className={
        dock
          ? 'hidden'
          : side
            ? 'flex flex-1 flex-col items-center justify-center gap-1 px-1'
            : 'flex min-w-0 flex-1 items-center gap-2 px-3'
      }
      aria-label="Abrir foco"
    >
      {side ? (
        <>
          <Ring progress={idle ? 1 : progress} color={accent} live={running}>
            {idle ? (
              <IconLogo size={16} />
            ) : isBreak ? (
              <span className="text-[12px]">☕</span>
            ) : (
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            )}
          </Ring>
          <span className="text-[11px] font-medium text-chalk">Foco</span>
          <span className={'text-[10px] tabular-nums text-white/45' + (paused ? ' island-paused' : '')}>
            {idle ? 'ok' : `${mm}:${ss}`}
          </span>
        </>
      ) : (
        <>
          <span className={'relative grid shrink-0 place-items-center ' + (running ? 'island-live' : paused ? 'island-paused' : '')}>
            {idle ? (
              <IconLogo size={16} />
            ) : isBreak ? (
              <span className="text-[13px]">☕</span>
            ) : (
              <i className="h-2 w-2 rounded-full" style={{ background: accent }} />
            )}
          </span>
          {!idle && (
            <span className="island-glow-text shrink-0 text-[13px] font-medium tabular-nums tracking-tight" style={{ color: accent }}>
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
          <span className="text-[11px] font-medium island-glow-text" style={{ color: accent }}>
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

  /* ── Rail (collapsed notch) ────────────────────────────── */
  const rail = !expanded && (
    <div
      {...dragBind}
      className={'island-shell island-rail-enter flex h-full min-w-0 w-full overflow-hidden ' + radius + (side ? ' flex-col py-2' : ' items-center')}
      style={shell}
    >
      {focusCell}
      {aiCell}
    </div>
  );

  /* ── Focus panel (expanded) ────────────────────────────── */
  const focusPanel = panel === 'focus' && loggedIn && (
    <div className={'island-shell island-glass island-panel-enter flex h-full w-full flex-col overflow-hidden ' + radius} style={shell}>
      {/* Drag handle */}
      <div {...dragBind} className="flex cursor-grab flex-col items-center pt-2.5 active:cursor-grabbing">
        <i className="island-handle" />
      </div>

      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-3">
        <div className="min-w-0">
          {idle ? (
            <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">{phase}</p>
          ) : (
            <PhaseBadge phase={phase} accent={accent} isBreak={isBreak} />
          )}

          {/* Big ring + timer when in focus */}
          {!idle ? (
            <div className="mt-3 flex items-center gap-3">
              <Ring progress={progress} color={accent} live={running} size="lg">
                <span className="font-display text-[22px] leading-none tabular-nums tracking-tight" style={{ color: accent }}>
                  {clock}
                </span>
              </Ring>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-chalk/90">{title}</p>
                <p className="mt-0.5 text-[11px] text-smoke">{isBreak ? 'Descanse' : 'Focando'}</p>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 font-display text-[28px] leading-none tracking-tight text-chalk/80">—</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...stopDrag}
            onClick={onFocusToggle}
            className="grid h-10 w-10 place-items-center rounded-full text-[#111] transition-transform hover:scale-105 active:scale-95"
            style={{ background: running ? '#E5484D' : accent }}
            aria-label={idle ? 'Abrir Kanbot' : running ? 'Pausar' : 'Retomar'}
          >
            {running ? <IconPause size={15} /> : <IconPlay size={15} />}
          </button>
          <button
            type="button"
            {...stopDrag}
            onClick={() => setPanel(null)}
            className="grid h-9 w-9 place-items-center rounded-full text-dust transition hover:bg-white/[0.06] hover:text-chalk"
            aria-label="Recolher"
          >
            <IconClose size={14} />
          </button>
        </div>
      </header>

      {/* Task list */}
      <section className="min-h-0 flex-1 space-y-0.5 overflow-y-auto border-t border-white/[0.06] px-2.5 py-2">
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
              className={
                'flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5 transition-colors ' +
                (active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')
              }
            >
              <i
                className="h-2 w-2 shrink-0 rounded-full transition-all"
                style={{
                  background: active ? accent : 'rgba(255,255,255,0.2)',
                  boxShadow: active ? `0 0 6px ${accent}` : 'none',
                }}
              />
              <p className="min-w-0 flex-1 truncate text-[12.5px] text-chalk/90">{task.title}</p>
              <button
                type="button"
                onClick={() => onTaskAction(task, active)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#111] transition-transform hover:scale-110 active:scale-95"
                style={{ background: active && running ? '#E5484D' : accent }}
                aria-label={active && running ? 'Pausar' : 'Focar'}
              >
                {active && running ? <IconPause size={12} /> : <IconPlay size={12} />}
              </button>
            </div>
          );
        })}
      </section>

      {/* Footer with streak dots */}
      <footer className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5">
        <span className="flex items-center gap-2 text-smoke">
          <IconFlame size={12} style={{ color: accent }} />
          <StreakDots streak={streak} accent={accent} />
          <span className="text-[10px] tabular-nums">{streak.filter((cell) => cell.count).length}d</span>
        </span>
        <div className="flex items-center gap-0.5">
          {!idle && (
            <button type="button" onClick={skipPhase} className="rounded-full px-2 py-1 text-[11px] text-smoke transition hover:bg-white/[0.06] hover:text-chalk">
              Pular
            </button>
          )}
          {!idle && (
            <button type="button" onClick={stop} className="rounded-full px-2 py-1 text-[11px] text-smoke transition hover:bg-white/[0.06] hover:text-chalk">
              Encerrar
            </button>
          )}
          <button type="button" onClick={hideIsland} className="rounded-full px-2 py-1 text-[11px] text-rose/80 transition hover:bg-rose/10 hover:text-rose">
            Esconder
          </button>
        </div>
      </footer>
    </div>
  );

  /* ── Chat panel (expanded) ─────────────────────────────── */
  const chatPanel = panel === 'chat' && loggedIn && (
    <div className={'island-shell island-glass island-panel-enter flex h-full w-full flex-col overflow-hidden ' + radius} style={shell}>
      <div {...dragBind} className="flex cursor-grab flex-col items-center pt-2.5 active:cursor-grabbing">
        <i className="island-handle" />
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
    <div className="island-root flex h-full min-h-0 min-w-0 w-full select-none" data-edge={prefs.edge} style={{ '--island-accent': accent }}>
      {rail}
      {focusPanel}
      {chatPanel}
    </div>
  );
}
