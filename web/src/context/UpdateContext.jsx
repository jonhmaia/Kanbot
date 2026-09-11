import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isDesktop } from '../lib/desktop';
import { useApp } from './AppContext';

const UpdateContext = createContext(null);
const CHECK_EVERY = 45 * 60 * 1000;

export function UpdateProvider({ children }) {
  const { notify } = useApp();
  const updateRef = useRef(null);
  const installing = useRef(false);
  const [version, setVersion] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);

  const available = status === 'available' || status === 'downloading' || status === 'error';

  const inspect = useCallback(async () => {
    if (!isDesktop()) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        updateRef.current = null;
        setVersion(null);
        setStatus((current) => (current === 'downloading' ? current : 'idle'));
        return;
      }
      updateRef.current = update;
      setVersion(update.version);
      setStatus((current) => (current === 'downloading' ? current : 'available'));
    } catch {
      /* build local ou sem release publica */
    }
  }, []);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update || installing.current) return;
    installing.current = true;
    setStatus('downloading');
    setProgress(0);
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data?.contentLength || 0;
        if (event.event === 'Progress') {
          downloaded += event.data?.chunkLength || 0;
          if (total) setProgress(Math.min(99, Math.round((downloaded / total) * 100)));
        }
        if (event.event === 'Finished') setProgress(100);
      });
      notify('Reiniciando…');
      await relaunch();
    } catch (error) {
      installing.current = false;
      setStatus('error');
      notify(error?.message || 'Nao consegui instalar a atualizacao', 'warn');
    }
  }, [notify]);

  useEffect(() => {
    if (!isDesktop()) return undefined;
    inspect();
    const id = window.setInterval(inspect, CHECK_EVERY);
    const onVis = () => {
      if (document.visibilityState === 'visible') inspect();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [inspect]);

  const value = useMemo(
    () => ({ available, version, status, progress, install }),
    [available, version, status, progress, install],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdate() {
  return (
    useContext(UpdateContext) || {
      available: false,
      version: null,
      status: 'idle',
      progress: 0,
      install: () => {},
    }
  );
}
