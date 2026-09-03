import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowUpRight, IconExpand, IconSend, IconSpark } from '../../lib/icons';
import AiWaves from './AiWaves';
import AssistantBlocks from '../ai/AssistantBlocks';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import { taskPath } from '../../lib/taskScope';

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

/* ------------------------------------------------------------ Assistant */

export function AssistantPanel({ compact = true, hideTitle = false }) {
  const navigate = useNavigate();
  const { messages, value, setValue, thinking, chips, send, userName } = useChat();
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {!hideTitle && <p className="text-center text-[12.5px] text-dust/80">AI Assistant</p>}

      {empty ? (
        <div className="relative flex flex-1 flex-col items-center justify-center py-4">
          <h2 className="text-center font-display text-[30px] font-light leading-[1.12] tracking-[-0.03em] text-white/25">
            Hey {userName}!
            <br />
            How can I assist you?
          </h2>
          <AiWaves className="mt-2 h-[140px] w-full opacity-90" />
        </div>
      ) : (
        <div ref={scroller} className="scroll-slim relative my-3 min-h-[150px] flex-1 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                'animate-floatIn rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ' +
                (m.role === 'user'
                  ? 'ml-auto max-w-[86%] bg-white/[0.09] text-chalk'
                  : 'w-full border border-lineSoft bg-white/[0.035] text-dust')
              }
            >
              {m.role === 'bot' && (
                <span className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-amber/80">
                  <IconSpark size={11} /> Kanbot · DeepSeek
                </span>
              )}
              {m.text}
              {m.role === 'bot' && m.applied?.some((a) => a.ok) && (
                <p className="mt-2 text-[11px] text-mint">
                  Aplicado: {m.applied.filter((a) => a.ok).map((a) => a.label).join(' · ')}
                </p>
              )}
              {m.role === 'bot' && m.blocks?.length > 0 && (
                <AssistantBlocks
                  blocks={m.blocks}
                  compact={compact}
                  onOpenTask={(task) => navigate(taskPath(task.projectId, 'board'))}
                />
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-1.5 px-1 py-2">
              {[0, 1, 2].map((d) => (
                <i
                  key={d}
                  className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-amber"
                  style={{ animationDelay: d * 0.18 + 's' }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-1.5">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => send(c)} className="chip shrink-0">
            {c}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex items-center gap-2 rounded-full border border-line bg-black/40 p-1.5 pl-2 backdrop-blur-xl"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-btn text-[#191100]">
          <IconSpark size={14} />
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Pergunte ou peca para criar/editar..."
          className="min-w-0 flex-1 bg-transparent text-[13px] text-chalk placeholder:text-smoke outline-none"
        />
        <button
          type="submit"
          disabled={!value.trim() || thinking}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.09] text-dust transition hover:bg-white/[0.16] hover:text-chalk disabled:opacity-40"
          aria-label="Enviar"
        >
          <IconSend size={14} />
        </button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- Rail */

export default function AiRail({ insights, onApplied, onExpandInsights }) {
  const { open, focusChat } = useChat();
  return (
    <aside className="card grain flex flex-col p-5">
      <InsightsPanel insights={insights} onApplied={onApplied} onExpand={onExpandInsights} compact />
      <div className="my-5 h-px bg-lineSoft" />
      {open ? (
        <button
          type="button"
          onClick={focusChat}
          className="rounded-2xl border border-lineSoft bg-white/[0.03] px-4 py-6 text-center text-[12.5px] text-smoke transition hover:text-chalk"
        >
          Chat aberto na janela. Clique para focar.
        </button>
      ) : (
        <AssistantPanel />
      )}
    </aside>
  );
}
