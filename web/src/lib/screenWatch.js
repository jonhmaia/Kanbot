import { useEffect, useRef, useState } from 'react';
import { invokeDesktop, isDesktop } from './desktop';

export function useScreenWatch(active) {
  const [frame, setFrame] = useState(null);
  const [error, setError] = useState(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) return undefined;
    if (!isDesktop()) {
      setError('A visao da tela so existe no app desktop.');
      return undefined;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const url = await invokeDesktop('capture_screen');
        if (cancelled || !activeRef.current) return;
        if (typeof url === 'string' && url.startsWith('data:image')) {
          setFrame(url);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Nao consegui ver a tela.');
      }
    };

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);

  return { frame, error };
}
