"use client";

import { useEffect, useState } from "react";
import { Loader2, Tv, WifiOff } from "lucide-react";

/**
 * Shows a loading screen instantly in the browser while the server warms up.
 * On Render Free tier, the server can take up to 50s after inactivity.
 * This gives visual feedback immediately instead of a blank screen.
 */
export default function ColdStartLoader() {
  const [slow, setSlow] = useState(false);
  const [verySlow, setVerySlow] = useState(false);

  useEffect(() => {
    // After 3s without content, show "server warming up" message
    const t1 = window.setTimeout(() => setSlow(true), 3000);
    // After 15s, show more detailed message
    const t2 = window.setTimeout(() => setVerySlow(true), 15000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!slow) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-950/95 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/10 bg-ink-900 p-8 text-center shadow-2xl">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/20 text-brand-300">
          {verySlow ? <WifiOff className="h-7 w-7" /> : <Tv className="h-7 w-7" />}
        </span>
        <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
        <div>
          <p className="text-base font-semibold text-white">
            {verySlow ? "A demorar mais que o normal…" : "A iniciar o servidor…"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {verySlow
              ? "O servidor foi a dormir por inactividade. Aguarde mais uns segundos."
              : "O servidor estava inactivo e está a acordar. Isto acontece só na primeira visita."}
          </p>
        </div>
        {verySlow ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </div>
  );
}
