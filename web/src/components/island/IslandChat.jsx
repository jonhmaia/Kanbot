import { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { invokeDesktop } from '../../lib/desktop';
import { IconClose, IconEye, IconLogo, IconSend } from '../../lib/icons';

export default function IslandChat({ watching, setWatching, frame, watchError, onClose, accent }) {
  const { messages, value, setValue, thinking, chips, send, userName } = useChat();
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const onSubmit = (text) => {
    send(text, { image: watching ? frame : null });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative">
            <IconLogo size={18} />
            <i
              className="island-status-dot absolute -bottom-0.5 -right-0.5"
              style={{ background: thinking ? accent : watching ? '#5B8CFF' : '#8FE3B0' }}
            />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">Kanbot</p>
            <p className="truncate text-[13px] text-chalk/90">{watching ? 'Vendo a tela' : thinking ? 'Pensando…' : 'Chat'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWatching(!watching)}
            className={
              'flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition ' +
              (watching ? 'text-[#111]' : 'text-dust hover:bg-white/[0.06] hover:text-chalk')
            }
            style={watching ? { background: accent } : undefined}
            aria-pressed={watching}
          >
            <IconEye size={12} />
            {watching ? 'Vendo' : 'Ver tela'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-dust transition hover:bg-white/[0.06] hover:text-chalk"
            aria-label="Recolher"
          >
            <IconClose size={14} />
          </button>
        </div>
      </header>

      {watchError && (
        <p className="px-3 pb-2 text-[11px] text-rose">{watchError}</p>
      )}

      <div ref={scroller} className="scroll-slim min-h-0 flex-1 space-y-2 overflow-y-auto px-3">
        {messages.length === 0 && (
          <p className="px-1 py-6 text-center text-[12px] text-smoke">
            Hey {userName}. Pergunte ou ligue Ver tela para eu enxergar o monitor.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              'rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ' +
              (message.role === 'user'
                ? 'ml-auto max-w-[88%] bg-white/[0.09] text-chalk'
                : 'border border-white/[0.06] bg-white/[0.03] text-dust backdrop-blur-sm')
            }
          >
            {message.role === 'bot' && (
              <span className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-smoke">
                <IconLogo size={12} /> Kanbot
              </span>
            )}
            {message.text}
            {message.sawScreen && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-smoke">
                <IconEye size={10} /> Com print da tela
              </p>
            )}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-1.5 px-1 py-2">
            {[0, 1, 2].map((d) => (
              <i
                key={d}
                className="h-1.5 w-1.5 animate-pulseSoft rounded-full"
                style={{ background: accent, animationDelay: d * 0.18 + 's' }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="scroll-slim flex gap-1.5 overflow-x-auto px-3 pt-2">
        {chips.slice(0, 4).map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSubmit(chip)}
            className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-dust transition-all hover:border-white/25 hover:text-chalk hover:shadow-[0_0_8px_rgba(255,255,255,0.06)]"
          >
            {chip}
          </button>
        ))}
      </div>

      {watching && frame && (
        <div className="px-3 pt-2">
          <img src={frame} alt="" className="h-14 w-full rounded-xl object-cover object-top opacity-90" />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-2 px-3 py-2.5"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={watching ? 'Pergunte sobre a tela...' : 'Pergunte ao Kanbot...'}
          className="island-input min-w-0 flex-1 rounded-full bg-white/[0.06] px-3 py-2 text-[13px] text-chalk outline-none transition placeholder:text-smoke"
        />
        <button
          type="submit"
          disabled={thinking || (!value.trim() && !(watching && frame))}
          className="grid h-9 w-9 place-items-center rounded-full text-[#111] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: accent }}
          aria-label="Enviar"
        >
          <IconSend size={14} />
        </button>
        <button
          type="button"
          onClick={() => invokeDesktop('show_main')}
          className="rounded-full px-2 py-1 text-[11px] text-smoke hover:text-chalk"
        >
          App
        </button>
      </form>
    </div>
  );
}
