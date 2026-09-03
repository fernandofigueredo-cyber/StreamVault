"use client";

import { ParentalSettings } from './parental/ParentalSettings';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eraser, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = {
  volume: "streamvault.player.volume",
  muted: "streamvault.player.muted",
  positions: "streamvault.player.positions",
  favorites: "streamvault.favorites",
  lastPlayed: "streamvault.player.lastPlayed",
  sidebar: "streamvault.sidebar.collapsed",
};

export default function SettingsPanel({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [defaultVolume, setDefaultVolume] = useState(1);
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [usage, setUsage] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(KEYS.volume));
    if (Number.isFinite(stored) && stored > 0) setDefaultVolume(stored);
    setUsage(
      Object.fromEntries(
        Object.entries(KEYS).map(([key, storageKey]) => {
          const raw = window.localStorage.getItem(storageKey) ?? "";
          return [key, raw ? `${raw.length} chars` : "empty"];
        }),
      ),
    );
  }, []);

  return (
    <div className="space-y-6">
    <ParentalSettings />
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400">Name</dt>
            <dd className="truncate font-medium text-white">{user.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400">Email</dt>
            <dd className="truncate font-medium text-white">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-slate-400">
          Authentication uses signed HTTP-only session cookies. Passwords are hashed with scrypt and a per-user salt.
        </p>
      </section>

      <section className="card rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Volume2 className="h-4 w-4 text-brand-300" /> Default player volume
        </h2>
        <p className="mt-1 text-xs text-slate-400">Applied whenever a new stream starts.</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={defaultVolume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setDefaultVolume(next);
              window.localStorage.setItem(KEYS.volume, String(next));
              window.localStorage.setItem(KEYS.muted, next === 0 ? "1" : "0");
              setSaved(true);
            }}
            className="flex-1"
          />
          <span className="w-12 text-right font-mono text-xs text-slate-300">
            {Math.round(defaultVolume * 100)}%
          </span>
        </div>
        {saved ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-accent-400">
            <Check className="h-3.5 w-3.5" /> Saved on this device
          </p>
        ) : null}
      </section>

      <section className="card rounded-2xl p-5 lg:col-span-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Eraser className="h-4 w-4 text-brand-300" /> Local storage
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Player volume, resume positions, the last-played marker and a favourites mirror are cached locally for
          instant loading. Clearing them never deletes server data.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(KEYS).map(([key, storageKey]) => (
            <div key={key} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <p className="font-mono text-[11px] text-slate-300">{storageKey}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{usage[key] ?? "—"}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            [KEYS.positions, KEYS.favorites, KEYS.lastPlayed].forEach((key) => window.localStorage.removeItem(key));
            setCleared(true);
            router.refresh();
          }}
          className={cn(
            "mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-rose-500/15 hover:text-rose-200",
            cleared && "border-emerald-400/30 text-emerald-200",
          )}
        >
          {cleared ? "Local cache cleared" : "Clear local playback cache"}
        </button>
      </section>
    </div>
  );
}
