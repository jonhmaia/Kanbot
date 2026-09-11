import { IconDownload } from '../../lib/icons';
import { useUpdate } from '../../context/UpdateContext';
import { MenuPortal, useMenu } from '../ui/MenuPortal';

export default function UpdateBadge() {
  const { available, version, status, progress, install } = useUpdate();
  const menu = useMenu();

  if (!available) return null;

  const busy = status === 'downloading';
  const label = busy ? (progress ? `Baixando ${progress}%` : 'Baixando…') : 'Atualizacao disponivel';

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-amber/35 bg-amber/[0.12] text-amber transition hover:border-amber/55 hover:text-amber-soft"
        aria-label={label}
        title={label}
      >
        <IconDownload size={15} />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_0_2px_rgba(20,20,21,1)]" />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align="right"
        minWidth={240}
        role="dialog"
        className="p-3"
      >
        <p className="px-0.5 text-[11px] uppercase tracking-[0.14em] text-smoke">Atualizacao</p>
        <p className="mt-2 px-0.5 text-[13px] text-chalk/90">
          {version ? `Versao ${version} disponivel` : 'Uma versao nova esta pronta'}
        </p>
        <p className="mt-1 px-0.5 text-[12px] text-smoke">
          {busy ? 'O app reinicia sozinho ao terminar.' : 'Instala e reinicia o Kanbot.'}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            install();
          }}
          className="btn-primary mt-3 w-full justify-center"
        >
          {busy ? label : 'Instalar e reiniciar'}
        </button>
        {status === 'error' && (
          <p className="mt-2 px-0.5 text-[11.5px] text-amber-soft">Falhou. Tente de novo.</p>
        )}
      </MenuPortal>
    </>
  );
}
