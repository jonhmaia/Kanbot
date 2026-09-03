import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useFocus } from '../../context/FocusContext';
import { invokeDesktop, listenDesktop } from '../../lib/desktop';
import { islandAccentColor } from '../../lib/islandPrefs';
import { IconClock, IconClose, IconFlame, IconList, IconLogo, IconPause, IconPlay } from '../../lib/icons';

export default function IslandApp() {
  const { session } = useApp();
  const {
    prefs,
    setIslandPrefs,
    session: focus,
    clock,
    activeTask,
    running,
    paused,
    idle,
    streak,
    startFocus,
    pause,
    resume,
    stop,
    switchTask,
  } = useFocus();
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef(false);
  const press = useRef(null);
  const leaveTimer = useRef(null);
  const loggedIn = Boolean(session);
  const accent = islandAccentColor(prefs.accent);
  const side = prefs.edge !== 'top';

  useEffect(() => {
    invokeDesktop('resize_island', { expanded: false, edge: prefs.edge });
  }, []);

  useEffect(() => {
    invokeDesktop('resize_island', { expanded, edge: prefs.edge });
  }, [expanded, prefs.edge]);

  useEffect(() => {
    let stop = () => {};
    listenDesktop('island-edge', (event) => {
      if (event?.payload) setIslandPrefs({ edge: event.payload });
    }).then((unlisten) => {
      stop = unlisten;
    });
    return () => stop();
  }, [setIslandPrefs]);

  const applyExpanded = async (next) => {
    if (next === expanded || dragging.current) return;
    setExpanded(next);
  };

  const onEnter = () => {
    if (dragging.current) return;
    clearTimeout(leaveTimer.current);
    if (loggedIn) applyExpanded(true);
  };

  const onLeave = () => {
    if (dragging.current) return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => applyExpanded(false), 280);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    press.current = { timer: null, dragged: false };
    press.current.timer = setTimeout(async () => {
      dragging.current = true;
      press.current.dragged = true;
      applyExpanded(false);
      await invokeDesktop('start_drag_island');
    }, 350);
  };

  const endPress = async () => {
    clearTimeout(press.current?.timer);
    if (press.current?.dragged) {
      const edge = await invokeDesktop('snap_island', { expanded: false });
      if (typeof edge === 'string') setIslandPrefs({ edge });
      setTimeout(() => {
        dragging.current = false;
      }, 200);
    }
    press.current = null;
  };

  const label = idle ? (loggedIn ? 'Kanbot' : session === undefined ? 'Kanbot' : 'Entrar') : activeTask?.title || 'Foco';
  const shell = {
    boxShadow: '0 0 0 1.5px ' + accent + ', 0 10px 28px rgba(0,0,0,0.38)',
  };

  const pill = (
    <button
      type="button"
      onClick={() => (idle ? invokeDesktop('show_main') : running ? pause() : resume())}
      onPointerDown={onPointerDown}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      className={
        side
          ? 'flex h-full w-[40px] flex-col items-center justify-center gap-2 rounded-full bg-[#111111]/94 px-1 py-3 text-chalk backdrop-blur-2xl'
          : 'flex h-[40px] w-full items-center justify-center gap-2.5 rounded-full bg-[#111111]/94 px-3 text-chalk backdrop-blur-2xl'
      }
      style={shell}
      aria-label={idle ? 'Abrir Kanbot' : running ? 'Pausar foco' : 'Retomar foco'}
    >
      {idle ? <IconLogo size={side ? 18 : 20} /> : <IconClock size={side ? 14 : 15} className="text-current" />}
      <span
        className={
          'font-medium tabular-nums tracking-tight ' +
          (side ? '[writing-mode:vertical-rl] rotate-180 text-[12px]' : 'text-[13px]')
        }
        style={{ color: idle ? undefined : accent }}
      >
        {idle ? '' : clock}
      </span>
      <span
        className={
          'truncate font-medium tracking-tight ' +
          (side ? '[writing-mode:vertical-rl] rotate-180 text-[11px] max-h-[88px]' : 'max-w-[140px] text-[13px]')
        }
      >
        {idle && !side ? label : side && idle ? label : label}
      </span>
    </button>
  );

  const panel = expanded && loggedIn && (
    <div
      className={
        (side ? 'h-[344px] w-[316px] ' : 'mt-2 w-full ') +
        'overflow-hidden rounded-[26px] bg-[#111111]/95 backdrop-blur-2xl'
      }
      style={shell}
    >
      <div className={'grid h-full ' + (side ? 'grid-rows-2' : 'grid-cols-2')}>
        <section className="flex min-h-0 flex-col border-white/8 p-3.5" style={{ borderRight: side ? undefined : '1px solid rgba(255,255,255,0.08)', borderBottom: side ? '1px solid rgba(255,255,255,0.08)' : undefined }}>
          <div className="mb-2 flex items-center gap-1.5 text-smoke">
            <IconList size={13} />
            <p className="text-[11px] uppercase tracking-[0.14em]">To Do</p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {focus.tasks.length === 0 && (
              <p className="px-1 py-6 text-center text-[12px] text-smoke">Inicie um foco no board</p>
            )}
            {focus.tasks.map((task) => {
              const active = task.id === focus.currentTaskId;
              return (
                <div
                  key={task.id}
                  className={
                    'flex items-start gap-2 rounded-2xl px-2 py-2 ' + (active ? 'bg-white/[0.06]' : '')
                  }
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-white/25" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-chalk/90">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-smoke">{task.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      switchTask(task.id);
                      if (paused) resume();
                      else if (idle) startFocus([task]);
                    }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{ background: active && running ? '#E5484D' : accent, color: '#111' }}
                    aria-label={active && running ? 'Pausar' : 'Focar'}
                  >
                    {active && running ? <IconPause size={12} /> : <IconPlay size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col p-3.5">
          <div className="mb-2 flex items-center justify-between text-smoke">
            <span className="flex items-center gap-1.5">
              <IconFlame size={13} style={{ color: accent }} />
              <p className="text-[11px] uppercase tracking-[0.14em]">Journey Streak</p>
            </span>
            <span className="text-[11px] tabular-nums">{streak.filter((c) => c.count).length}d</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {streak.map((cell) => (
              <i
                key={cell.key}
                title={cell.key + ' · ' + cell.count}
                className="h-3.5 rounded-[3px]"
                style={{
                  background: cell.count ? accent : 'rgba(255,255,255,0.08)',
                  opacity: cell.count ? Math.min(1, 0.35 + cell.count * 0.25) : 1,
                }}
              />
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <p className="text-[11px] text-smoke">{idle ? 'Pronto' : focus.phase === 'break' ? 'Pausa' : 'Foco'}</p>
            <div className="flex items-center gap-1">
              {!idle && (
                <button type="button" onClick={stop} className="px-2 text-[11px] text-smoke hover:text-chalk">
                  Encerrar
                </button>
              )}
              <button
                type="button"
                onClick={() => invokeDesktop('quit_app')}
                className="px-2 text-[11px] text-rose/80 hover:text-rose"
              >
                Sair
              </button>
              <button
                type="button"
                onClick={() => applyExpanded(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-dust hover:bg-white/[0.06] hover:text-chalk"
                aria-label="Recolher"
              >
                <IconClose size={13} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const frame =
    prefs.edge === 'left'
      ? 'flex h-full w-full flex-row items-start gap-2 p-1.5'
      : prefs.edge === 'right'
        ? 'flex h-full w-full flex-row-reverse items-start gap-2 p-1.5'
        : 'flex h-full w-full flex-col items-center pt-1.5';

  return (
    <div className={'select-none ' + frame} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className={side ? 'h-full shrink-0' : expanded ? 'w-[504px]' : 'w-[268px]'}>{pill}</div>
      {panel}
    </div>
  );
}
