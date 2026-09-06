import { useFocus } from '../../context/FocusContext';
import { isDesktop } from '../../lib/desktop';
import { IconCheck, IconNotch } from '../../lib/icons';
import { ISLAND_EDGES } from '../../lib/islandPrefs';
import { MenuPortal, useMenu } from '../ui/MenuPortal';

export default function NotchToggle() {
  const { prefs, setIslandPrefs } = useFocus();
  const menu = useMenu();
  if (!isDesktop()) return null;

  const visible = prefs.visible !== false;

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        className={
          'relative grid h-9 w-9 place-items-center rounded-full border bg-white/[0.05] transition hover:border-white/20 hover:text-chalk ' +
          (visible ? 'border-white/25 text-chalk' : 'border-line text-dust')
        }
        aria-label="Notch"
        title="Notch"
        aria-pressed={visible}
        aria-expanded={menu.open}
      >
        <IconNotch size={15} />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align="right"
        minWidth={220}
        role="menu"
        className="p-2"
      >
        <button
          type="button"
          onClick={() => {
            setIslandPrefs({ visible: !visible });
            menu.close();
          }}
          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] text-chalk transition hover:bg-white/[0.06]"
        >
          {visible ? 'Esconder notch' : 'Mostrar notch'}
        </button>
        <p className="px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-[0.14em] text-smoke">Posicao</p>
        {ISLAND_EDGES.map((item) => {
          const selected = prefs.edge === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIslandPrefs({ edge: item.id, visible: true });
                menu.close();
              }}
              className={
                'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] transition hover:bg-white/[0.06] ' +
                (selected ? 'text-chalk' : 'text-dust hover:text-chalk')
              }
            >
              {item.name}
              {selected && <IconCheck size={12} />}
            </button>
          );
        })}
      </MenuPortal>
    </>
  );
}
