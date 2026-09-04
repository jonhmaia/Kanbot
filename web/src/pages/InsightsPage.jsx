import PageHeader from '../components/layout/PageHeader';
import { Card, EmptyState } from '../components/ui/Primitives';
import { InsightsPanel } from '../components/dashboard/AiRail';
import { IconSpark } from '../lib/icons';
import { useApp } from '../context/AppContext';
import { useChat, useAssistantContext } from '../context/ChatContext';
import useDashboardScope from '../lib/useDashboardScope';

export default function InsightsPage() {
  const { projects } = useApp();
  const { focusChat } = useChat();
  const { scope, isMaster, data, reload } = useDashboardScope();
  const project = projects.find((p) => p.id === scope);

  useAssistantContext('insights', {
    view: {
      insights: data?.insights?.length ?? 0,
      pendingInsights: data?.insights?.filter((i) => !i.applied).length ?? 0,
      overdue: data?.stats?.overdue ?? null,
      project: project?.name || 'Master',
    },
  });

  return (
    <>
      <PageHeader
        title="AI Insights"
        eyebrow={
          isMaster
            ? 'Sugestoes automaticas de todos os projetos'
            : 'Sugestoes automaticas deste projeto'
        }
        action={
          <button type="button" onClick={() => focusChat()} className="btn-primary">
            <IconSpark size={14} /> Falar com o assistente
          </button>
        }
      />

      <div className="px-5 pb-10 sm:px-7">
        <Card className="grain p-5">
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
