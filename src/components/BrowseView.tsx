"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  LayoutGrid,
  ListFilter,
  RefreshCw,
  Search as SearchIcon,
  SlidersHorizontal,
  Tv,
} from "lucide-react";
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
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const firstRender = useRef(true);
  const catScrollRef = useRef<HTMLDivElement>(null);
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

  function selectCategory(name: string) {
    setCategory(name);
    setMobileCatOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const kindTabs = mode === "favorites"
    ? ([["all", "Tudo"], ["live", "Ao vivo"], ["movie", "Filmes"], ["series", "Séries"]] as [Kind, string][])
    : null;

  const hasMore = items.length < total;
  const isLiveView = initialKind === "live" || kind === "live";
  const activeCategory = categories.find((c) => c.name === category);

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-slate-400">{description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar…"
              className="w-44 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* ── Kind tabs (favorites only) ──────────────────────────────────── */}
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

      {/* ── Category bar: horizontal scroll on mobile / sidebar on desktop ── */}
      {categories.length > 0 ? (
        <>
          {/* Mobile: horizontal pill bar */}
          <div className="lg:hidden">
            <div
              ref={catScrollRef}
              className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
            >
              <button
                type="button"
                onClick={() => selectCategory("all")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition",
                  category === "all"
                    ? "border-brand-400/40 bg-brand-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-300",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Todos
                <span className="ml-0.5 text-[10px] text-slate-500">{total.toLocaleString("pt-BR")}</span>
              </button>
              {categories.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectCategory(row.name)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition",
                    category === row.name
                      ? "border-brand-400/40 bg-brand-500/20 text-white"
                      : "border-white/10 bg-white/5 text-slate-300",
                  )}
                >
                  {row.name}
                  <span className="text-[10px] text-slate-500">{row.itemCount.toLocaleString("pt-BR")}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: "Ver categorias" button (alternative for many categories) */}
          {categories.length > 8 ? (
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileCatOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-brand-300" />
                  {category === "all" ? "Todas as categorias" : category}
                  {activeCategory ? (
                    <span className="text-xs text-slate-500">({activeCategory.itemCount.toLocaleString("pt-BR")})</span>
                  ) : null}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── Mobile category drawer ──────────────────────────────────────── */}
      {mobileCatOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileCatOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-4 pb-8 animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Categorias</h2>
              <button
                type="button"
                onClick={() => setMobileCatOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectCategory("all")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition",
                  category === "all"
                    ? "border-brand-400/40 bg-brand-500/15 text-white"
                    : "border-white/8 bg-white/5 text-slate-300",
                )}
              >
                <span className="font-medium">Todos</span>
                <span className="text-xs text-slate-500">{total.toLocaleString("pt-BR")}</span>
              </button>
              {categories.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectCategory(row.name)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition",
                    category === row.name
                      ? "border-brand-400/40 bg-brand-500/15 text-white"
                      : "border-white/8 bg-white/5 text-slate-300",
                  )}
                >
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="ml-1 shrink-0 text-xs text-slate-500">{row.itemCount.toLocaleString("pt-BR")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className={cn("grid gap-6", categories.length > 0 ? "lg:grid-cols-[240px_1fr]" : "")}>

        {/* Desktop sidebar */}
        {categories.length > 0 ? (
          <aside className="scrollbar-slim hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <LayoutGrid className="h-3.5 w-3.5" /> Categorias
            </div>
            <div className="space-y-0.5">
              <SidebarCatBtn
                label="Todos os canais"
                count={total}
                active={category === "all"}
                onClick={() => selectCategory("all")}
                icon={<Tv className="h-3.5 w-3.5" />}
              />
              {categories.map((row) => (
                <SidebarCatBtn
                  key={row.id}
                  label={row.name}
                  count={row.itemCount}
                  active={category === row.name}
                  onClick={() => selectCategory(row.name)}
                />
              ))}
            </div>
          </aside>
        ) : null}

        {/* Content */}
        <div className="min-w-0 space-y-4">

          {/* Active category header */}
          {category !== "all" && !loading ? (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
                {category}
                {activeCategory ? ` · ${activeCategory.itemCount.toLocaleString("pt-BR")}` : ""}
              </span>
              <div className="h-px flex-1 bg-white/8" />
              <button
                type="button"
                onClick={() => selectCategory("all")}
                className="text-xs text-slate-500 transition hover:text-white"
              >
                ✕ limpar
              </button>
            </div>
          ) : null}

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
                    : "Importe uma lista M3U ou connecte um portal Xtream Codes."
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
              {/* Count */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{items.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}</span>
              </div>

              {/* Grid */}
              <div
                className={cn(
                  "grid gap-3",
                  isLiveView
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
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
                <div className="flex justify-center pt-2">
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

function SidebarCatBtn({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition",
        active
          ? "bg-brand-500/15 text-white ring-1 ring-brand-400/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span className={cn("shrink-0", active ? "text-brand-300" : "text-slate-600 group-hover:text-slate-400")}>
            {icon}
          </span>
        ) : (
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-brand-400" : "bg-slate-700 group-hover:bg-slate-500")} />
        )}
        <span className="truncate font-medium">{label}</span>
      </span>
      {typeof count === "number" ? (
        <span className={cn("shrink-0 text-[11px]", active ? "text-brand-300" : "text-slate-600")}>
          {count.toLocaleString("pt-BR")}
        </span>
      ) : null}
    </button>
  );
}
