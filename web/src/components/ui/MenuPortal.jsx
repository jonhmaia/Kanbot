import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const PAD = 10;

function place(trigger, panel, { align, matchWidth, minWidth }) {
  const t = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ph = panel?.offsetHeight ?? 0;
  const width = matchWidth ? Math.max(t.width, minWidth) : undefined;
  const pw = panel?.offsetWidth || width || minWidth;

  const spaceBelow = vh - t.bottom - PAD;
  const spaceAbove = t.top - PAD;
  const below = ph === 0 || spaceBelow >= Math.min(ph, spaceAbove) || spaceBelow >= spaceAbove;

  let top = below ? t.bottom + GAP : t.top - GAP - ph;
  top = Math.max(PAD, Math.min(top, vh - (ph || 0) - PAD));

  let left = align === 'right' ? t.right - pw : t.left;
  left = Math.max(PAD, Math.min(left, vw - pw - PAD));

  return { top, left, width };
}

export function useMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return { open, setOpen, toggle, close, triggerRef, panelRef };
}

/**
 * Painel flutuante no body — nao e recortado por overflow dos sheets.
 */
export function MenuPortal({
  open,
  onClose,
  triggerRef,
  panelRef,
  align = 'left',
  matchWidth = false,
  minWidth = 190,
  role = 'listbox',
  className = '',
  children,
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: undefined });
  const optsRef = useRef({ align, matchWidth, minWidth });
  optsRef.current = { align, matchWidth, minWidth };

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPos(place(trigger, panelRef.current, optsRef.current));
  }, [triggerRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    update();
    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [open, update, children]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, onClose, update, triggerRef, panelRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 80 }}
      className={
        'animate-floatIn overflow-hidden rounded-2xl border border-line bg-[#191919]/95 shadow-lift backdrop-blur-2xl ' +
        className
      }
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  active = false,
  selected = false,
  disabled = false,
  onClick,
  onHover,
  children,
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-active={active || undefined}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onHover}
      className={
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition disabled:opacity-40 ' +
        (active ? 'bg-white/[0.09] text-chalk' : selected ? 'bg-white/[0.05] text-chalk' : 'text-dust hover:bg-white/[0.05] hover:text-chalk')
      }
    >
      {children}
    </button>
  );
}
