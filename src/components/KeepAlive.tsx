"use client";

import { useEffect } from "react";

/**
 * Keeps the workspace warm while a tab is open: pings /api/health on a fixed
 * interval (only while the tab is visible) so hosting platforms that idle-stop
 * processes are far less likely to take the player down mid-session.
 */
export default function KeepAlive({ intervalMs = 180000 }: { intervalMs?: number }) {
  useEffect(() => {
    let stopped = false;

    const ping = async () => {
      if (stopped) return;
      try {
        await fetch("/api/health", { cache: "no-store", keepalive: true });
      } catch {
        /* offline — try again on the next tick */
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
