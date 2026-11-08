'use client';

import { useEffect, useRef } from 'react';

export function useAutoRefresh(
  refresh: () => Promise<void>,
  intervalMs = 30_000,
  enabled = true
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    let inFlight = false;
    const runRefresh = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await refreshRef.current();
      } catch (error) {
        console.error('Automatic refresh failed:', error);
      } finally {
        inFlight = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runRefresh();
    };

    const interval = window.setInterval(() => void runRefresh(), intervalMs);
    window.addEventListener('focus', runRefresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', runRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
