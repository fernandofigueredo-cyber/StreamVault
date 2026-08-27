import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, playlists } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { fetchXtreamEpisodes, saveXtreamEpisodes } from "@/lib/iptv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

/**
 * Loads (or reloads) the episode list of one series straight from its Xtream
 * portal. Episodes are always fetched on demand so importing 300k entries
 * never triggers thousands of portal calls.
 */
export async function POST(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const seriesId = Number(id);
  if (!Number.isFinite(seriesId)) return Response.json({ error: "Bad id." }, { status: 400 });

  const [series] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.id, seriesId), eq(channels.userId, user.id), eq(channels.kind, "series")))
    .limit(1);
  if (!series) return Response.json({ error: "Series not found." }, { status: 404 });

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, series.playlistId), eq(playlists.userId, user.id)))
    .limit(1);
  if (!playlist?.serverUrl || !playlist.username || !playlist.password) {
    return Response.json(
      { error: "Episodes can only be pulled from Xtream Codes portals." },
      { status: 422 },
    );
  }

  try {
    const episodes = await fetchXtreamEpisodes(
      playlist.serverUrl,
      playlist.username,
      playlist.password,
      series.externalId ?? "",
    );
    const saved = await saveXtreamEpisodes(user.id, playlist.id, series.id, series.externalId, episodes);
    return Response.json({ ok: true, count: saved });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load episodes." },
      { status: 502 },
    );
  }
}
