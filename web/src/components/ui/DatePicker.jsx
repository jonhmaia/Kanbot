import { useEffect, useMemo, useState } from 'react';
import { IconCalendar, IconChevron, IconChevronLeft, IconChevronRight } from '../../lib/icons';
import { TODAY, pad2 } from '../../lib/format';
import { MenuPortal, useMenu } from './MenuPortal';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function toISO(year, month, day) {
  return year + '-' + pad2(month + 1) + '-' + pad2(day);
}

function parseISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: month - 1, day };
}

function viewFrom(iso) {
  const parsed = parseISO(iso);
  if (parsed) return { year: parsed.year, month: parsed.month };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function shiftMonth(view, delta) {
  const d = new Date(view.year, view.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function buildCells(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDow; i += 1) {
    const day = daysInPrev - firstDow + 1 + i;
    const d = new Date(year, month - 1, day);
    cells.push({ iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()), day, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: toISO(year, month, day), day, outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, next);
    cells.push({ iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()), day: next, outside: true });
    next += 1;
  }
  return cells;
}

function formatPickerDate(iso) {
  const parsed = parseISO(iso);
  if (!parsed) return '';
  return parsed.day + ' ' + MONTHS_SHORT[parsed.month] + ' ' + parsed.year;
}

function moveIso(iso, days) {
  const parsed = parseISO(iso) || parseISO(TODAY);
  const d = new Date(parsed.year, parsed.month, parsed.day + days);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Sem data',
  allowClear = true,
  disabled = false,
  className = '',
}) {
  const menu = useMenu();
  const [view, setView] = useState(() => viewFrom(value));
  const [cursor, setCursor] = useState(value || TODAY);
  const cells = useMemo(() => buildCells(view.year, view.month), [view]);

  useEffect(() => {
    if (!menu.open) return;
    setView(viewFrom(value));
    setCursor(value || TODAY);
  }, [menu.open, value]);

  const commit = (iso) => {
    onChange?.(iso);
    menu.close();
  };

  const onKeyDown = (e) => {
    if (!menu.open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        menu.setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = moveIso(cursor, -1);
      setCursor(next);
      setView(viewFrom(next));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = moveIso(cursor, 1);
      setCursor(next);
      setView(viewFrom(next));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = moveIso(cursor, -7);
      setCursor(next);
      setView(viewFrom(next));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = moveIso(cursor, 7);
      setCursor(next);
      setView(viewFrom(next));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setView((v) => shiftMonth(v, -1));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setView((v) => shiftMonth(v, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(cursor);
    } else if (e.key === 'Backspace' && allowClear) {
      e.preventDefault();
      commit('');
    }
  };

  return (
    <div className={'relative w-full ' + className}>
      <button
        ref={menu.triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={value ? 'Data ' + formatPickerDate(value) : placeholder}
        onClick={menu.toggle}
        onKeyDown={onKeyDown}
        className={
          'field flex cursor-pointer items-center gap-2 text-left ' +
          (menu.open ? '!border-amber/50 !bg-white/[0.07]' : '') +
          (!value ? ' text-smoke' : '')
        }
      >
        <IconCalendar size={14} className="shrink-0 text-smoke" />
        <span className="min-w-0 flex-1 truncate">{value ? formatPickerDate(value) : placeholder}</span>
        <IconChevron size={14} className={'shrink-0 text-smoke transition-transform ' + (menu.open ? 'rotate-180' : '')} />
      </button>

      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        role="dialog"
        minWidth={292}
        className="w-[292px] p-3"
      >
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setView((v) => shiftMonth(v, -1))}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.04] text-dust transition hover:border-white/20 hover:text-chalk"
          >
            <IconChevronLeft size={14} />
          </button>
          <p className="min-w-0 flex-1 text-center font-display text-[14px] capitalize tracking-tight text-chalk">
            {MONTHS[view.month]} {view.year}
          </p>
          <button
            type="button"
            aria-label="Proximo mes"
            onClick={() => setView((v) => shiftMonth(v, 1))}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.04] text-dust transition hover:border-white/20 hover:text-chalk"
          >
            <IconChevronRight size={14} />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <span key={d + i} className="grid h-7 place-items-center text-[10px] uppercase tracking-[0.12em] text-smoke">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const selected = cell.iso === value;
            const today = cell.iso === TODAY;
            const focused = cell.iso === cursor;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => commit(cell.iso)}
                onMouseEnter={() => setCursor(cell.iso)}
                className={
                  'mx-auto grid h-9 w-9 place-items-center rounded-full text-[12.5px] outline-none transition ' +
                  (selected
                    ? 'bg-amber-btn font-semibold text-[#191100] shadow-amberGlow'
                    : today
                      ? 'text-amber ring-1 ring-amber/45'
                      : cell.outside
                        ? 'text-smoke/45 hover:bg-white/[0.05] hover:text-dust'
                        : 'text-dust hover:bg-white/[0.08] hover:text-chalk') +
                  (focused && !selected ? ' ring-1 ring-white/20' : '')
                }
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-lineSoft pt-2.5">
          {allowClear ? (
            <button
              type="button"
              onClick={() => commit('')}
              className="rounded-full px-2 py-1 text-[12px] text-smoke transition hover:text-chalk"
            >
              Limpar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => commit(TODAY)}
            className="rounded-full px-2.5 py-1 text-[12px] text-amber transition hover:bg-amber/10"
          >
            Hoje
          </button>
        </div>
      </MenuPortal>
    </div>
  );
}
