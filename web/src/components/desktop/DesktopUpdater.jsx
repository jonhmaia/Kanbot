import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isDesktop } from '../../lib/desktop';

export default function DesktopUpdater() {
  const { notify } = useApp();

  useEffect(() => {
    if (!isDesktop()) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { relaunch } = await import('@tauri-apps/plugin-process');
        const update = await check();
        if (!update || cancelled) return;
        notify('Atualizando…');
        await update.downloadAndInstall();
        if (!cancelled) await relaunch();
      } catch {
        /* build local ou sem release publica */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notify]);

  return null;
}
