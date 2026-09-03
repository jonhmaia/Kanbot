import { ATMOSPHERES, atmosphereGradient } from '../../lib/atmospheres';
import { useApp } from '../../context/AppContext';
import { IconCheck } from '../../lib/icons';

export default function AtmospherePicker({ compact = false, onPick }) {
  const { atmosphere, setAtmosphere } = useApp();

  return (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2.5 sm:grid-cols-3'}>
      {ATMOSPHERES.map((item) => {
        const selected = atmosphere === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.name}
            onClick={() => {
              setAtmosphere(item.id);
              onPick?.(item.id);
            }}
            aria-pressed={selected}
            className={
              'group relative overflow-hidden rounded-2xl border text-left transition ' +
              (selected
                ? 'border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'border-line hover:border-white/20')
            }
          >
            <span
              className={compact ? 'block h-11' : 'block h-[72px]'}
              style={{ backgroundImage: atmosphereGradient(item.id), backgroundColor: item.stops[5] }}
            />
            <span className={'flex items-center justify-between gap-1.5 ' + (compact ? 'px-1.5 py-1.5' : 'px-2.5 py-2')}>
              <span className="min-w-0">
                <span className={'block truncate text-chalk/90 ' + (compact ? 'text-[11px]' : 'text-[12px]')}>
                  {item.name}
                </span>
                {!compact && <span className="block truncate text-[10.5px] text-smoke">{item.hint}</span>}
              </span>
              {selected && <IconCheck size={compact ? 11 : 13} className="shrink-0 text-chalk/80" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
