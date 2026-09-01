import Link from "next/link";
import { Clapperboard, ListVideo, PlayCircle, Radio, Sparkles, Tv } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getLiveNow,
  getLibraryStats,
  listFavorites,
  listHistory,
  listLibrary,
  listPlaylists,
} from "@/lib/queries";
import { StatCard } from "@/components/ui";
import ItemRail, { FavoritesHint } from "@/components/ItemRail";
import LoadDemoButton from "@/components/LoadDemoButton";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // Run critical-path queries first, defer rails to avoid blocking initial render
  const [stats, playlists] = await Promise.all([
    getLibraryStats(user.id),
    listPlaylists(user.id),
  ]);
  const hasContent = stats.total > 0;
  const [history, favorites, liveNow, series, movies] = hasContent
    ? await Promise.all([
        listHistory(user.id, 10),
        listFavorites(user.id, 10),
        getLiveNow(user.id, 10),
        listLibrary(user.id, { kind: "series", limit: 10 }),
        listLibrary(user.id, { kind: "movie", limit: 10 }),
      ])
    : [[], [], [], { items: [] }, { items: [] }];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-brand-300">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Good to see you, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {hasContent
              ? `${stats.total.toLocaleString()} items ready across ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}.`
              : "Let's get your first playlist imported."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/live"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <Radio className="h-4 w-4 text-accent-400" /> Live TV
          </Link>
          <Link
            href="/playlists?import=1"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <ListVideo className="h-4 w-4" /> Import playlist
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Live channels" value={stats.live} hint="Streaming now" icon={<Radio className="h-4 w-4" />} />
        <StatCard label="Movies" value={stats.movies} hint="Video on demand" icon={<Clapperboard className="h-4 w-4" />} />
        <StatCard label="Series" value={stats.series} hint={`${stats.episodes} episodes`} icon={<Tv className="h-4 w-4" />} />
        <StatCard label="Favourites" value={stats.favorites} hint="Pinned by you" icon={<Sparkles className="h-4 w-4" />} />
        <StatCard
          label="Playlists"
          value={stats.playlists}
          hint={playlists.filter((p) => p.status === "ready").length + " healthy"}
          icon={<ListVideo className="h-4 w-4" />}
        />
      </div>

      {!hasContent ? (
        <div className="card rounded-3xl p-8 text-center">
          <PlayCircle className="mx-auto h-12 w-12 text-brand-300" />
          <h2 className="mt-4 text-lg font-semibold text-white">Your library is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Add an M3U/M3U8 URL, upload a playlist file, or sign in with Xtream Codes credentials. StreamVault
            parses categories, movies and series for you.
          </p>
          <Link
            href="/playlists?import=1"
            className="mt-5 inline-flex rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Import your first playlist
          </Link>
          <div className="mt-3">
            <LoadDemoButton />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <ItemRail
            title="Continue watching"
            subtitle="Resume exactly where you left off"
            items={history}
            moreHref="/history"
            moreLabel="Full history"
          />

          <ItemRail
            title="Live right now"
            subtitle="Channels from your live TV categories"
            items={liveNow}
            moreHref="/live"
            moreLabel="All channels"
          />

          <ItemRail
            title="Your favourites"
            subtitle="Synced to your account and this device"
            items={favorites}
            moreHref="/favorites"
            moreLabel="Manage"
            emptyHint={<FavoritesHint />}
          />

          <ItemRail
            title="Series to binge"
            subtitle="Seasons and episodes imported from your portals"
            items={series.items}
            moreHref="/series"
            moreLabel="Browse series"
          />

          <ItemRail
            title="Movies for tonight"
            subtitle="Sorted by import order — search to jump anywhere"
            items={movies.items}
            moreHref="/movies"
            moreLabel="Browse movies"
          />

          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-white">Playlist health</h2>
                <p className="text-xs text-slate-400">Last sync status for every source you connected.</p>
              </div>
              <Link href="/playlists" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                Manage
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((playlist) => (
                <article key={playlist.id} className="card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">{playlist.name}</h3>
                    <span
                      className={
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase " +
                        (playlist.status === "ready"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : playlist.status === "error"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300")
                      }
                    >
                      {playlist.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {playlist.kind === "xtream" ? "Xtream Codes portal" : "M3U playlist"} ·{" "}
                    {(playlist.liveCount + playlist.movieCount + playlist.seriesCount).toLocaleString()} items
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Synced {relativeTime(playlist.lastSyncedAt)}
                    {playlist.statusMessage ? ` · ${playlist.statusMessage}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
