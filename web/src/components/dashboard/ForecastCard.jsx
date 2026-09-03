import { useMemo, useState } from 'react';
import { IconExpand } from '../../lib/icons';
import { smoothPath } from '../../lib/format';

const W = 320;
const H = 118;

/**
 * Card claro da referencia: linha suave com area preenchida e um balao
 * escuro ancorado no ponto de pico.
 */
export default function ForecastCard({ data = [], onExpand }) {
  const [hover, setHover] = useState(null);

  const { points, peak } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const min = Math.min(...data.map((d) => d.value), 0);
    const span = Math.max(1, max - min);
    const pts = data.map((d, i) => ({
      x: (i / Math.max(1, data.length - 1)) * W,
      y: H - ((d.value - min) / span) * (H - 22) - 8,
      ...d,
    }));
    const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
    return { points: pts, peak: pts[peakIndex] };
  }, [data]);

  const line = smoothPath(points);
  const area = line + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';
  const active = hover !== null ? points[hover] : peak;

  return (
    <section className="relative overflow-hidden rounded-4xl bg-[#F4F6F7] p-5 text-[#141415] shadow-lift">
      <div className="flex items-start justify-between">
        <h3 className="text-[15px] font-medium tracking-tight text-[#141415]">Delivery Forecast</h3>
        <button
          type="button"
          onClick={onExpand}
          className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-black/[0.04] text-[#3c3c3e] transition hover:bg-black/[0.09]"
          aria-label="Expandir"
        >
          <IconExpand size={13} />
        </button>
      </div>

      <div className="relative mt-4">
        <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full" style={{ height: H }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="fcArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8FC9E0" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#8FC9E0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#fcArea)" />
          <path d={line} fill="none" stroke="#5FA8C9" strokeWidth="1.8" strokeLinecap="round" />
          {active && (
            <>
              <line x1={active.x} y1={active.y} x2={active.x} y2={H} stroke="#141415" strokeOpacity="0.12" strokeWidth="1" />
              <circle cx={active.x} cy={active.y} r="4.5" fill="#141415" />
              <circle cx={active.x} cy={active.y} r="8" fill="#141415" fillOpacity="0.12" />
            </>
          )}
        </svg>

        {/* areas de hover invisiveis, uma por ponto */}
        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <button
              key={p.hour}
              type="button"
              className="h-full flex-1"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              aria-label={p.hour}
            />
          ))}
        </div>

        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: (active.x / W) * 100 + '%', top: (active.y / H) * 100 - 8 + '%' }}
          >
            <div className="flex items-center gap-2 rounded-2xl bg-[#141415] px-3 py-2 text-white shadow-pop">
              <span className="font-display text-[19px] leading-none tracking-tight">{active.value}</span>
              <span className="max-w-[74px] text-[10px] leading-tight text-white/65">Entregas previstas</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-[#8A8A8C]">
        {points.map((p, i) => (
          <span key={p.hour}>{i % 3 === 0 ? p.hour : ''}</span>
        ))}
      </div>
    </section>
  );
}
