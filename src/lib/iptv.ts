import { isAdultContent } from './parental';
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, channels, playlists } from "@/db/schema";
import { parseDurationSecs } from "@/lib/utils";

export type ItemKind = "live" | "movie" | "series" | "episode";

export type ImportEntry = {
  kind: ItemKind;
  name: string;
  url: string;
  logo?: string | null;
  group?: string | null;
  tvgId?: string | null;
  externalId?: string | null;
  containerExtension?: string | null;
  rating?: string | null;
  plot?: string | null;
  castActors?: string | null;
  director?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
  durationSecs?: number | null;
  parentExternalId?: string | null;
  season?: number | null;
  episode?: number | null;
};

export type ImportResult = {
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  episodeCount: number;
};

const MOVIE_HINTS = /(movie|movies|vod|film|cinema|4k|kids movie|documentar)/i;
const SERIES_HINTS = /(series|serie|tv show|shows|season|anime)/i;

export function classifyKind(name: string, group: string | null | undefined, url: string): ItemKind {
  const haystack = `${group ?? ""} ${name}`;
  if (SERIES_HINTS.test(haystack)) return "series";
  if (MOVIE_HINTS.test(haystack)) return "movie";
  if (/\.(mp4|mkv|avi|mov|m4v)(\?|$)/i.test(url)) return "movie";
  return "live";
}

type PendingItem = {
  name: string;
  logo: string | null;
  group: string | null;
  tvgId: string | null;
  duration: number | null;
};

/** Stateful EXTM3U line handler, shared by the in-memory and the streaming parser. */
export function createM3ULineParser() {
  let pending: PendingItem | null = null;

  return (rawLine: string): ImportEntry | null => {
    const line = rawLine.trim();
    if (!line) return null;

    if (/^#EXTINF/i.test(line)) {
      const durationMatch = line.match(/#EXTINF:\s*(-?\d+(?:\.\d+)?)/i);
      const attrString = line.slice(line.indexOf(":") + 1);
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let match: RegExpExecArray | null;
      while ((match = attrRegex.exec(attrString))) {
        attrs[match[1].toLowerCase()] = match[2];
      }
      const name = attrString.split(",").slice(1).join(",").trim() || attrs["tvg-name"] || "Unknown";
      pending = {
        name,
        logo: attrs["tvg-logo"] || attrs["logo"] || null,
        group: attrs["group-title"] || attrs["group"] || null,
        tvgId: attrs["tvg-id"] || attrs["tvg-name"] || null,
        duration: durationMatch ? Number(durationMatch[1]) : null,
      };
      return null;
    }

    if (/^#EXTGRP/i.test(line)) {
      const group = line.split(":").slice(1).join(":").trim();
      if (pending) pending.group = group || pending.group;
      return null;
    }

    if (line.startsWith("#")) return null;

    if (pending) {
      const entry: ImportEntry = {
        kind: classifyKind(pending.name, pending.group, line),
        name: pending.name,
        url: line,
        logo: pending.logo,
        group: pending.group,
        tvgId: pending.tvgId,
        durationSecs: pending.duration && pending.duration > 0 ? Math.round(pending.duration) : null,
      };
      pending = null;
      return entry;
    }

    if (/^https?:\/\//i.test(line)) {
      return {
        kind: classifyKind("Unknown", null, line),
        name: decodeURIComponent(line.split("/").pop() ?? "Unknown stream").slice(0, 300),
        url: line,
      };
    }

    return null;
  };
}

/**
 * Detects Xtream portal links pasted as playlists, e.g.
 * http://host:port/get.php?username=..&password=..&type=m3u_plus
 */
export function parseXtreamUrl(rawUrl: string): { serverUrl: string; username: string; password: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  if (!/get\.php$|player_api\.php$/.test(parsed.pathname)) return null;
  const username = parsed.searchParams.get("username");
  const password = parsed.searchParams.get("password");
  if (!username || !password) return null;
  return { serverUrl: parsed.origin, username, password };
}

export function parseM3U(text: string): ImportEntry[] {
  const handle = createM3ULineParser();
  const out: ImportEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const entry = handle(line);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Streams an EXTM3U source (raw body chunks or an in-memory string) entry by
 * entry, so a 90 MB / 300k-line playlist never has to be fully buffered.
 */
type ByteSource = string | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;

async function* byteChunks(source: Exclude<ByteSource, string>): AsyncGenerator<Uint8Array> {
  if (typeof (source as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (source as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield value;
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }
  yield* source as AsyncIterable<Uint8Array>;
}

export async function* streamM3U(source: ByteSource): AsyncGenerator<ImportEntry, void, unknown> {
  const handle = createM3ULineParser();

  if (typeof source === "string") {
    for (const line of source.split(/\r?\n/)) {
      const entry = handle(line);
      if (entry) yield entry;
    }
    return;
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  for await (const chunk of byteChunks(source)) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const entry = handle(line);
      if (entry) yield entry;
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    const entry = handle(buffer);
    if (entry) yield entry;
  }
}

/** Downloads an M3U body as a stream (no size limit) with friendly failures. */
export async function fetchM3UStream(url: string): Promise<ReadableStream<Uint8Array>> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(120000),
      headers: { "User-Agent": "IPTVPlayer/1.0", Accept: "*/*" },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "download failed";
    throw new Error(
      /aborted|timeout/i.test(message)
        ? "The download timed out — the playlist is too slow to reach right now."
        : `Could not download that playlist (${message}).`,
    );
  }
  if (!response.ok) throw new Error(`The source responded with HTTP ${response.status}.`);
  if (!response.body) throw new Error("The source returned an empty body.");
  return response.body;
}

/* ------------------------------------------------------------------ ingestion */

const BATCH_SIZE = 1000;

type ChannelInsert = typeof channels.$inferInsert;

function isAsyncIterable(value: AsyncIterable<ImportEntry> | Iterable<ImportEntry>): value is AsyncIterable<ImportEntry> {
  return typeof (value as AsyncIterable<ImportEntry>)[Symbol.asyncIterator] === "function";
}

async function* arrayToAsync(items: Iterable<ImportEntry>): AsyncGenerator<ImportEntry> {
  yield* items;
}

async function clearPlaylistContent(playlistId: number) {
  const existing = await db
    .select({ id: channels.id })
    .from(channels)
    .where(eq(channels.playlistId, playlistId));
  if (existing.length > 0) {
    for (const part of chunk(existing.map((row) => row.id), 20000)) {
      await db.delete(channels).where(inArray(channels.id, part));
    }
  }
  await db.delete(categories).where(eq(categories.playlistId, playlistId));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Writes playlist content without any size limit. Entries are consumed from a
 * stream (or array) and flushed to PostgreSQL in batches, while progress and
 * running counts are persisted so the UI can show a live progress bar.
 */
export async function ingestEntries(
  userId: number,
  playlistId: number,
  source: AsyncIterable<ImportEntry> | Iterable<ImportEntry>,
  opts: { expectedTotal?: number | null } = {},
): Promise<ImportResult> {
  await clearPlaylistContent(playlistId);
  await db
    .update(playlists)
    .set({ progressDone: 0, progressTotal: opts.expectedTotal ?? null, status: "syncing", statusMessage: "Importing…" })
    .where(eq(playlists.id, playlistId));

  const categoryKeys = new Map<string, { kind: ItemKind; name: string }>();
  let batch: ChannelInsert[] = [];
  let done = 0;
  const counts: ImportResult = { liveCount: 0, movieCount: 0, seriesCount: 0, episodeCount: 0 };

  async function flush() {
    if (batch.length === 0) return;
    const rows = batch;
    batch = [];
    for (const part of chunk(rows, 1000)) {
      await db.insert(channels).values(part);
    }
    done += rows.length;
    await db.update(playlists).set({ progressDone: done }).where(eq(playlists.id, playlistId));
  }

  const push = (entry: ImportEntry) => {
    const group = entry.group ?? "Uncategorized";
    categoryKeys.set(`${entry.kind}::${group}`, { kind: entry.kind, name: group });
    if (entry.kind === "episode") counts.episodeCount += 1;
    else if (entry.kind === "live") counts.liveCount += 1;
    else if (entry.kind === "movie") counts.movieCount += 1;
    else counts.seriesCount += 1;

    const isAdult = isAdultContent({ 
  category: group, 
  title: entry.name, 
  rating: entry.rating ?? '' 
});
    
    batch.push({
      userId,
      playlistId,
      kind: entry.kind,
      name: entry.name.slice(0, 300),
      logo: entry.logo ?? null,
      groupTitle: group === "Uncategorized" ? null : group,
      streamUrl: entry.url,
      tvgId: entry.tvgId ?? null,
      externalId: entry.externalId ?? null,
      containerExtension: entry.containerExtension ?? null,
      rating: entry.rating ?? null,
      plot: entry.plot ?? null,
      castActors: entry.castActors ?? null,
      director: entry.director ?? null,
      genre: entry.genre ?? null,
      releaseDate: entry.releaseDate ?? null,
      durationSecs: entry.durationSecs ?? null,
      season: entry.season ?? null,
      episode: entry.episode ?? null,
      sortOrder: counts.liveCount + counts.movieCount + counts.seriesCount + counts.episodeCount,
    });

    return flush();
  };

  const iterator: AsyncIterator<ImportEntry> = isAsyncIterable(source)
    ? source[Symbol.asyncIterator]()
    : arrayToAsync(source as Iterable<ImportEntry>);

  for (;;) {
    const step = await iterator.next();
    if (step.done) break;
    if (batch.length >= BATCH_SIZE) await flush();
    await push(step.value);
  }
  await flush();

  // Categories are written after the items so we only insert the groups that
  // actually appeared, then link them with one indexed update per group.
  const categoryRows = Array.from(categoryKeys.entries()).map(([key, value], index) => ({
    key,
    userId,
    playlistId,
    kind: value.kind,
    name: value.name,
    sortOrder: index,
  }));

  for (const part of chunk(categoryRows, 500)) {
    await db
      .insert(categories)
      .values(part.map(({ key: _key, ...row }) => row))
      .onConflictDoNothing();
  }

  const stored = await db
    .select({ id: categories.id, kind: categories.kind, name: categories.name })
    .from(categories)
    .where(eq(categories.playlistId, playlistId));

  for (const category of stored) {
    await db
      .update(channels)
      .set({ categoryId: category.id })
      .where(
        and(
          eq(channels.playlistId, playlistId),
          eq(channels.kind, category.kind),
          sql`coalesce(${channels.groupTitle}, 'Uncategorized') = ${category.name}`,
        ),
      );
  }

  await linkEpisodesToSeries(userId, playlistId);

  await db
    .update(playlists)
    .set({
      liveCount: counts.liveCount,
      movieCount: counts.movieCount,
      seriesCount: counts.seriesCount,
      progressDone: done,
      progressTotal: done,
      status: done === 0 ? "error" : "ready",
      statusMessage: done === 0 ? "No playable items were found in this source." : null,
      lastSyncedAt: new Date(),
    })
    .where(eq(playlists.id, playlistId));

  return counts;
}

/** Resolves `parent_id` for episodes that arrived before/after their series row. */
export async function linkEpisodesToSeries(userId: number, playlistId: number) {
  await db.execute(sql`
    update channels ep
    set parent_id = s.id
    from channels s
    where ep.user_id = ${userId}
      and ep.playlist_id = ${playlistId}
      and ep.kind = 'episode'
      and ep.external_id like 'SER:%'
      and s.playlist_id = ${playlistId}
      and s.kind = 'series'
      and ep.external_id = 'SER:' || coalesce(s.external_id, '')
      and ep.parent_id is distinct from s.id
  `);
}

export async function writePlaylistContent(userId: number, playlistId: number, entries: ImportEntry[]) {
  return ingestEntries(userId, playlistId, entries, { expectedTotal: entries.length });
}

/* --------------------------------------------------------------- xtream codes */

async function xtreamFetch<T>(
  serverUrl: string,
  username: string,
  password: string,
  params: Record<string, string>,
): Promise<T> {
  const base = serverUrl.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    throw new Error("Server URL must start with http:// or https://");
  }
  const search = new URLSearchParams({ username, password, ...params });
  const response = await fetch(`${base}/player_api.php?${search.toString()}`, {
    signal: AbortSignal.timeout(90000),
    headers: { "User-Agent": "IPTVPlayer/1.0", Accept: "application/json" },
    cache: "no-store",
  }).catch(() => {
    throw new Error("Could not reach the portal. Double-check the URL (including the port) and that the server is online.");
  });
  if (!response.ok) {
    throw new Error(`Portal responded with HTTP ${response.status}. Check your username and password.`);
  }
  return (await response.json()) as T;
}

type XtreamCategory = { category_id: string | number; category_name: string };
type XtreamStream = {
  stream_id?: number | string;
  series_id?: number | string;
  name?: string;
  title?: string;
  stream_icon?: string | null;
  cover?: string | null;
  category_id?: string | number;
  group?: string;
  container_extension?: string;
  rating?: string | number;
  plot?: string | null;
  cast?: string | null;
  director?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
  releasedate?: string | null;
  duration?: string;
  epg_channel_id?: string | null;
};

function safeUrl(serverUrl: string) {
  return serverUrl.replace(/\/+$/, "");
}

export async function verifyXtreamCredentials(serverUrl: string, username: string, password: string) {
  const info = await xtreamFetch<{
    user_info?: { auth?: number; status?: string; exp_date?: string | null; active_cons?: string };
  }>(serverUrl, username, password, {});
  if (!info?.user_info || Number(info.user_info.auth) !== 1) {
    throw new Error("Xtream Codes rejected these credentials.");
  }
  return info;
}

/**
 * Whole portal catalogue, with no caps. Sections are fetched in sequence so
 * memory holds one section at a time while the caller streams them in.
 */
export async function fetchXtreamEntries(
  serverUrl: string,
  username: string,
  password: string,
): Promise<{
  entries: ImportEntry[];
  epgUrl: string;
  available: { live: number; movies: number; series: number };
}> {
  const base = safeUrl(serverUrl);
  const [catLive, catVod, catSeries] = await Promise.all([
    xtreamFetch<XtreamCategory[]>(base, username, password, { action: "get_live_categories" }),
    xtreamFetch<XtreamCategory[]>(base, username, password, { action: "get_vod_categories" }),
    xtreamFetch<XtreamCategory[]>(base, username, password, { action: "get_series_categories" }),
  ]);
  const liveCats = Array.isArray(catLive) ? catLive : [];
  const vodCats = Array.isArray(catVod) ? catVod : [];
  const seriesCats = Array.isArray(catSeries) ? catSeries : [];
  const catName = (list: XtreamCategory[], id: string | number | undefined) =>
    list.find((c) => String(c.category_id) === String(id))?.category_name ?? null;

  const live = await xtreamFetch<XtreamStream[]>(base, username, password, { action: "get_live_streams" });
  const entries: ImportEntry[] = [];
  for (const stream of Array.isArray(live) ? live : []) {
    if (stream.stream_id === undefined) continue;
    entries.push({
      kind: "live",
      name: stream.name ?? "Unknown channel",
      url: `${base}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream.stream_id}.m3u8`,
      logo: stream.stream_icon ?? null,
      group: catName(liveCats, stream.category_id) ?? stream.group ?? null,
      externalId: String(stream.stream_id),
      tvgId: stream.epg_channel_id ?? null,
    });
  }

  const vod = await xtreamFetch<XtreamStream[]>(base, username, password, { action: "get_vod_streams" });
  for (const stream of Array.isArray(vod) ? vod : []) {
    if (stream.stream_id === undefined) continue;
    const ext = stream.container_extension || "mp4";
    entries.push({
      kind: "movie",
      name: stream.name ?? stream.title ?? "Unknown movie",
      url: `${base}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream.stream_id}.${ext}`,
      logo: stream.stream_icon ?? stream.cover ?? null,
      group: catName(vodCats, stream.category_id) ?? null,
      externalId: String(stream.stream_id),
      containerExtension: ext,
      rating: stream.rating ? String(stream.rating) : null,
      plot: stream.plot ?? null,
      castActors: stream.cast ?? null,
      director: stream.director ?? null,
      genre: stream.genre ?? null,
      releaseDate: stream.releaseDate ?? stream.releasedate ?? null,
      durationSecs: stream.duration ? parseDurationSecs(stream.duration) : null,
    });
  }

  const series = await xtreamFetch<XtreamStream[]>(base, username, password, { action: "get_series" });
  for (const item of Array.isArray(series) ? series : []) {
    if (item.series_id === undefined) continue;
    entries.push({
      kind: "series",
      name: item.name ?? item.title ?? "Unknown series",
      url: `${base}/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/info`,
      logo: item.cover ?? null,
      group: catName(seriesCats, item.category_id) ?? null,
      externalId: String(item.series_id),
      plot: item.plot ?? null,
      genre: item.genre ?? null,
      castActors: item.cast ?? null,
      director: item.director ?? null,
      rating: item.rating ? String(item.rating) : null,
      releaseDate: item.releaseDate ?? item.releasedate ?? null,
    });
  }

  return {
    entries,
    available: {
      live: Array.isArray(live) ? live.length : 0,
      movies: Array.isArray(vod) ? vod.length : 0,
      series: Array.isArray(series) ? series.length : 0,
    },
    epgUrl: `${base}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  };
}

export type XtreamSeriesEpisode = {
  season: number;
  episode: number | null;
  title: string;
  url: string;
  plot: string | null;
  durationSecs: number | null;
  logo: string | null;
};

/** Episode list for a single series — loaded on demand, never during import. */
export async function fetchXtreamEpisodes(
  serverUrl: string,
  username: string,
  password: string,
  seriesExternalId: string,
): Promise<XtreamSeriesEpisode[]> {
  const base = safeUrl(serverUrl);
  const info = await xtreamFetch<{ episodes?: Record<string, Array<Record<string, unknown>>> }>(
    base,
    username,
    password,
    { action: "get_series_info", series_id: seriesExternalId },
  );
  const out: XtreamSeriesEpisode[] = [];
  for (const [seasonKey, episodes] of Object.entries(info?.episodes ?? {})) {
    for (const episode of Array.isArray(episodes) ? episodes : []) {
      const id = episode["id"] as string | number | undefined;
      if (id === undefined) continue;
      const container = (episode["container_extension"] as string | undefined) || "mp4";
      const meta = episode["info"] as
        | { plot?: string; duration?: string; movie_image?: string }
        | undefined;
      out.push({
        season: Number(seasonKey) || 1,
        episode: Number(episode["episode_num"] ?? 0) || null,
        title: ((episode["title"] as string | undefined) ?? `Episode ${String(episode["episode_num"] ?? "")}`).slice(0, 300),
        url: `${base}/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${id}.${container}`,
        plot: meta?.plot ?? null,
        durationSecs: parseDurationSecs(meta?.duration ?? null),
        logo: meta?.movie_image ?? null,
      });
    }
  }
  return out.sort((a, b) => a.season - b.season || (a.episode ?? 0) - (b.episode ?? 0));
}

/** Stores (replacing) the episode list of one series. */
export async function saveXtreamEpisodes(
  userId: number,
  playlistId: number,
  seriesId: number,
  seriesExternalId: string | null,
  episodes: XtreamSeriesEpisode[],
) {
  const existing = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.userId, userId), eq(channels.parentId, seriesId)));
  if (existing.length > 0) {
    await db.delete(channels).where(inArray(channels.id, existing.map((row) => row.id)));
  }

  for (const part of chunk(episodes, 500)) {
    await db.insert(channels).values(
      part.map((episode, index) => ({
        userId,
        playlistId,
        kind: "episode" as const,
        name: episode.title,
        logo: episode.logo,
        streamUrl: episode.url,
        externalId: `SER:${seriesExternalId ?? "manual"}:E${episode.season}-${episode.episode ?? index}`,
        containerExtension: "mp4",
        plot: episode.plot,
        durationSecs: episode.durationSecs,
        parentId: seriesId,
        season: episode.season,
        episode: episode.episode,
        sortOrder: index,
      })),
    );
  }

  await db
    .update(playlists)
    .set({ progressTotal: null, progressDone: 0, status: "ready", statusMessage: null })
    .where(eq(playlists.id, playlistId));

  return episodes.length;
}

/** Refreshes a portal playlist. Episodes stay on demand to keep it fast. */
export async function syncXtreamPlaylist(userId: number, playlistId: number) {
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  if (!playlist?.serverUrl || !playlist.username || !playlist.password) {
    throw new Error("This playlist is not linked to an Xtream Codes portal.");
  }
  const { entries, epgUrl, available } = await fetchXtreamEntries(playlist.serverUrl, playlist.username, playlist.password);
  const counts = await ingestEntries(userId, playlistId, entries, {
    expectedTotal: available.live + available.movies + available.series,
  });
  await db.update(playlists).set({ epgUrl }).where(eq(playlists.id, playlistId));
  return { counts, available };
}

export async function playlistBelongsToUser(userId: number, playlistId: number) {
  const rows = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
