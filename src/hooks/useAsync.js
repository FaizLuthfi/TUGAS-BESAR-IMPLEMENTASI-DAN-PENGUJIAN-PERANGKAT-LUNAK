// src/hooks/useAsync.js
import { useCallback, useEffect, useRef, useState } from "react";

export function useAsync(fn, deps = [], { refreshOn = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);

  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fnRef.current();
      if (alive.current) setData(res?.data ?? res);
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (refreshOn.length === 0) return undefined;
    const onChange = (e) => {
      const key = e?.detail?.key;
      if (key === "*" || refreshOn.includes(key)) run(true);
    };
    window.addEventListener("wk99:storage", onChange);
    return () => window.removeEventListener("wk99:storage", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshOn.join("|")]);

  return { data, loading, error, reload: run, setData };
}