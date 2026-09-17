import { useEffect, useRef } from 'react';
import AssistantPanel from './AssistantPanel';
import { useChat } from '../../context/ChatContext';
import { IconClose, IconLogo, IconPlus } from '../../lib/icons';

/**
 * Unico ponto de IA do app: o botao flutuante do assistente e o painel que ele abre.
 * Nenhuma outra tela deve renderizar chat proprio.
 */
export default function ChatDock() {
  const { open, setOpen, toggle, thinking, focusNonce, contextLabel, messages, reset } = useChat();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    const input = panelRef.current?.querySelector('input');
    input?.focus();
  }, [open, focusNonce]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center overflow-hidden rounded-full shadow-lift transition hover:scale-[1.04] hover:brightness-110"
        style={{ boxShadow: '0 16px 32px -14px color-mix(in srgb, var(--accent) 55%, transparent)' }}
        aria-label="Abrir assistente"
        title={'Assistente · ' + contextLabel}
      >
        <IconLogo size={56} />
        {thinking && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulseSoft rounded-full bg-[#141415]" />}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Assistente Kanbot"
      className="card grain fixed bottom-4 right-4 z-50 flex h-[min(680px,calc(100vh-5.5rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden p-4 shadow-lift sm:bottom-5 sm:right-5 sm:p-5"
    >
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconLogo size={32} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] text-chalk">Assistente</p>
            <p className="truncate text-[10.5px] uppercase tracking-[0.12em] text-smoke" title={contextLabel}>
              {contextLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:text-chalk"
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <IconPlus size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:text-chalk"
            aria-label="Fechar assistente"
          >
            <IconClose size={14} />
          </button>
        </div>
      </header>
      <AssistantPanel />
    </div>
  );
}
