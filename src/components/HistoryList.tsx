"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Trash2 } from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { EmptyState, PosterTile, useFavorites } from "@/components/ui";
import { cn, formatDuration, relativeTime } from "@/lib/utils";

export default function HistoryList({ initialItems }: { initialItems: LibraryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [clearing, setClearing] = useState(false);
  const { toggle, pending } = useFavorites();

  async function removeItem(itemId: number) {
    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    const response = await fetch(`/api/history?itemId=${itemId}`, { method: "DELETE" });
    if (!response.ok) setItems(snapshot);
  }

  async function clearAll() {
    const snapshot = items;
    setClearing(true);
    setItems([]);
    const response = await fetch("/api/history", { method: "DELETE" });
    if (!response.ok) setItems(snapshot);
    setClearing(false);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Play className="h-6 w-6" />}
        title="Nothing watched yet"
        body="Start any channel, film or episode and StreamVault remembers your place here — including across devices."
        action={
          <Link
            href="/live"
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Browse live TV
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {items.length} item{items.length === 1 ? "" : "s"} · resume positions saved automatically
        </p>
        <button
          type="button"
          onClick={() => void clearAll()}
          disabled={clearing}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-60"
        >
          {clearing ? "Clearing…" : "Clear history"}
        </button>
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => {
          const percent =
            item.positionSecs && item.durationSecs
              ? Math.min(100, Math.round((item.positionSecs / item.durationSecs) * 100))
              : null;
          return (
            <li
              key={item.id}
              className="card flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15"
            >
              <Link href={`/watch/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <PosterTile item={item} />
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition hover:opacity-100">
                    <Play className="h-5 w-5 fill-current" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{item.name}</span>
                    {item.kind === "live" ? (
                      <span className="rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        live
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">
                    {item.groupTitle ?? item.genre ?? "—"}
                    {item.durationSecs ? ` · ${formatDuration(item.durationSecs)}` : ""}
                  </span>
                  {percent ? (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1 w-32 overflow-hidden rounded-full bg-white/15">
                        <span className="block h-full bg-accent-400" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="text-[11px] text-slate-500">{percent}% watched</span>
                    </span>
                  ) : null}
                </span>
              </Link>

              <span className="hidden text-right text-[11px] text-slate-500 sm:block">
                {relativeTime((item as LibraryItem & { updatedAt?: Date }).updatedAt ?? null)}
              </span>

              <button
                type="button"
                onClick={() =>
                  void toggle({ id: item.id, isFavorite: item.isFavorite }, (next) =>
                    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isFavorite: next } : row))),
                  )
                }
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10",
                  item.isFavorite ? "text-rose-400" : "text-slate-400",
                  pending[item.id] && "opacity-60",
                )}
                aria-label="Toggle favourite"
              >
                ♥
              </button>

              <Link
                href={`/watch/${item.id}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
                aria-label={`Resume ${item.name}`}
              >
                <Play className="h-4 w-4 fill-current" />
              </Link>

              <button
                type="button"
                onClick={() => void removeItem(item.id)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                aria-label="Remove from history"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
