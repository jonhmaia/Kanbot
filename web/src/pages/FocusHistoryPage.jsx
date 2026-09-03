import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Primitives';
import FocusHistoryList from '../components/focus/FocusHistoryList';
import { useFocus } from '../context/FocusContext';
import { formatFocusMinutes } from '../lib/focusSession';

export default function FocusHistoryPage() {
  const { history, clearHistory } = useFocus();
  const totalMin = history.reduce((sum, entry) => sum + (Number(entry.focusMinutes) || 0), 0);
  const blocks = history.reduce((sum, entry) => sum + (Number(entry.completedBlocks) || 0), 0);

  return (
    <>
      <PageHeader
        title="Historico de sessoes"
        eyebrow="Blocos de foco encerrados neste aparelho"
        action={
          history.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apagar todo o historico de sessoes neste aparelho?')) clearHistory();
              }}
              className="btn-ghost"
            >
              Limpar historico
            </button>
          ) : null
        }
      />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="grain p-5">
          <FocusHistoryList
            entries={history}
            spacious
            emptyTitle="Nenhuma sessao ainda"
            empty="Inicie um foco no board. Ao encerrar, a sessao aparece aqui."
          />
        </Card>

        <Card className="grain h-fit p-5">
          <h3 className="card-title">Resumo</h3>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between border-b border-white/[0.05] pb-2.5">
              <span className="text-smoke">Sessoes</span>
              <span className="tabular-nums text-chalk/90">{history.length}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.05] pb-2.5">
              <span className="text-smoke">Blocos</span>
              <span className="tabular-nums text-chalk/90">{blocks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-smoke">Tempo focado</span>
              <span className="tabular-nums text-chalk/90">{formatFocusMinutes(totalMin)}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
