/**
 * Server-side heartbeat. Started once when the Node server boots, it pings its
 * own health endpoint every three minutes. This keeps the PostgreSQL pool warm
 * and makes idle-based process reaping much less likely while the app has no
 * visitors.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const scope = globalThis as typeof globalThis & {
    __streamvaultHeartbeat?: ReturnType<typeof setInterval>;
  };
  if (scope.__streamvaultHeartbeat) return;

  const port = process.env.PORT ?? "3000";
  const url = `http://127.0.0.1:${port}/api/health`;

  const beat = async () => {
    try {
      await fetch(url, { cache: "no-store" });
    } catch {
      /* the server may still be booting — try again on the next beat */
    }
  };

  scope.__streamvaultHeartbeat = setInterval(() => void beat(), 180000);
  void beat();
}
