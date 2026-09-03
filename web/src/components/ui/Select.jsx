import { useEffect, useState } from 'react';
import { IconCheck, IconChevron } from '../../lib/icons';
import { MenuItem, MenuPortal, useMenu } from './MenuPortal';

function useActiveIndex(open, value, options) {
  const [active, setActive] = useState(0);
  const selected = options.findIndex((o) => o.value === value);
  const selectedSafe = selected >= 0 ? selected : 0;

  useEffect(() => {
    if (open) setActive(selectedSafe);
  }, [open, selectedSafe]);

  return [active, setActive];
}

function OptionRow({ option, selected }) {
  return (
    <>
      {option.dot && <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: option.dot }} />}
      {option.icon}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.hint && <span className="shrink-0 text-[10px] uppercase tracking-wider text-smoke">{option.hint}</span>}
      {selected && <IconCheck size={13} className="shrink-0 text-amber" />}
    </>
  );
}

function onListKey(e, { open, setOpen, active, setActive, options, onChange, close }) {
  if (!open) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive((i) => Math.min(options.length - 1, i + 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive((i) => Math.max(0, i - 1));
  } else if (e.key === 'Home') {
    e.preventDefault();
    setActive(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    setActive(options.length - 1);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const next = options[active];
    if (next) {
      onChange?.(next.value);
      close();
    }
  }
}

function pick(option, onChange, close) {
  onChange?.(option.value);
  close();
}

/* Filtros da toolbar: botao ghost + menu. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  icon = null,
  align = 'right',
  className = '',
  triggerClassName = 'btn-ghost !px-4 !py-2 whitespace-nowrap',
  disabled = false,
  footer = null,
}) {
  const menu = useMenu();
  const [active, setActive] = useActiveIndex(menu.open, value, options);
  const current = options.find((o) => o.value === value);

  return (
    <div className={'relative ' + className}>
      <button
        ref={menu.triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        onClick={menu.toggle}
        onKeyDown={(e) => onListKey(e, { ...menu, active, setActive, options, onChange })}
        className={triggerClassName + ' cursor-pointer'}
      >
        {icon}
        <span className="max-w-[180px] truncate text-[13px]">{current?.label || label}</span>
        <IconChevron size={13} className={'shrink-0 text-smoke transition-transform ' + (menu.open ? 'rotate-180' : '')} />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align={align}
        className="min-w-[190px] p-1.5"
      >
        <div className="scroll-slim max-h-[280px] overflow-y-auto">
          {options.map((o, i) => (
            <MenuItem
              key={String(o.value)}
              active={i === active}
              selected={o.value === value}
              onHover={() => setActive(i)}
              onClick={() => pick(o, onChange, menu.close)}
            >
              <OptionRow option={o} selected={o.value === value} />
            </MenuItem>
          ))}
        </div>
        {footer ? (
          <div className="mt-1 border-t border-white/[0.06] pt-1">
            {typeof footer === 'function' ? footer(menu.close) : footer}
          </div>
        ) : null}
      </MenuPortal>
    </div>
  );
}

/* Select de formulario: mesmo visual dos .field. */
export function Select({
  value,
  options,
  onChange,
  placeholder = 'Selecionar',
  icon = null,
  align = 'left',
  className = '',
  disabled = false,
}) {
  const menu = useMenu();
  const [active, setActive] = useActiveIndex(menu.open, value, options);
  const current = options.find((o) => o.value === value);
  const empty = current == null;

  return (
    <div className={'relative w-full ' + className}>
      <button
        ref={menu.triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        onClick={menu.toggle}
        onKeyDown={(e) => onListKey(e, { ...menu, active, setActive, options, onChange })}
        className={
          'field flex cursor-pointer items-center gap-2 text-left ' +
          (menu.open ? '!border-amber/50 !bg-white/[0.07]' : '') +
          (empty ? ' text-smoke' : '')
        }
      >
        {icon}
        {current?.dot && <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: current.dot }} />}
        <span className="min-w-0 flex-1 truncate">{current?.label || placeholder}</span>
        <IconChevron size={14} className={'shrink-0 text-smoke transition-transform ' + (menu.open ? 'rotate-180' : '')} />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align={align}
        matchWidth
        className="p-1.5"
      >
        <div className="scroll-slim max-h-[280px] overflow-y-auto">
          {options.map((o, i) => (
            <MenuItem
              key={String(o.value)}
              active={i === active}
              selected={o.value === value}
              onHover={() => setActive(i)}
              onClick={() => pick(o, onChange, menu.close)}
            >
              <OptionRow option={o} selected={o.value === value} />
            </MenuItem>
          ))}
        </div>
      </MenuPortal>
    </div>
  );
}
