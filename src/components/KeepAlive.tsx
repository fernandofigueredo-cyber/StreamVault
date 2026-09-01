"use client";

import { useEffect } from "react";

/**
 * Keeps the server warm with two strategies:
 * 1) Pings /api/health every 8 minutes while the tab is visible
 * 2) Pings immediately when the tab becomes visible again (user returns)
 * 
 * Render Free spins down after 15min of inactivity.
 * 8min interval ensures the server never sleeps during active use.
 */
export default function KeepAlive({ intervalMs = 8 * 60 * 1000 }: { intervalMs?: number }) {
  useEffect(() => {
    let stopped = false;

    const ping = async () => {
      if (stopped) return;
      try {
        await fetch("/api/health", { cache: "no-store", keepalive: true });
      } catch {
        /* offline — will retry on next interval */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void ping();
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void ping();
    }, intervalMs);

    document.addEventListener("visibilitychange", onVisibility);
    void ping();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return null;
}
