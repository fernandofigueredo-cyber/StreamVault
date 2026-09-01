"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Tv, WifiOff } from "lucide-react";

/**
 * Shows a loading overlay while the server is warming up (Render Free cold start).
 * Disappears automatically as soon as the page content is ready.
 */
export default function ColdStartLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [slow, setSlow]       = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    // Already dismissed — hide immediately on navigation
    setDone(false);
    setVisible(false);
    setSlow(false);

    // Only show if the server takes more than 4 seconds
    const t1 = window.setTimeout(() => setVisible(true), 4000);
    const t2 = window.setTimeout(() => setSlow(true),    15000);

    // Hide as soon as the page becomes interactive (content painted)
    const hide = () => {
      setDone(true);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };

    // requestIdleCallback fires after the browser finishes rendering
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(hide, { timeout: 60000 });
      return () => {
        window.cancelIdleCallback(id);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    // Fallback for browsers without requestIdleCallback
    const w = window as Window;
    const onLoad = () => hide();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      w.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      w.removeEventListener("load", onLoad);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible || done) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-950/95 backdrop-blur-sm">
      <div className="flex max-w-xs flex-col items-center gap-4 rounded-3xl border border-white/10 bg-ink-900 p-8 text-center shadow-2xl">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/20 text-brand-300">
          {slow ? <WifiOff className="h-7 w-7" /> : <Tv className="h-7 w-7" />}
        </span>
        <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
        <div>
          <p className="text-base font-semibold text-white">
            {slow ? "A demorar mais que o normal…" : "A iniciar o servidor…"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {slow
              ? "O servidor estava inactivo. Aguarde mais uns segundos."
              : "Primeira visita após inactividade — só acontece uma vez."}
          </p>
        </div>
        {slow && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
