import { useFocus } from '../../context/FocusContext';
import { IconClock, IconPause, IconPlay, IconSkip } from '../../lib/icons';

export default function FocusStatusBar() {
  const { session, clock, activeTask, running, idle, pause, resume, stop, skipPhase, accent } = useFocus();
  if (idle) return null;

  const breakPhase = session.phase === 'break';
  const waiting = session.status === 'paused';
  const label = breakPhase
    ? waiting
      ? 'Pausa pronta'
      : 'Pausa'
    : activeTask?.title || 'Foco';

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
        <span className="max-w-[200px] truncate text-[12.5px] text-chalk/90">{label}</span>
        {session.cycle > 0 && (
          <span className="hidden text-[11px] text-smoke sm:inline">#{session.cycle}</span>
        )}
        <button
          type="button"
          onClick={running ? pause : resume}
          className="grid h-8 w-8 place-items-center rounded-full text-[#111]"
          style={{ background: running ? '#E5484D' : accent }}
          aria-label={running ? 'Pausar' : 'Retomar'}
        >
          {running ? <IconPause size={13} /> : <IconPlay size={13} />}
        </button>
        <button
          type="button"
          onClick={skipPhase}
          className="grid h-8 w-8 place-items-center rounded-full text-dust hover:bg-white/[0.08] hover:text-chalk"
          aria-label="Pular fase"
          title="Pular fase"
        >
          <IconSkip size={13} />
        </button>
        <button type="button" onClick={stop} className="pr-1 text-[12px] text-smoke hover:text-chalk">
          Encerrar
        </button>
      </div>
    </div>
  );
}
