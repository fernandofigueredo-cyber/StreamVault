"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutGrid,
  LayoutList,
  ListFilter,
  RefreshCw,
  Search as SearchIcon,
  SlidersHorizontal,
  Tv,
  X,
} from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { EmptyState, ErrorNotice, MediaCard, SkeletonGrid, useFavorites } from "@/components/ui";
import { cn, gradientFor, initialsOf } from "@/lib/utils";

type CategoryRow = { id: number; name: string; itemCount: number };
type Mode = "library" | "favorites" | "search";
type Kind = "live" | "movie" | "series" | "all";

const PAGE_SIZE = 120; // bigger page so grouped view shows complete categories

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"default" | "name" | "recent">("default");
  const firstRender = useRef(true);
  const { toggle, pending } = useFavorites();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const buildUrl = useCallback(
    (offset: number, cat?: string) => {
      const params = new URLSearchParams({
        kind,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        withCategories: "1",
      });
      const activeCat = cat ?? category;
      if (mode !== "search") {
        if (activeCat !== "all") params.set("category", activeCat);
        if (playlistId !== "all") params.set("playlistId", playlistId);
      }
      if (mode === "favorites") params.set("favorites", "1");
      if (debounced.trim()) params.set("q", debounced.trim());
      return `/api/channels?${params.toString()}`;
    },
    [kind, category, playlistId, debounced, mode],
  );

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
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
    try {
      const r = await fetch(buildUrl(items.length));
      if (!r.ok) throw new Error("Erro ao carregar mais.");
      const data = (await r.json()) as { items: LibraryItem[]; total: number };
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch (err) { setError((err as Error).message); }
    finally { setLoadingMore(false); }
  }

  const onToggleFavorite = useCallback(
    (item: { id: number; isFavorite: boolean }) => {
      setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isFavorite: !r.isFavorite } : r));
      void toggle({ id: item.id, isFavorite: item.isFavorite }, (next) => {
        setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isFavorite: next } : r));
      });
    },
    [toggle],
  );

  const hrefFor = useCallback((item: LibraryItem) =>
    item.kind === "series" ? `/series/${item.id}` : `/watch/${item.id}`, []);

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

  // When "all" categories selected → group items by their groupTitle
  const showGrouped = category === "all" && !debounced.trim() && categories.length > 0;

  const grouped: { name: string; items: LibraryItem[] }[] = showGrouped
    ? (() => {
        const map = new Map<string, LibraryItem[]>();
        items.forEach((item) => {
          const key = item.groupTitle ?? "Sem categoria";
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(item);
        });
        // Sort groups by the order they appear in categories list
        const catOrder = categories.map((c) => c.name);
        return Array.from(map.entries())
          .sort(([a], [b]) => {
            const ai = catOrder.indexOf(a);
            const bi = catOrder.indexOf(b);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          })
          .map(([name, items]) => ({ name, items }));
      })()
    : [];

  const gridClass = cn(
    "grid gap-3",
    isLiveView
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  );

  function renderItems(items: LibraryItem[]) {
    if (viewMode === "list") {
      return (
        <ul className="space-y-2">
          {items.map((item) => {
            const href = item.kind === "series" ? `/series/${item.id}` : `/watch/${item.id}`;
            return (
              <li key={item.id} className="card group flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15">
                <Link href={href} className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                  {item.logo
                    ? <img src={item.logo} alt={item.name} className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                    : <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br text-xs font-bold text-white", gradientFor(item.name))}>{initialsOf(item.name)}</div>
                  }
                  {item.kind === "live" && <span className="absolute left-1 top-1 rounded bg-rose-500 px-1 py-0.5 text-[9px] font-bold text-white">AO VIVO</span>}
                </Link>
                <Link href={href} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{item.nowPlaying?.title ?? item.genre ?? item.groupTitle ?? "—"}</p>
                  {item.nowPlaying && <p className="mt-1 text-[11px] text-accent-400">até {new Date(item.nowPlaying.endsAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>}
                </Link>
                <button type="button"
                  onClick={() => { setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isFavorite: !r.isFavorite } : r)); void toggle({ id: item.id, isFavorite: item.isFavorite }, (next) => { setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isFavorite: next } : r)); }); }}
                  className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10", item.isFavorite ? "text-rose-400" : "text-slate-400")}>
                  <Heart className={cn("h-4 w-4", item.isFavorite && "fill-current")} />
                </button>
              </li>
            );
          })}
        </ul>
      );
    }
    return (
      <div className={gridClass}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            href={item.kind === "series" ? `/series/${item.id}` : `/watch/${item.id}`}
            onToggleFavorite={onToggleFavorite}
            favoritePending={pending[item.id]}
            progress={item.positionSecs}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
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

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "default" | "name" | "recent")}
            className="appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-400/50"
          >
            <option value="default">Ordem padrão</option>
            <option value="name">Por nome (A-Z)</option>
            <option value="recent">Recentemente vistos</option>
          </select>

          {/* View toggle */}
          <div className="flex rounded-xl border border-white/10 bg-black/30 p-0.5">
            <button type="button" onClick={() => setViewMode("grid")}
              className={cn("grid h-8 w-8 place-items-center rounded-lg transition",
                viewMode === "grid" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewMode("list")}
              className={cn("grid h-8 w-8 place-items-center rounded-lg transition",
                viewMode === "list" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white")}>
              <LayoutList className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar…"
              className="w-44 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* ── Kind tabs (favorites) ───────────────────────────────────── */}
      {kindTabs ? (
        <div className="flex flex-wrap gap-2">
          {kindTabs.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setKind(value)}
              className={cn("rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                kind === value ? "border-brand-400/40 bg-brand-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >{label}</button>
          ))}
        </div>
      ) : null}

      {/* ── Main layout: sidebar + content ─────────────────────────── */}
      <div className={cn("grid gap-6", categories.length > 0 ? "lg:grid-cols-[220px_1fr]" : "")}>

        {/* ── Sidebar desktop ─────────────────────────────────────── */}
        {categories.length > 0 ? (
          <aside className="scrollbar-slim hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <LayoutGrid className="h-3 w-3" /> Categorias
            </p>
            <nav className="space-y-0.5">
              <SidebarBtn
                label="Todos"
                count={total}
                active={category === "all"}
                onClick={() => selectCategory("all")}
                icon={<Tv className="h-3.5 w-3.5" />}
              />
              {categories.map((row) => (
                <SidebarBtn
                  key={row.id}
                  label={row.name}
                  count={row.itemCount}
                  active={category === row.name}
                  onClick={() => selectCategory(row.name)}
                />
              ))}
            </nav>
          </aside>
        ) : null}

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">

          {/* Mobile: pill bar (≤8 cats) */}
          {categories.length > 0 && categories.length <= 10 ? (
            <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden sm:-mx-6 sm:px-6">
              <PillBtn label="Todos" count={total} active={category === "all"} onClick={() => selectCategory("all")} />
              {categories.map((row) => (
                <PillBtn key={row.id} label={row.name} count={row.itemCount} active={category === row.name} onClick={() => selectCategory(row.name)} />
              ))}
            </div>
          ) : null}

          {/* Mobile: dropdown (>10 cats) */}
          {categories.length > 10 ? (
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileCatOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-brand-300" />
                  {category === "all" ? "Todas as categorias" : category}
                  {category !== "all" ? (
                    <span className="text-xs text-slate-500">
                      ({categories.find(c => c.name === category)?.itemCount?.toLocaleString("pt-BR") ?? ""})
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          ) : null}

          {/* Active filter pill (when a category is selected) */}
          {category !== "all" && !loading ? (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
                {category}
                {categories.find(c => c.name === category)
                  ? ` · ${categories.find(c => c.name === category)!.itemCount.toLocaleString("pt-BR")}`
                  : ""}
                <button type="button" onClick={() => selectCategory("all")} className="ml-1 text-slate-400 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </span>
              <div className="h-px flex-1 bg-white/8" />
            </div>
          ) : null}

          {error ? <ErrorNotice message={error} onRetry={() => setDebounced(v => v + " ")} /> : null}

          {loading ? (
            <SkeletonGrid count={12} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={mode === "favorites" ? <Heart className="h-6 w-6" /> : <SlidersHorizontal className="h-6 w-6" />}
              title={query || category !== "all" ? "Nenhum resultado" : mode === "favorites" ? "Nenhum favorito" : "Biblioteca vazia"}
              body={query || category !== "all" ? "Tente um termo ou categoria diferente." : mode === "favorites" ? "Toque no coração de qualquer item." : "Importe uma lista M3U ou Xtream Codes."}
              action={mode !== "favorites" && mode !== "search" ? (
                <Link href="/playlists?import=1" className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">
                  Importar lista
                </Link>
              ) : undefined}
            />
          ) : showGrouped ? (
            /* ── Grouped view: one section per category ── */
            <div className="space-y-10">
              {grouped.map((group) => (
                <CategorySection
                  key={group.name}
                  name={group.name}
                  items={group.items}
                  total={categories.find(c => c.name === group.name)?.itemCount ?? group.items.length}
                  gridClass={gridClass}
                  hrefFor={hrefFor}
                  onToggleFavorite={onToggleFavorite}
                  pending={pending}
                  onSelectCategory={selectCategory}
                />
              ))}

              {hasMore ? (
                <div className="flex justify-center">
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
            </div>
          ) : (
            /* ── Flat view: single category selected or search ── */
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {items.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}
              </p>
              {renderItems(items)}
              {hasMore ? (
                <div className="flex justify-center">
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
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile category drawer ─────────────────────────────────── */}
      {mobileCatOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileCatOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-4 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Categorias</h2>
              <button type="button" onClick={() => setMobileCatOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10">
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DrawerCatBtn label="Todos" count={total} active={category === "all"} onClick={() => selectCategory("all")} />
              {categories.map((row) => (
                <DrawerCatBtn key={row.id} label={row.name} count={row.itemCount} active={category === row.name} onClick={() => selectCategory(row.name)} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Category section (grouped view) ──────────────────────────────── */
function CategorySection({
  name,
  items,
  total,
  gridClass,
  hrefFor,
  onToggleFavorite,
  pending,
  onSelectCategory,
}: {
  name: string;
  items: LibraryItem[];
  total: number;
  gridClass: string;
  hrefFor: (item: LibraryItem) => string;
  onToggleFavorite: (item: { id: number; isFavorite: boolean }) => void;
  pending: Record<number, boolean>;
  onSelectCategory: (name: string) => void;
}) {
  return (
    <section>
      {/* Section header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/6" />
        <button
          type="button"
          onClick={() => onSelectCategory(name)}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-brand-400/40 hover:bg-brand-500/15 hover:text-brand-200"
        >
          <span>{name}</span>
          <span className="text-xs font-normal text-slate-500">{total.toLocaleString("pt-BR")}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-brand-300" />
        </button>
        <div className="h-px flex-1 bg-white/6" />
      </div>

      {/* Grid */}
      <div className={gridClass}>
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
    </section>
  );
}

/* ── Small UI pieces ───────────────────────────────────────────────── */
function SidebarBtn({
  label, count, active, onClick, icon,
}: {
  label: string; count?: number; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition",
        active ? "bg-brand-500/15 text-white ring-1 ring-brand-400/30" : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon
          ? <span className={cn("shrink-0", active ? "text-brand-300" : "text-slate-600 group-hover:text-slate-400")}>{icon}</span>
          : <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-brand-400" : "bg-slate-700 group-hover:bg-slate-500")} />
        }
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

function PillBtn({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition",
        active ? "border-brand-400/40 bg-brand-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
      )}
    >
      {label}
      {typeof count === "number" ? <span className="text-[10px] text-slate-500">{count.toLocaleString("pt-BR")}</span> : null}
    </button>
  );
}

function DrawerCatBtn({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition",
        active ? "border-brand-400/40 bg-brand-500/15 text-white" : "border-white/8 bg-white/5 text-slate-300 hover:bg-white/10",
      )}
    >
      <span className="truncate font-medium">{label}</span>
      {typeof count === "number" ? <span className="ml-1 shrink-0 text-xs text-slate-500">{count.toLocaleString("pt-BR")}</span> : null}
    </button>
  );
}
