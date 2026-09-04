import { useFocus } from '../../context/FocusContext';
import { invokeDesktop } from '../../lib/desktop';
import { ISLAND_ACCENTS, ISLAND_EDGES } from '../../lib/islandPrefs';
import { Card, Switch } from '../ui/Primitives';
import { IconCheck } from '../../lib/icons';

export default function IslandPrefsCard() {
  const { prefs, setIslandPrefs } = useFocus();

  const setEdge = (edge) => {
    setIslandPrefs({ edge });
    invokeDesktop('resize_island', { expanded: false, edge });
  };

  const setVisible = (visible) => {
    setIslandPrefs({ visible });
    invokeDesktop(visible ? 'show_island' : 'hide_island');
  };

  return (
    <Card className="grain p-5 sm:p-6">
      <h3 className="card-title">Notch</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        A pilula flutuante no app nativo. Sair esconde sem fechar o Kanbot; o X so recolhe o painel.
        Arraste para a lateral para encaixar. Com um projeto aberto, a borda segue a cor dele.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-2.5">
        <div>
          <p className="text-[13px] text-chalk/90">Mostrar notch</p>
          <p className="mt-0.5 text-[11.5px] text-smoke">Tira e coloca a pílula flutuante</p>
        </div>
        <Switch checked={prefs.visible} onChange={setVisible} label="Mostrar notch" />
      </div>

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
