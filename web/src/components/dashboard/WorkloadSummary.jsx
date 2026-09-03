import { Card, CardHeader } from '../ui/Primitives';

/**
 * "Workload Summary": total do sprint a esquerda e a distribuicao por status
 * em barras arredondadas a direita, com legenda 2x2 no topo.
 */
export default function WorkloadSummary({ total, distribution = [], onExpand }) {
  const max = Math.max(1, ...distribution.map((d) => d.value));

  return (
    <Card expandable onExpand={onExpand} className="grain flex flex-col p-5">
      <CardHeader
        title="Workload Summary"
        className="pr-10"
        right={
          <div className="mr-8 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {distribution.slice(0, 4).map((d) => (
              <span key={d.key} className="flex items-center gap-1.5 text-[10.5px] text-dust">
                <i
                  className={'h-2 w-2 rounded-[3px] ' + (d.color === 'hatch' ? 'hatch bg-white/10' : '')}
                  style={d.color === 'hatch' ? undefined : { background: d.color }}
                />
                {d.label}
              </span>
            ))}
          </div>
        }
      />

      <div className="mt-auto flex items-end justify-between gap-6 pt-6">
        <div className="shrink-0">
          <p className="metric">{total}</p>
          <p className="metric-label mt-2 max-w-[92px] leading-snug">Total de tarefas no sprint</p>
        </div>

        <div className="flex h-[104px] items-end gap-2.5">
          {distribution.map((d) => {
            const h = Math.max(26, Math.round((d.value / max) * 104));
            const hatched = d.color === 'hatch';
            return (
              <div key={d.key} className="group relative flex flex-col items-center">
                <span className="pointer-events-none absolute -top-6 whitespace-nowrap rounded-md bg-[#0e0e0f] px-2 py-1 text-[10px] text-chalk opacity-0 shadow-pop transition group-hover:opacity-100">
                  {d.label} · {d.value}
                </span>
                <div
                  className={
                    'w-[26px] rounded-full transition-all duration-300 group-hover:brightness-110 ' +
                    (hatched ? 'hatch border border-white/15 bg-white/[0.04]' : '')
                  }
                  style={{
                    height: h,
                    background: hatched ? undefined : d.color,
                    /* o anel interno mantem a barra escura ("Done") visivel sobre o card */
                    boxShadow: hatched
                      ? undefined
                      : 'inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.18)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
