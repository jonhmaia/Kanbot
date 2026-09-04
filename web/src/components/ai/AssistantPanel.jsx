import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLogo, IconSend } from '../../lib/icons';
import AiWaves from '../dashboard/AiWaves';
import AssistantBlocks from './AssistantBlocks';
import { useChat } from '../../context/ChatContext';
import { taskPath } from '../../lib/taskScope';

/**
 * Corpo do assistente. Vive so dentro do dock aberto pelo botao do assistente:
 * nao replicar este painel em outras telas.
 */
export default function AssistantPanel({ compact = false }) {
  const navigate = useNavigate();
  const { messages, value, setValue, thinking, chips, send, userName, context, contextLabel } = useChat();
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {empty ? (
        <div className="relative flex flex-1 flex-col items-center justify-center py-4">
          <h2 className="text-center font-display text-[30px] font-light leading-[1.12] tracking-[-0.03em] text-white/25">
            Hey {userName}!
            <br />
            How can I assist you?
          </h2>
          <p className="mt-3 max-w-[280px] text-center text-[11.5px] leading-relaxed text-smoke">
            {context?.openTask
              ? 'Estou vendo a tarefa aberta. Pode falar "esta tarefa".'
              : 'Estou vendo ' + contextLabel + '. Pode falar "aqui" ou "este projeto".'}
          </p>
          <div className="relative mt-2 w-full">
            <AiWaves className="h-[140px] w-full opacity-90" />
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <IconLogo
                size={44}
                className="animate-pulseSoft drop-shadow-[0_8px_18px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
              />
            </span>
          </div>
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
                <span className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-accent">
                  <IconLogo size={14} /> Kanbot · DeepSeek
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
                  className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-accent"
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
        <IconLogo size={32} className="shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={context?.openTask ? 'Pergunte sobre esta tarefa...' : 'Pergunte ou peca para criar/editar...'}
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
