'use client';

import { useEffect, useRef } from 'react';

const MIN_INTERVAL_MS = 120_000; // 2 minutes minimum to avoid SnapDeploy 100 req/min rate limits
const MIN_FOCUS_GAP_MS = 60_000; // Wait at least 60s before refetching on tab switch/focus
const ERROR_BACKOFF_MS = 300_000; // Back off 5 minutes after an API/rate-limit error

export function useAutoRefresh(
  refresh: () => Promise<void>,
  intervalMs = MIN_INTERVAL_MS,
  enabled = true
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    const effectiveIntervalMs = Math.max(intervalMs, MIN_INTERVAL_MS);
    let inFlight = false;
    let lastAttemptAt = Date.now();
    let backoffUntil = 0;

    const runRefresh = async (fromFocus = false) => {
      const now = Date.now();
      if (inFlight || document.visibilityState === 'hidden') return;
      if (now < backoffUntil) return;
      if (fromFocus && now - lastAttemptAt < MIN_FOCUS_GAP_MS) return;

      inFlight = true;
      lastAttemptAt = now;
      try {
        await refreshRef.current();
        backoffUntil = 0;
      } catch (error) {
        backoffUntil = Date.now() + ERROR_BACKOFF_MS;
        console.error('Automatic refresh failed (backing off for 5 minutes):', error);
      } finally {
        inFlight = false;
      }
    };

    const onFocus = () => void runRefresh(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runRefresh(true);
    };

    const interval = window.setInterval(() => void runRefresh(false), effectiveIntervalMs);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
