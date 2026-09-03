import { Card, Avatar } from '../ui/Primitives';
import { IconExpand } from '../../lib/icons';
import { pad2 } from '../../lib/format';

const START = 8;
const END = 15;
const HOURS = Array.from({ length: END - START + 1 }, (_, i) => START + i);

/** Linha do tempo do dia: quem esta em qual card e por quanto tempo. */
export default function LiveTaskBoard({ rows = [], onExpand, onSelect }) {
  const pct = (h) => ((h - START) / (END - START)) * 100;

  return (
    <Card className="grain flex flex-col p-5">
      <div className="flex items-start justify-between">
        <h3 className="card-title">Live Task Board</h3>
        <button type="button" onClick={onExpand} className="expand-btn" aria-label="Expandir">
          <IconExpand size={13} />
        </button>
      </div>

      <div className="relative mt-6 flex-1">
        {/* grade vertical */}
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          {HOURS.map((h) => (
            <span key={h} className="w-px bg-white/[0.05]" />
          ))}
        </div>

        <div className="relative space-y-2.5">
          {rows.map((row) => {
            const left = pct(row.start);
            const width = Math.max(16, pct(row.end) - left);
            return (
              <div key={row.id} className="relative h-[34px]">
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className="group absolute flex h-[34px] items-center gap-2 rounded-full border border-line bg-white/[0.07] pl-1 pr-3 text-left backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.11]"
                  style={{ left: left + '%', width: width + '%', minWidth: 168 }}
                >
                  <Avatar member={row.member} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-chalk/90">
                    {row.member?.name?.split(' ')[0]}
                    <span className="mx-1.5 text-smoke">·</span>
                    <span className="text-dust">{row.label}</span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-smoke">{row.end - row.start}h</span>
                  <i
                    className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full opacity-0 transition group-hover:opacity-100"
                    style={{ background: row.project?.color || '#F5A524' }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-between border-t border-lineSoft pt-2.5 text-[10px] text-smoke">
        {HOURS.map((h) => (
          <span key={h}>{pad2(h)}:00</span>
        ))}
      </div>
    </Card>
  );
}
