"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Registers the Service Worker and shows an "Install app" banner on
 * Android (beforeinstallprompt) and a manual tip on iOS Safari.
 */
export default function PwaInit() {
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => undefined);
    }

    // Already installed as PWA → nothing to show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return;

    const dismissed = window.localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    // Android / Chrome prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt?: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS tip (Safari doesn't fire beforeinstallprompt)
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) setShowIosTip(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    window.localStorage.setItem("pwa-banner-dismissed", "1");
    setInstallPrompt(null);
    setShowIosTip(false);
    setDismissed(true);
  }

  async function install() {
    if (!installPrompt?.prompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  if (dismissed) return null;

  // Android / Chrome banner
  if (installPrompt) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-300">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Instalar StreamVault</p>
          <p className="text-xs text-slate-400">Adicionar ao ecrã inicial como app</p>
        </div>
        <button
          onClick={() => void install()}
          className="shrink-0 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
        >
          Instalar
        </button>
        <button onClick={dismiss} className="shrink-0 text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // iOS Safari tip
  if (showIosTip) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/20 text-brand-300">
              <Download className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-white">Instalar no iPhone/iPad</p>
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Toque em{" "}
          <span className="font-semibold text-white">
            {"□↑"}
          </span>{" "}
          (partilhar) e depois em{" "}
          <span className="font-semibold text-white">"Adicionar ao ecrã de início"</span>
        </p>
      </div>
    );
  }

  return null;
}
