"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      .then(async (r) => {
        if (!r.ok) throw new Error("Não foi possível carregar.");
        return (await r.json()) as { items: LibraryItem[]; total: number; categories: CategoryRow[] };
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setCategories(data.categories ?? []);
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildUrl]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const r = await fetch(buildUrl(items.length));
      if (!r.ok) throw new Error("Não foi possível carregar mais.");
      const data = (await r.json()) as { items: LibraryItem[]; total: number };
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

  const kindTabs = mode === "favorites"
    ? ([["all", "Tudo"], ["live", "Ao vivo"], ["movie", "Filmes"], ["series", "Séries"]] as [Kind, string][])
    : null;

  const hasMore = items.length < total;

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Playlist filter */}
          {playlists.length > 1 ? (
            <div className="relative">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-8 text-sm text-slate-200 outline-none focus:border-brand-400/50"
              >
                <option value="all">Todas as listas</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filtrar${mode === "favorites" ? " favoritos" : ""}…`}
              className="w-44 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* ── Kind tabs (favorites only) ───────────────────────────────────── */}
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

      {/* ── Main layout: sidebar + grid ──────────────────────────────────── */}
      <div className={cn("grid gap-6", categories.length > 0 ? "lg:grid-cols-[220px_1fr]" : "")}>

        {/* Category sidebar */}
        {categories.length > 0 ? (
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto scrollbar-slim">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <LayoutGrid className="h-3.5 w-3.5" /> Categorias
            </div>
            {/* horizontal scroll on mobile, vertical on desktop */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible">
              <CategoryButton
                label="Todos os canais"
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

        {/* Content grid */}
        <div className="min-w-0 space-y-4">
          {error ? <ErrorNotice message={error} onRetry={() => setDebounced((v) => v + " ")} /> : null}

          {loading ? (
            <SkeletonGrid count={12} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={mode === "favorites" ? <Heart className="h-6 w-6" /> : <SlidersHorizontal className="h-6 w-6" />}
              title={
                query || category !== "all"
                  ? "Nenhum resultado para esses filtros"
                  : mode === "favorites"
                    ? "Nenhum favorito ainda"
                    : mode === "search"
                      ? "Nenhum resultado"
                      : "Biblioteca vazia"
              }
              body={
                query || category !== "all"
                  ? "Tente uma categoria ou termo diferente."
                  : mode === "favorites"
                    ? "Toque no coração de qualquer canal, filme ou episódio."
                    : "Importe uma lista M3U ou conecte um portal Xtream Codes."
              }
              action={
                mode !== "favorites" && mode !== "search" ? (
                  <Link
                    href="/playlists?import=1"
                    className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Importar lista
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Count bar */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {items.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}
                </span>
                {category !== "all" && (
                  <button
                    type="button"
                    onClick={() => setCategory("all")}
                    className="rounded-lg px-2 py-1 text-slate-400 hover:text-white transition"
                  >
                    ✕ limpar filtro
                  </button>
                )}
              </div>

              {/* Grid — square for live, 16:9 for VOD */}
              <div
                className={cn(
                  "grid gap-3",
                  initialKind === "live" || kind === "live"
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                )}
              >
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

              {/* Load more */}
              {hasMore ? (
                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {loadingMore ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                    Carregar mais ({(total - items.length).toLocaleString("pt-BR")} restantes)
                  </button>
                </div>
              ) : null}
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
          ? "border-brand-400/40 bg-brand-500/15 text-white font-medium"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("shrink-0 text-[11px]", active ? "text-brand-300" : "text-slate-500")}>
          {count.toLocaleString("pt-BR")}
        </span>
      ) : null}
    </button>
  );
}
