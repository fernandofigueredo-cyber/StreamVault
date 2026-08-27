"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Heart, Inbox, Loader2, Play, RefreshCw, Star } from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { cn, formatDuration, gradientFor, initialsOf } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-300", className)} />;
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/25">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-400">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-rose-300/30 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-rose-500/25"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card overflow-hidden rounded-2xl">
          <div className="skeleton aspect-video w-full" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PosterTile({
  item,
  className,
  label,
}: {
  item: Pick<LibraryItem, "name" | "kind">;
  className?: string;
  label?: string;
}) {
  const gradient = gradientFor(item.name);
  return (
    <div
      className={cn(
        "grid h-full w-full place-items-center bg-gradient-to-br text-white/90",
        gradient,
        className,
      )}
    >
      <div className="px-3 text-center">
        <span className="block text-2xl font-black tracking-tight drop-shadow-lg sm:text-3xl">
          {initialsOf(item.name)}
        </span>
        {label ? <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-white/70">{label}</span> : null}
      </div>
    </div>
  );
}

export function useFavorites() {
  const [pending, setPending] = useState<Record<number, boolean>>({});

  async function toggle(item: { id: number; isFavorite: boolean }, apply: (next: boolean) => void) {
    const next = !item.isFavorite;
    setPending((prev) => ({ ...prev, [item.id]: true }));
    apply(next);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { isFavorite: boolean };
      apply(data.isFavorite);
      const cached = JSON.parse(window.localStorage.getItem("streamvault.favorites") ?? "[]") as number[];
      const updated = data.isFavorite ? Array.from(new Set([...cached, item.id])) : cached.filter((id) => id !== item.id);
      window.localStorage.setItem("streamvault.favorites", JSON.stringify(updated));
    } catch {
      apply(!next);
    } finally {
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  }

  return { toggle, pending };
}

export function FavoriteButton({
  item,
  onToggle,
  pending,
  className,
}: {
  item: { id: number; isFavorite: boolean };
  onToggle: (item: { id: number; isFavorite: boolean }) => void;
  pending?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(item);
      }}
      aria-label={item.isFavorite ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/50 backdrop-blur transition hover:scale-105",
        item.isFavorite ? "text-rose-400" : "text-white/70",
        pending && "opacity-60",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", item.isFavorite && "fill-current")} />
    </button>
  );
}

export function MediaCard({
  item,
  href,
  onToggleFavorite,
  favoritePending,
  progress,
  badge,
  subtitle,
}: {
  item: LibraryItem;
  href: string;
  onToggleFavorite?: (item: { id: number; isFavorite: boolean }) => void;
  favoritePending?: boolean;
  progress?: number | null;
  badge?: string;
  subtitle?: string;
}) {
  const isLive = item.kind === "live";
  const progressPercent = useMemo(() => {
    if (!progress || !item.durationSecs) return null;
    return Math.min(100, Math.round((progress / item.durationSecs) * 100));
  }, [progress, item.durationSecs]);

  return (
    <div className="group relative">
      <Link
        href={href}
        className="card block overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-500/10"
      >
        <div className="relative aspect-video overflow-hidden bg-ink-800">
          {item.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.logo}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.03] group-hover:opacity-100"
            />
          ) : (
            <PosterTile item={item} label={isLive ? "live" : item.kind} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <span
            className={cn(
              "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur",
              isLive ? "bg-rose-500/90 text-white" : "bg-black/60 text-slate-200",
            )}
          >
            {badge ?? (isLive ? "live" : item.kind)}
          </span>

          {item.rating ? (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
              <Star className="h-3 w-3 fill-current" />
              {item.rating}
            </span>
          ) : null}

          <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-500/90 shadow-xl shadow-black/40">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </span>

          {progressPercent ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div className="h-full bg-accent-400" style={{ width: `${progressPercent}%` }} />
            </div>
          ) : null}
        </div>

        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-white">{item.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {subtitle ?? item.nowPlaying?.title ?? item.genre ?? item.groupTitle ?? "—"}
          </p>
          {item.nowPlaying ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-accent-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400" />
              until {new Date(item.nowPlaying.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : item.durationSecs ? (
            <p className="mt-1.5 text-[11px] text-slate-500">{formatDuration(item.durationSecs)}</p>
          ) : null}
        </div>
      </Link>

      {onToggleFavorite ? (
        <FavoriteButton
          item={{ id: item.id, isFavorite: item.isFavorite }}
          onToggle={onToggleFavorite}
          pending={favoritePending}
          className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100 focus:opacity-100 sm:opacity-0"
        />
      ) : null}
    </div>
  );
}

export function Rail({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="scrollbar-slim -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon ? <span className="text-brand-300">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
