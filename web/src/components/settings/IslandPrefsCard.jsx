import { useFocus } from '../../context/FocusContext';
import { invokeDesktop } from '../../lib/desktop';
import { ISLAND_ACCENTS, ISLAND_EDGES } from '../../lib/islandPrefs';
import { Card } from '../ui/Primitives';
import { IconCheck } from '../../lib/icons';

export default function IslandPrefsCard() {
  const { prefs, setIslandPrefs } = useFocus();

  const setEdge = (edge) => {
    setIslandPrefs({ edge });
    invokeDesktop('resize_island', { expanded: false, edge });
  };

  return (
    <Card className="grain p-5">
      <h3 className="card-title">Notch</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        Cor da borda e lado da tela. No app nativo, pressione a pílula e arraste para a lateral — ela
        encaixa sozinha. No Mac, o topo cola no notch da câmera.
      </p>

      <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-smoke">Acento</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {ISLAND_ACCENTS.map((item) => {
          const selected = prefs.accent === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.name}
              onClick={() => setIslandPrefs({ accent: item.id })}
              aria-pressed={selected}
              className={
                'flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[12px] transition ' +
                (selected ? 'border-white/30 text-chalk' : 'border-line text-dust hover:border-white/20')
              }
            >
              <i className="h-3.5 w-3.5 rounded-full" style={{ background: item.color }} />
              {item.name}
              {selected && <IconCheck size={12} />}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-smoke">Posicao</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {ISLAND_EDGES.map((item) => {
          const selected = prefs.edge === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setEdge(item.id)}
              aria-pressed={selected}
              className={
                'rounded-full border px-3 py-1.5 text-[12px] transition ' +
                (selected ? 'border-white/30 bg-white/[0.07] text-chalk' : 'border-line text-dust hover:border-white/20')
              }
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
