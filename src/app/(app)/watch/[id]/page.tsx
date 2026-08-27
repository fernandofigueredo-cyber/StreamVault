import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Info, Radio } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getChannel, getEpgSchedule, getRelated, upsertHistory } from "@/lib/queries";
import VideoPlayer from "@/components/VideoPlayer";
import WatchActions from "@/components/WatchActions";
import ItemRail from "@/components/ItemRail";
import { PosterTile } from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) notFound();

  const found = await getChannel(user.id, itemId);
  if (!found) notFound();
  if (found.item.kind === "series") redirect(`/series/${itemId}`);

  const [schedule, related] = await Promise.all([
    getEpgSchedule(user.id, itemId),
    getRelated(user.id, found.item, 14),
  ]);

  const now = Date.now();
  const currentProgram = schedule.find((program) => program.startsAt.getTime() <= now && program.endsAt.getTime() > now);
  const upcoming = schedule.filter((program) => program.endsAt.getTime() > now && program !== currentProgram);

  await upsertHistory(user.id, itemId, found.item.positionSecs ?? 0, found.item.durationSecs ?? null).catch(() => undefined);

  const isLive = found.item.kind === "live";

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={isLive ? "/live" : found.item.kind === "episode" ? "/series" : "/movies"}
          className="flex items-center gap-1.5 text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {isLive ? "live TV" : found.item.kind === "episode" ? "series" : "movies"}
        </Link>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">{found.playlist?.name ?? "Unknown playlist"}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <VideoPlayer
            source={{
              itemId: found.item.id,
              title: found.item.name,
              url: `/api/stream/${found.item.id}`,
              isLive,
              resumeAt: found.item.positionSecs ?? null,
              forceHls: isLive || /\.m3u8|player_api|get\.php/i.test(found.item.streamUrl),
            }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{found.item.name}</h1>
                {isLive ? (
                  <span className="flex items-center gap-1.5 rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> live
                  </span>
                ) : null}
                {found.item.rating ? (
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    ★ {found.item.rating}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm text-slate-400">
                {[
                  found.item.groupTitle,
                  found.item.genre,
                  found.item.year,
                  found.item.durationSecs ? formatDuration(found.item.durationSecs) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <WatchActions itemId={found.item.id} isFavorite={found.item.isFavorite} streamUrl={found.item.streamUrl} />
          </div>

          {found.item.plot ? (
            <section className="card rounded-2xl p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Info className="h-4 w-4 text-brand-300" /> Synopsis
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{found.item.plot}</p>
              {found.item.castActors ? (
                <p className="mt-3 text-xs text-slate-400">
                  <span className="text-slate-500">Cast:</span> {found.item.castActors}
                </p>
              ) : null}
              {found.item.director ? (
                <p className="mt-1 text-xs text-slate-400">
                  <span className="text-slate-500">Director:</span> {found.item.director}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {currentProgram ? (
            <section className="card rounded-2xl p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Radio className="h-4 w-4 text-rose-400" /> On now
              </h2>
              <p className="mt-2 text-base font-semibold text-white">{currentProgram.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                {currentProgram.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {currentProgram.endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {currentProgram.description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{currentProgram.description}</p>
              ) : null}
            </section>
          ) : null}

          <section className="card rounded-2xl p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarClock className="h-4 w-4 text-brand-300" /> Programme guide
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No EPG data for this channel. Add an XMLTV URL when importing to populate the guide.
              </p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {upcoming.slice(0, 8).map((program) => (
                  <li key={program.id} className="flex gap-3 border-l-2 border-brand-500/40 pl-3">
                    <span className="w-14 shrink-0 font-mono text-[11px] text-slate-500">
                      {program.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">{program.title}</span>
                      {program.description ? (
                        <span className="mt-0.5 block line-clamp-2 text-[11px] text-slate-500">{program.description}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white">Stream details</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Container</dt>
                <dd className="truncate font-mono text-slate-300">
                  {found.item.streamUrl.split(".").pop()?.slice(0, 8) || "hls"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Source</dt>
                <dd className="truncate font-mono text-slate-300">
                  {found.playlist?.kind === "xtream" ? "Xtream Codes" : "M3U"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Position</dt>
                <dd className="font-mono text-slate-300">{formatTime(found.item.positionSecs ?? 0)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {related.length > 0 ? (
        <ItemRail
          title={isLive ? "More in this category" : "More like this"}
          subtitle={found.item.groupTitle ?? undefined}
          items={related}
          moreHref={isLive ? "/live" : "/movies"}
        />
      ) : null}

      {isLive ? null : (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <span className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-800">
            {found.item.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={found.item.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <PosterTile item={found.item} />
            )}
          </span>
          <p className="text-xs text-slate-400">
            Playback uses adaptive HLS where available, falling back to native progressive streaming. Keyboard
            shortcuts: space to play/pause, ← / → to skip 10s, M to mute, F for fullscreen.
          </p>
        </div>
      )}
    </div>
  );
}
