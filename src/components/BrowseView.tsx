"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, LayoutGrid, ListFilter, RefreshCw, Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { EmptyState, ErrorNotice, MediaCard, SkeletonGrid, useFavorites } from "@/components/ui";
import { cn } from "@/lib/utils";

type CategoryRow = { id: number; name: string; itemCount: number };
type Mode = "library" | "favorites" | "search";
type Kind = "live" | "movie" | "series" | "all";

const PAGE_SIZE = 60;

export default function BrowseView({
  mode = "library",
  initialKind,
  title,
  description,
  initialItems,
  initialCategories,
  initialTotal,
  playlists,
  initialQuery = "",
  initialCategory = "all",
}: {
  mode?: Mode;
  initialKind: Kind;
  title: string;
  description?: string;
  initialItems: LibraryItem[];
  initialCategories: CategoryRow[];
  initialTotal: number;
  playlists: { id: number; name: string }[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [category, setCategory] = useState(initialCategory);
  const [playlistId, setPlaylistId] = useState("all");
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRender = useRef(true);
  const { toggle, pending } = useFavorites();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        kind,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        withCategories: "1",
      });
      if (mode !== "search") {
        if (category !== "all") params.set("category", category);
        if (playlistId !== "all") params.set("playlistId", playlistId);
      }
      if (mode === "favorites") params.set("favorites", "1");
      if (debounced.trim()) params.set("q", debounced.trim());
      return `/api/channels?${params.toString()}`;
    },
    [kind, category, playlistId, debounced, mode],
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(buildUrl(0))
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the library.");
        return (await response.json()) as { items: LibraryItem[]; total: number; categories: CategoryRow[] };
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setCategories(data.categories ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildUrl]);

  const hasMore = items.length < total;

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(buildUrl(items.length));
      if (!response.ok) throw new Error("Could not load more items.");
      const data = (await response.json()) as { items: LibraryItem[]; total: number };
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const onToggleFavorite = useCallback(
    (item: { id: number; isFavorite: boolean }) => {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, isFavorite: !row.isFavorite } : row)),
      );
      void toggle({ id: item.id, isFavorite: item.isFavorite }, (next) => {
        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isFavorite: next } : row)));
      });
    },
    [toggle],
  );

  const hrefFor = useCallback((item: LibraryItem) => {
    if (item.kind === "series") return `/series/${item.id}`;
    return `/watch/${item.id}`;
  }, []);

  const kindTabs = mode === "favorites" ? ([
    ["all", "Everything"],
    ["live", "Live"],
    ["movie", "Movies"],
    ["series", "Series"],
  ] as [Kind, string][]) : null;

  const activeFilters = useMemo(
    () => (category !== "all" ? 1 : 0) + (playlistId !== "all" ? 1 : 0) + (debounced ? 1 : 0),
    [category, playlistId, debounced],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${mode === "favorites" ? "favourites" : "library"}…`}
              className="w-44 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
            />
          </div>
          {playlists.length > 1 ? (
            <div className="relative hidden sm:block">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={playlistId}
                onChange={(event) => setPlaylistId(event.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-8 text-sm text-slate-200 outline-none focus:border-brand-400/50"
              >
                <option value="all">All playlists</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {kindTabs ? (
        <div className="flex flex-wrap gap-2">
          {kindTabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                kind === value
                  ? "border-brand-400/40 bg-brand-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {categories.length > 0 ? (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <LayoutGrid className="h-3.5 w-3.5" /> Categories
            </div>
            <div className="scrollbar-slim flex gap-2 overflow-x-auto pb-2 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto">
              <CategoryButton
                label="All channels"
                count={total}
                active={category === "all"}
                onClick={() => setCategory("all")}
              />
              {categories.map((row) => (
                <CategoryButton
                  key={row.id}
                  label={row.name}
                  count={row.itemCount}
                  active={category === row.name}
                  onClick={() => setCategory(row.name)}
                />
              ))}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 space-y-4">
          {error ? <ErrorNotice message={error} onRetry={() => setDebounced((prev) => `${prev}`)} /> : null}

          {loading ? (
            <SkeletonGrid count={10} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={mode === "favorites" ? <Heart className="h-6 w-6" /> : <SlidersHorizontal className="h-6 w-6" />}
              title={
                activeFilters > 0
                  ? "Nothing matches those filters"
                  : mode === "favorites"
                    ? "No favourites yet"
                    : mode === "search"
                      ? "No results for that search"
                      : "This library is empty"
              }
              body={
                activeFilters > 0
                  ? "Try a different category, playlist or search term."
                  : mode === "favorites"
                    ? "Tap the heart on any channel, movie or episode and it will show up here instantly."
                    : mode === "search"
                      ? "Search runs across every channel, film and episode in all of your imported playlists."
                      : "Import an M3U playlist or connect an Xtream Codes portal to fill your library."
              }
              action={
                <Link
                  href="/playlists?import=1"
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Import a playlist
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {items.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    href={hrefFor(item)}
                    onToggleFavorite={onToggleFavorite}
                    favoritePending={pending[item.id]}
                    progress={item.positionSecs}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                <span>
                  Showing {items.length} of {total}
                </span>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {loadingMore ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                    Load more
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition lg:w-full",
        active
          ? "border-brand-400/40 bg-brand-500/15 text-white"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" ? <span className="text-[11px] text-slate-500">{count}</span> : null}
    </button>
  );
}
