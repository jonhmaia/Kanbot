import { useCallback, useEffect, useState } from 'react';
import { cacheGet, cacheSet, subscribeWorkspace } from './cache';

/** Le o cache na hora e revalida em silencio — a tela nao volta para skeleton. */
export function useCached(key, fetcher) {
  const [data, setDataState] = useState(() => cacheGet(key));
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(() => cacheGet(key) == null);

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
    setPending(true);
    try {
      const next = await fetcher();
      cacheSet(key, next);
      setDataState(next);
      setError(null);
      return next;
    } finally {
      setPending(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    setDataState(cacheGet(key));
    setError(null);
    setPending(cacheGet(key) == null);
  }, [key]);

  useEffect(() => {
    let alive = true;
    setPending(true);
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
      })
      .finally(() => {
        if (alive) setPending(false);
      });
    return () => {
      alive = false;
    };
  }, [key, fetcher]);

  useEffect(() => {
    return subscribeWorkspace(() => {
      reload().catch(() => {});
    });
  }, [reload]);

  const loading = data == null && !error;
  const refreshing = pending && data != null;

  return [data, setData, reload, error, { loading, refreshing, pending }];
}
