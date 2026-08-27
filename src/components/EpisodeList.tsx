"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DownloadCloud, Heart, Loader2, Play } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

export type EpisodeRow = {
  id: number;
  name: string;
  season: number | null;
  episode: number | null;
  plot: string | null;
  durationSecs: number | null;
  isFavorite: boolean;
  positionSecs: number | null;
};

export default function EpisodeList({
  episodes,
  canLoadEpisodes = false,
  seriesId,
}: {
  episodes: EpisodeRow[];
  canLoadEpisodes?: boolean;
  seriesId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEpisodes() {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/series/${seriesId}/episodes`, { method: "POST" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not load episodes.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const seasons = useMemo(() => {
    const map = new Map<number, EpisodeRow[]>();
    episodes.forEach((episode) => {
      const key = episode.season ?? 1;
      map.set(key, [...(map.get(key) ?? []), episode]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [episodes]);

  const [activeSeason, setActiveSeason] = useState(seasons[0]?.[0] ?? 1);
  const [favorites, setFavorites] = useState<Record<number, boolean>>(
    Object.fromEntries(episodes.map((episode) => [episode.id, episode.isFavorite])),
  );
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const visible = seasons.find(([season]) => season === activeSeason)?.[1] ?? [];

  async function toggleFavorite(episode: EpisodeRow) {
    const next = !favorites[episode.id];
    setFavorites((prev) => ({ ...prev, [episode.id]: next }));
    setPending((prev) => ({ ...prev, [episode.id]: true }));
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: episode.id }),
      });
      if (response.ok) {
        const data = (await response.json()) as { isFavorite: boolean };
        setFavorites((prev) => ({ ...prev, [episode.id]: data.isFavorite }));
      } else {
        setFavorites((prev) => ({ ...prev, [episode.id]: !next }));
      }
    } catch {
      setFavorites((prev) => ({ ...prev, [episode.id]: !next }));
    } finally {
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[episode.id];
        return copy;
      });
    }
  }

  if (episodes.length === 0) {
    return (
      <div className="card space-y-3 rounded-2xl p-6 text-sm text-slate-400">
        <p>
          Episodes are loaded on demand so that importing hundreds of thousands of entries stays fast — this series
          has none stored yet.
        </p>
        {canLoadEpisodes ? (
          <button
            type="button"
            onClick={() => void loadEpisodes()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            {loading ? "Loading from portal…" : "Load episodes from the portal"}
          </button>
        ) : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seasons.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {seasons.map(([season, list]) => (
            <button
              key={season}
              type="button"
              onClick={() => setActiveSeason(season)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                activeSeason === season
                  ? "border-brand-400/40 bg-brand-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              Season {season} · {list.length}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {visible.map((episode) => {
          const percent =
            episode.positionSecs && episode.durationSecs
              ? Math.min(100, Math.round((episode.positionSecs / episode.durationSecs) * 100))
              : null;
          return (
            <li key={episode.id} className="card group flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15">
              <Link
                href={`/watch/${episode.id}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-500 group-hover:text-white"
              >
                <Play className="h-5 w-5 fill-current" />
              </Link>
              <Link href={`/watch/${episode.id}`} className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    S{String(episode.season ?? 1).padStart(2, "0")}E{String(episode.episode ?? 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-semibold text-white">{episode.name}</span>
                  {episode.durationSecs ? (
                    <span className="text-[11px] text-slate-500">{formatDuration(episode.durationSecs)}</span>
                  ) : null}
                </span>
                {episode.plot ? (
                  <span className="mt-1 block line-clamp-2 text-xs text-slate-400">{episode.plot}</span>
                ) : null}
                {percent ? (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 w-28 overflow-hidden rounded-full bg-white/15">
                      <span className="block h-full bg-accent-400" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="text-[11px] text-slate-500">{percent}%</span>
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => void toggleFavorite(episode)}
                disabled={pending[episode.id]}
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-60",
                  favorites[episode.id] ? "text-rose-400" : "text-slate-400",
                )}
                aria-label="Toggle favourite"
              >
                <Heart className={cn("h-4 w-4", favorites[episode.id] && "fill-current")} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
