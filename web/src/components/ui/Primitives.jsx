import { useEffect, useRef, useState } from 'react';
import { IconClose, IconExpand } from '../../lib/icons';
import { initialsOf } from '../../lib/format';

export { Dropdown, Select } from './Select';
export { DatePicker } from './DatePicker';

/* ------------------------------------------------------------------ Card */

export function Card({ className = '', children, expandable = false, onExpand, tone = 'default', ...props }) {
  const tones = {
    default: 'card',
    quiet: 'card-quiet',
    dark: 'relative rounded-4xl border border-white/[0.07] bg-[#121213] shadow-lift',
    ice: 'relative overflow-hidden rounded-4xl bg-ice-card text-[#0F2833] shadow-lift',
  };
  return (
    <section className={tones[tone] + ' ' + className} {...props}>
      {expandable && (
        <button type="button" className="expand-btn z-10" onClick={onExpand} aria-label="Expandir">
          <IconExpand size={13} />
        </button>
      )}
      {children}
    </section>
  );
}

export function CardHeader({ title, right, className = '' }) {
  return (
    <header className={'flex items-start justify-between gap-3 ' + className}>
      <h3 className="card-title">{title}</h3>
      {right}
    </header>
  );
}

/* ---------------------------------------------------------------- Avatar */

export function Avatar({ member, size = 28, ring = true, className = '' }) {
  const label = member?.initials || initialsOf(member?.name || '?');
  const presence = member?.presence;
  const presenceColor = presence === 'focusing' ? '#F5A524' : presence === 'away' ? '#6E7A85' : presence === 'available' ? '#8FE3B0' : null;
  return (
    <span
      className={
        'relative inline-grid shrink-0 place-items-center rounded-full font-medium leading-none ' +
        (ring ? 'ring-1 ring-white/15 ' : '') +
        className
      }
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: (member?.color || '#F5A524') + '2E',
        color: member?.color || '#F5A524',
      }}
      title={member?.name}
    >
      {label}
      {presenceColor && size >= 28 && (
        <i
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[#1a1a1b]"
          style={{ width: Math.max(6, size * 0.22), height: Math.max(6, size * 0.22), background: presenceColor }}
        />
      )}
    </span>
  );
}

export function AvatarStack({ members = [], max = 4, size = 24 }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <span key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }} className="rounded-full ring-2 ring-[#1a1a1b]">
          <Avatar member={m} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          style={{ marginLeft: -8, width: size, height: size, fontSize: size * 0.34 }}
          className="grid place-items-center rounded-full bg-white/10 text-dust ring-2 ring-[#1a1a1b]"
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Sheet */

const SHEET_EXIT_MS = 260;

/**
 * Painel lateral flutuante (nao encostado na borda, como os cards do app).
 *
 * Cuida do proprio ciclo de vida para conseguir animar a saida: enquanto
 * fecha, continua montado e renderiza um *snapshot* do conteudo. Sem esse
 * cache o titulo piscaria — a pagina zera o registro selecionado no mesmo
 * instante em que `open` vira false.
 */
export function Sheet({ open, onClose, title, subtitle, eyebrow, children, footer, width = 'sm:max-w-[480px]' }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const snapshot = useRef({ title, subtitle, eyebrow, children, footer });

  if (open) snapshot.current = { title, subtitle, eyebrow, children, footer };
  const view = open ? { title, subtitle, eyebrow, children, footer } : snapshot.current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        onClick={onClose}
        className={
          'absolute inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity duration-300 ' +
          (shown ? 'opacity-100' : 'opacity-0')
        }
      />

      <aside
        className={
          'absolute inset-y-3 right-3 left-3 flex flex-col overflow-hidden rounded-4xl border border-line bg-[#171718]/95 shadow-lift backdrop-blur-2xl ' +
          'transition-[transform,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] sm:left-auto sm:w-[calc(100%-1.5rem)] ' +
          width +
          (shown ? ' translate-x-0 opacity-100' : ' translate-x-8 opacity-0')
        }
      >
        {/* fio de luz na borda superior, como nos cards */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <header className="flex items-start justify-between gap-4 border-b border-lineSoft px-6 py-5">
          <div className="min-w-0">
            {view.eyebrow && (
              <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.16em] text-smoke">{view.eyebrow}</p>
            )}
            <h2 className="font-display text-[20px] leading-tight tracking-tight text-chalk">{view.title}</h2>
            {view.subtitle && <p className="mt-1 text-[12.5px] leading-relaxed text-smoke">{view.subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="expand-btn !static shrink-0" aria-label="Fechar">
            <IconClose size={14} />
          </button>
        </header>

        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-5">{view.children}</div>

        {view.footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-lineSoft bg-black/20 px-6 py-4">
            {view.footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-smoke">{hint}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={'relative h-7 w-12 shrink-0 rounded-full transition ' + (checked ? 'bg-amber' : 'bg-white/10')}
    >
      <i
        className={
          'absolute top-0.5 h-6 w-6 rounded-full bg-white transition ' + (checked ? 'left-5' : 'left-0.5')
        }
      />
    </button>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-white/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            'rounded-full px-3.5 py-1.5 text-[12.5px] transition ' +
            (value === o.value ? 'bg-white/[0.11] text-chalk' : 'text-smoke hover:text-dust')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  const tones = {
    info: 'border-line bg-[#1c1c1d] text-chalk',
    success: 'border-mint/30 bg-[#14231b] text-mint',
    warn: 'border-amber/30 bg-[#241d10] text-amber-soft',
  };
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      <div className={'animate-floatIn rounded-full border px-5 py-2.5 text-[13px] shadow-lift ' + tones[toast.tone]}>
        {toast.message}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line py-14 text-center">
      <div className="max-w-xs">
        <p className="font-display text-[16px] text-chalk">{title}</p>
        {description && <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
