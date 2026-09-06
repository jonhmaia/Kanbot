import { useFocus } from '../../context/FocusContext';
import { isDesktop } from '../../lib/desktop';
import { IconCheck, IconChevron, IconNotch } from '../../lib/icons';
import { ISLAND_EDGES } from '../../lib/islandPrefs';
import { MenuPortal, useMenu } from '../ui/MenuPortal';

export default function NotchToggle() {
  const { prefs, setIslandPrefs } = useFocus();
  const menu = useMenu();
  if (!isDesktop()) return null;

  const visible = prefs.visible !== false;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIslandPrefs({ visible: !visible })}
          className={
            'relative grid h-9 w-9 place-items-center rounded-full border bg-white/[0.05] transition hover:border-white/20 hover:text-chalk ' +
            (visible ? 'border-white/25 text-chalk' : 'border-line text-dust')
          }
          aria-label={visible ? 'Esconder notch' : 'Mostrar notch'}
          title={visible ? 'Esconder notch' : 'Mostrar notch'}
          aria-pressed={visible}
        >
          <IconNotch size={15} />
        </button>
        <button
          ref={menu.triggerRef}
          type="button"
          onClick={menu.toggle}
          className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border border-line bg-[#191919] text-dust hover:text-chalk"
          aria-label="Forma da notch"
          title="Forma da notch"
        >
          <IconChevron size={8} />
        </button>
      </div>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align="right"
        minWidth={200}
        role="menu"
        className="p-2"
      >
        <p className="px-1.5 pb-2 text-[11px] uppercase tracking-[0.14em] text-smoke">Forma</p>
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
