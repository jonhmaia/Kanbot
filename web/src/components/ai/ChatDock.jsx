import { useEffect, useRef } from 'react';
import { AssistantPanel } from '../dashboard/AiRail';
import { useChat } from '../../context/ChatContext';
import { IconClose, IconLogo, IconSpark } from '../../lib/icons';

export default function ChatDock() {
  const { open, setOpen, toggle, thinking, focusNonce } = useChat();
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

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-amber-btn shadow-lift transition hover:scale-[1.04] hover:brightness-110"
          aria-label="Abrir chat"
        >
          <IconLogo size={56} />
          {thinking && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulseSoft rounded-full bg-[#141415]" />}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat Kanbot"
          className="card grain fixed bottom-4 right-4 z-50 flex h-[min(680px,calc(100vh-5.5rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden p-4 shadow-lift sm:bottom-5 sm:right-5 sm:p-5"
        >
          <header className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-btn text-[#191100]">
                <IconSpark size={14} />
              </span>
              <div>
                <p className="text-[13px] text-chalk">Kanbot</p>
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-smoke">DeepSeek · chat</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:text-chalk"
              aria-label="Fechar chat"
            >
              <IconClose size={14} />
            </button>
          </header>
          <AssistantPanel compact={false} hideTitle />
        </div>
      )}
    </>
  );
}
