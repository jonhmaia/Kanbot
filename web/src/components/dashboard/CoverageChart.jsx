import { useState } from 'react';
import { Card } from '../ui/Primitives';
import { IconExpand } from '../../lib/icons';
import { pad2 } from '../../lib/format';

const H = 138;

const stateOf = (scheduled, required) => {
  if (scheduled >= required) return 'adequate';
  if (scheduled >= required - 1) return 'moderate';
  return 'under';
};

const LEGEND = [
  { key: 'adequate', label: 'Adequate', color: '#F5A524' },
  { key: 'moderate', label: 'Moderate', color: '#EDEDED' },
  { key: 'under', label: 'Understaffed', color: 'hatch' },
];

/**
 * Grafico de cobertura de capacidade por faixa de hora.
 * Barra fina = capacidade alocada; traco superior = capacidade necessaria.
 */
export default function CoverageChart({ data = [], onExpand }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.scheduled, d.required))) + 1;

  return (
    <Card tone="dark" className="grain overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="card-title">Capacity Coverage</h3>
        <div className="flex items-center gap-4 pr-10">
          {LEGEND.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5 text-[10.5px] text-dust">
              <i
                className={'h-2 w-2 rounded-[3px] ' + (l.color === 'hatch' ? 'hatch bg-white/10' : '')}
                style={l.color === 'hatch' ? undefined : { background: l.color }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={onExpand} className="expand-btn" aria-label="Expandir">
          <IconExpand size={13} />
        </button>
      </div>

      <div className="relative mt-7" style={{ height: H + 26 }}>
        {/* linhas de grade */}
        <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: H }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-white/[0.045]"
              style={{ top: t * H }}
            />
          ))}
        </div>

        <div className="relative flex h-full items-end gap-[3px]">
          {data.map((d, i) => {
            const state = stateOf(d.scheduled, d.required);
            const barH = Math.round((d.scheduled / max) * H);
            const reqY = Math.round((d.required / max) * H);
            const active = hover === i;

            return (
              <div
                key={d.hour}
                className="group relative flex flex-1 flex-col items-center justify-end"
                style={{ height: H + 26 }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* faixa de realce da coluna ativa */}
                <div
                  className={
                    'absolute inset-x-0 top-0 rounded-md transition-opacity duration-200 ' +
                    (active ? 'bg-white/[0.045] opacity-100' : 'opacity-0')
                  }
                  style={{ height: H }}
                />

                {/* marcador de capacidade necessaria: traco curto colado a barra */}
                <div
                  className={
                    'absolute h-px w-2.5 translate-x-[9px] transition-colors ' +
                    (active ? 'bg-white/55' : 'bg-white/22')
                  }
                  style={{ bottom: reqY + 26 }}
                />

                <div className="relative flex w-full items-end justify-center" style={{ height: H }}>
                  <div
                    className={
                      'w-[6px] rounded-full transition-all duration-300 ' +
                      (state === 'under' ? 'hatch border border-white/20 bg-white/[0.05]' : '') +
                      (active ? ' scale-x-[1.6]' : '')
                    }
                    style={{
                      height: Math.max(8, barH),
                      background:
                        state === 'adequate' ? '#F5A524' : state === 'moderate' ? '#EDEDED' : undefined,
                      boxShadow: state === 'adequate' && active ? '0 0 16px rgba(245,165,36,.55)' : undefined,
                    }}
                  />
                </div>

                <span
                  className={
                    'mt-2 h-[26px] pt-1.5 text-[10px] transition-colors ' +
                    (active ? 'text-chalk' : 'text-smoke')
                  }
                >
                  {i % 2 === 0 ? d.hour : ''}
                </span>
              </div>
            );
          })}

          {hover !== null && (
            <Tooltip
              index={hover}
              total={data.length}
              point={data[hover]}
              state={stateOf(data[hover].scheduled, data[hover].required)}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

function Tooltip({ index, total, point, state }) {
  const left = ((index + 0.5) / total) * 100;
  const flip = left > 68;
  const label = state === 'adequate' ? 'Adequate Coverage' : state === 'moderate' ? 'Moderate Coverage' : 'Understaffed';

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 animate-floatIn"
      style={{ left: left + '%', transform: 'translateX(' + (flip ? '-100%' : '-10%') + ')' }}
    >
      <div className="w-[168px] rounded-2xl border border-white/10 bg-[#1b1b1c]/95 p-3 shadow-lift backdrop-blur-xl">
        <p className="mb-2 text-[11.5px] text-chalk">{label}</p>
        <dl className="space-y-1">
          {[
            ['Required', point.required],
            ['Variance', Math.abs(point.scheduled - point.required)],
            ['Scheduled', point.scheduled],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-t border-white/[0.06] pt-1 text-[10.5px]">
              <dt className="text-smoke">{k}</dt>
              <dd className="font-medium text-dust">{pad2(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
