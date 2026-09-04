import { useState } from 'react';
import { IconArrowUpRight, IconExpand, IconLogo } from '../../lib/icons';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';

/* ------------------------------------------------------------- Insights */

export function InsightsPanel({ insights = [], onApplied, onExpand, compact = false }) {
  const [busy, setBusy] = useState(null);
  const { notify } = useApp();

  const [applied, setApplied] = useState({});

  const apply = async (insight) => {
    setBusy(insight.id);
    setApplied((m) => ({ ...m, [insight.id]: true }));
    notify('Insight aplicado ao board', 'success');
    try {
      await api.applyInsight(insight.id);
      onApplied?.();
    } catch (e) {
      setApplied((m) => ({ ...m, [insight.id]: false }));
      notify(e.message, 'warn');
    } finally {
      setBusy(null);
    }
  };

  const visible = (compact ? insights.slice(0, 3) : insights).map((i) =>
    applied[i.id] ? { ...i, applied: true } : i,
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <h3 className="card-title">AI Insights</h3>
        {onExpand && (
          <button type="button" onClick={onExpand} className="expand-btn !static" aria-label="Expandir">
            <IconExpand size={13} />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {visible.map((insight, i) => {
          /* na referencia os cards seguintes vao perdendo presenca */
          const dim = compact ? [1, 0.62, 0.36][i] ?? 0.3 : 1;
          const primary = i === 0 || !compact;
          return (
            <article
              key={insight.id}
              style={{ opacity: insight.applied ? 0.45 : dim }}
              className={
                'relative flex items-center gap-3 rounded-3xl px-4 py-3.5 transition-all duration-300 ' +
                (primary && !insight.applied
                  ? 'bg-[#F1F3F4] text-[#141415] shadow-pop'
                  : 'border border-lineSoft bg-white/[0.045] text-dust backdrop-blur-md')
              }
            >
              <div className="min-w-0 flex-1">
                <p
                  className={
                    'truncate text-[13px] font-medium leading-snug ' + (primary && !insight.applied ? 'text-[#141415]' : 'text-chalk/85')
                  }
                >
                  {insight.title}
                </p>
                <p
                  className={
                    'mt-1 truncate text-[11px] leading-snug ' + (primary && !insight.applied ? 'text-[#5A5A5C]' : 'text-smoke')
                  }
                >
                  {insight.detail}
                </p>
              </div>

              {insight.applied ? (
                <span className="shrink-0 rounded-full border border-mint/30 px-3 py-1.5 text-[11px] text-mint">
                  Aplicado
                </span>
              ) : primary ? (
                <button
                  type="button"
                  onClick={() => apply(insight)}
                  disabled={busy === insight.id}
                  className="shrink-0 rounded-full bg-[#141415] px-4 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-[#2a2a2c] disabled:opacity-50"
                >
                  {busy === insight.id ? '...' : 'Apply'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => apply(insight)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:text-chalk"
                  aria-label="Aplicar"
                >
                  <IconArrowUpRight size={13} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Rail */

export default function AiRail({ insights, onApplied, onExpandInsights }) {
  const { focusChat } = useChat();
  return (
    <aside className="card grain flex flex-col p-5">
      <InsightsPanel insights={insights} onApplied={onApplied} onExpand={onExpandInsights} compact />
      <div className="my-5 h-px bg-lineSoft" />
      <button
        type="button"
        onClick={() => focusChat()}
        className="flex items-center justify-center gap-2 rounded-2xl border border-lineSoft bg-white/[0.03] px-4 py-4 text-[12.5px] text-dust transition hover:border-white/20 hover:text-chalk"
      >
        <IconLogo size={18} />
        Perguntar ao assistente sobre esta tela
      </button>
    </aside>
  );
}
