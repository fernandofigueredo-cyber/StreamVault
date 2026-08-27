import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlists } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import {
  fetchM3UStream,
  fetchXtreamEntries,
  ingestEntries,
  parseXtreamUrl,
  streamM3U,
  verifyXtreamCredentials,
} from "@/lib/iptv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, user.id))
    .orderBy(desc(playlists.createdAt));
  return Response.json({ playlists: rows });
}

type CreateBody = {
  mode?: "m3u-url" | "m3u-file" | "xtream";
  name?: string;
  url?: string;
  epgUrl?: string;
  fileContent?: string;
  fileName?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
};

/** Runs after the response is sent: huge imports can take minutes. */
function runBackground(work: () => Promise<void>) {
  void work().catch(() => undefined);
}

async function fail(playlistId: number, message: string) {
  await db
    .update(playlists)
    .set({ status: "error", statusMessage: message, lastSyncedAt: new Date() })
    .where(eq(playlists.id, playlistId));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mode = body.mode ?? "m3u-url";
  const name = (body.name ?? "").trim();

  // --- Xtream Codes portal (also auto-detected from pasted get.php links) ----
  let xtream: { serverUrl: string; username: string; password: string } | null = null;
  let autoDetected = false;

  if (mode === "xtream") {
    const serverUrl = (body.serverUrl ?? "").trim();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    if (!serverUrl || !username || !password) {
      return Response.json({ error: "Portal URL, username and password are all required." }, { status: 400 });
    }
    xtream = { serverUrl, username, password };
  } else if (mode === "m3u-url" && body.url) {
    const detected = parseXtreamUrl(body.url);
    if (detected) {
      xtream = detected;
      autoDetected = true;
    }
  }

  if (xtream) {
    try {
      await verifyXtreamCredentials(xtream.serverUrl, xtream.username, xtream.password);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Could not reach the portal." },
        { status: 422 },
      );
    }

    const [playlist] = await db
      .insert(playlists)
      .values({
        userId: user.id,
        name: name || `Xtream · ${xtream.username}`,
        kind: "xtream",
        serverUrl: xtream.serverUrl,
        username: xtream.username,
        password: xtream.password,
        epgUrl: body.epgUrl ?? null,
        status: "syncing",
        statusMessage: "Contacting portal…",
        progressTotal: null,
        progressDone: 0,
      })
      .returning();

    runBackground(async () => {
      try {
        const { entries, epgUrl, available } = await fetchXtreamEntries(
          xtream!.serverUrl,
          xtream!.username,
          xtream!.password,
        );
        const counts = await ingestEntries(user.id, playlist.id, entries, {
          expectedTotal: available.live + available.movies + available.series,
        });
        await db.update(playlists).set({ epgUrl: epgUrl ?? body.epgUrl ?? null }).where(eq(playlists.id, playlist.id));
        void counts;
      } catch (error) {
        await fail(playlist.id, error instanceof Error ? error.message : "Import failed.");
      }
    });

    return Response.json(
      { playlist, accepted: true, detected: autoDetected ? "xtream" : undefined },
      { status: 202 },
    );
  }

  // --- Plain M3U (URL or uploaded file), streamed without any size limit ----
  let sourceUrl: string | null = null;
  let fileText: string | null = null;

  if (mode === "m3u-file") {
    fileText = body.fileContent ?? "";
    if (!fileText.trim()) return Response.json({ error: "That file looks empty." }, { status: 400 });
    sourceUrl = body.fileName ? `file://${body.fileName}` : null;
  } else {
    sourceUrl = (body.url ?? "").trim();
    if (!/^https?:\/\//i.test(sourceUrl)) {
      return Response.json({ error: "Playlist URL must start with http:// or https://" }, { status: 400 });
    }
    if (/#EXTM3U|#EXTINF/i.test(sourceUrl) === false && /\.m3u8?($|\?)/i.test(sourceUrl) === false) {
      // Not fatal: many providers serve playlists from extension-less URLs.
    }
  }

  const playlistName =
    name ||
    (mode === "m3u-file"
      ? (body.fileName ?? "Uploaded playlist").replace(/\.m3u8?$/i, "")
      : sourceUrl!.replace(/^https?:\/\//, "").split("/")[0]);

  const [playlist] = await db
    .insert(playlists)
    .values({
      userId: user.id,
      name: playlistName,
      kind: "m3u",
      sourceUrl,
      epgUrl: body.epgUrl ?? null,
      status: "syncing",
      statusMessage: mode === "m3u-file" ? "Reading file…" : "Downloading playlist…",
      progressDone: 0,
      progressTotal: null,
    })
    .returning();

  if (fileText !== null) {
    if (!/#EXTM3U|#EXTINF/i.test(fileText)) {
      await fail(playlist.id, "That doesn't look like an M3U playlist (no #EXTINF entries found).");
      return Response.json({ error: "That doesn't look like an M3U playlist (no #EXTINF entries found)." }, { status: 422 });
    }
  }

  runBackground(async () => {
    try {
      const stream =
        fileText !== null ? streamM3U(fileText) : streamM3U(await fetchM3UStream(sourceUrl as string));
      const counts = await ingestEntries(user.id, playlist.id, stream);
      void counts;
    } catch (error) {
      await fail(playlist.id, error instanceof Error ? error.message : "Import failed.");
    }
  });

  return Response.json({ playlist, accepted: true }, { status: 202 });
}
