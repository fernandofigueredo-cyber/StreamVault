import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star, Tv } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getChannel, getEpisodesForSeries } from "@/lib/queries";
import EpisodeList from "@/components/EpisodeList";
import { PosterTile } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const seriesId = Number(id);
  if (!Number.isFinite(seriesId)) notFound();

  const found = await getChannel(user.id, seriesId);
  if (!found) notFound();
  if (found.item.kind !== "series") {
    return redirect(`/watch/${seriesId}`);
  }

  const episodes = await getEpisodesForSeries(user.id, seriesId);
  const seasons = new Set(episodes.map((episode) => episode.season ?? 1)).size;
  const firstEpisode = episodes[0];
  const canLoadEpisodes = found.playlist?.kind === "xtream" && Boolean(found.playlist?.serverUrl);

  return (
    <div className="space-y-7">
      <Link href="/series" className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to series
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row">
        <div className="h-52 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-xl">
          {found.item.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={found.item.logo} alt={found.item.name} className="h-full w-full object-cover" />
          ) : (
            <PosterTile item={found.item} label="series" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{found.item.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-slate-200">{found.item.groupTitle}</span>
            {found.item.genre ? <span className="text-slate-400">{found.item.genre}</span> : null}
            {found.item.year ? <span className="text-slate-400">· {found.item.year}</span> : null}
            {found.item.rating ? (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-300">
                <Star className="h-3 w-3 fill-current" /> {found.item.rating}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-slate-400">
              <Tv className="h-3.5 w-3.5" /> {seasons} season{seasons === 1 ? "" : "s"} · {episodes.length} episodes
            </span>
          </div>

          {found.item.plot ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{found.item.plot}</p>
          ) : null}
          {found.item.castActors ? (
            <p className="mt-3 text-xs text-slate-400">
              <span className="text-slate-500">Cast:</span> {found.item.castActors}
            </p>
          ) : null}

          {firstEpisode ? (
            <Link
              href={`/watch/${firstEpisode.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
            >
              Play S{String(firstEpisode.season ?? 1).padStart(2, "0")}E
              {String(firstEpisode.episode ?? 1).padStart(2, "0")} · {firstEpisode.name}
            </Link>
          ) : null}
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-base font-semibold tracking-tight text-white">Episodes</h2>
        <EpisodeList episodes={episodes} canLoadEpisodes={canLoadEpisodes} seriesId={seriesId} />
      </section>
    </div>
  );
}
