import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlists } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { fetchM3UStream, ingestEntries, streamM3U, syncXtreamPlaylist } from "@/lib/iptv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const playlistId = Number(id);
  if (!Number.isFinite(playlistId)) return Response.json({ error: "Bad playlist id." }, { status: 400 });

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, user.id)))
    .limit(1);
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });
  if (playlist.status === "syncing") {
    return Response.json({ error: "This playlist is already syncing." }, { status: 409 });
  }

  await db
    .update(playlists)
    .set({ status: "syncing", statusMessage: "Refreshing…", progressDone: 0, progressTotal: null })
    .where(eq(playlists.id, playlist.id));

  const work = async () => {
    if (playlist.kind === "xtream") {
      await syncXtreamPlaylist(user.id, playlist.id);
      return;
    }
    if (!playlist.sourceUrl || playlist.sourceUrl.startsWith("file://")) {
      throw new Error(
        "This playlist was uploaded as a file, so it can't be re-downloaded. Import the file again instead.",
      );
    }
    await ingestEntries(user.id, playlist.id, streamM3U(await fetchM3UStream(playlist.sourceUrl)));
  };

  void work().catch(async (error: unknown) => {
    await db
      .update(playlists)
      .set({
        status: "error",
        statusMessage: error instanceof Error ? error.message : "Refresh failed.",
        lastSyncedAt: new Date(),
      })
      .where(eq(playlists.id, playlist.id));
  });

  return Response.json({ accepted: true, playlist: { ...playlist, status: "syncing" } }, { status: 202 });
}
