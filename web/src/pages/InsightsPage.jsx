import PageHeader from '../components/layout/PageHeader';
import { Card, EmptyState } from '../components/ui/Primitives';
import { InsightsPanel, AssistantPanel } from '../components/dashboard/AiRail';
import { useChat } from '../context/ChatContext';
import useDashboardScope from '../lib/useDashboardScope';

export default function InsightsPage() {
  const { open, focusChat } = useChat();
  const { isMaster, data, reload } = useDashboardScope();

  return (
    <>
      <PageHeader
        title="AI Insights"
        eyebrow={
          isMaster
            ? 'DeepSeek V4 Flash via OpenRouter — cards, pessoas e graficos no chat'
            : 'Sugestoes e chat neste projeto'
        }
      />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="grain flex min-h-[640px] flex-col p-5">
          {open ? (
            <button
              type="button"
              onClick={focusChat}
              className="m-auto rounded-2xl border border-lineSoft bg-white/[0.03] px-6 py-8 text-center text-[13px] text-smoke transition hover:text-chalk"
            >
              Chat aberto na janela. Clique para focar.
            </button>
          ) : (
            <AssistantPanel compact={false} />
          )}
        </Card>

        <Card className="grain h-fit p-5">
          {data ? (
            data.insights.length ? (
              <InsightsPanel insights={data.insights} onApplied={reload} />
            ) : (
              <EmptyState title="Sem sugestoes" description="Tudo equilibrado por aqui no momento." />
            )
          ) : (
            <div className="h-[300px] animate-pulseSoft rounded-3xl bg-white/[0.04]" />
          )}
        </Card>
      </div>
    </>
  );
}
