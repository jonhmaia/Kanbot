import { useFocus } from '../../context/FocusContext';
import { islandAccentColor } from '../../lib/islandPrefs';
import { IconClock, IconPause, IconPlay } from '../../lib/icons';

export default function FocusStatusBar() {
  const { session, clock, activeTask, running, paused, idle, pause, resume, stop, prefs } = useFocus();
  if (idle) return null;
  const accent = islandAccentColor(prefs.accent);

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div
        className="flex items-center gap-3 rounded-full border bg-[#141415]/92 px-3 py-2 shadow-lift backdrop-blur-2xl"
        style={{ borderColor: accent + '99' }}
      >
        <IconClock size={14} style={{ color: accent }} />
        <span className="text-[13px] font-medium tabular-nums" style={{ color: accent }}>
          {clock}
        </span>
        <span className="max-w-[220px] truncate text-[12.5px] text-chalk/90">
          {session.phase === 'break' ? 'Pausa' : activeTask?.title || 'Foco'}
        </span>
        <button
          type="button"
          onClick={running ? pause : resume}
          className="grid h-8 w-8 place-items-center rounded-full text-[#111]"
          style={{ background: running ? '#E5484D' : accent }}
          aria-label={running ? 'Pausar' : 'Retomar'}
        >
          {running ? <IconPause size={13} /> : <IconPlay size={13} />}
        </button>
        <button type="button" onClick={stop} className="pr-1 text-[12px] text-smoke hover:text-chalk">
          Encerrar
        </button>
      </div>
    </div>
  );
}
