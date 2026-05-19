"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls router.refresh() on a fixed interval while the tab is visible.
 * Pauses when the tab loses focus, resumes immediately on refocus.
 *
 * @param intervalMs  Milliseconds between refreshes (default 30 000).
 */
export function useAutoRefresh(intervalMs = 30_000) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervalMs);
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    start();

    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
}
