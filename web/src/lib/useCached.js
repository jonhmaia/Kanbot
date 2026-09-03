import { useCallback, useEffect, useState } from 'react';
import { cacheGet, cacheSet } from './cache';

/** Le o cache na hora e revalida em silencio — a tela nao volta para skeleton. */
export function useCached(key, fetcher) {
  const [data, setDataState] = useState(() => cacheGet(key));
  const [error, setError] = useState(null);

  const setData = useCallback(
    (next) => {
      setDataState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        if (value != null) cacheSet(key, value);
        return value;
      });
    },
    [key],
  );

  const reload = useCallback(async () => {
    const next = await fetcher();
    cacheSet(key, next);
    setDataState(next);
    setError(null);
    return next;
  }, [key, fetcher]);

  useEffect(() => {
    setDataState(cacheGet(key));
    setError(null);
  }, [key]);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((next) => {
        if (!alive) return;
        cacheSet(key, next);
        setDataState(next);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        if (cacheGet(key) == null) setError(e);
      });
    return () => {
      alive = false;
    };
  }, [key, fetcher]);

  return [data, setData, reload, error];
}
