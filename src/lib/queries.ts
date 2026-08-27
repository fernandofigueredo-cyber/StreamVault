import { and, asc, count, desc, eq, gt, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  channels,
  epgPrograms,
  favorites,
  playlists,
  watchHistory,
  type Channel,
  type Playlist,
} from "@/db/schema";

export type LibraryItem = {
  id: number;
  kind: string;
  name: string;
  logo: string | null;
  groupTitle: string | null;
  streamUrl: string;
  rating: string | null;
  genre: string | null;
  plot: string | null;
  castActors: string | null;
  director: string | null;
  year: string | null;
  durationSecs: number | null;
  season: number | null;
  episode: number | null;
  playlistId: number;
  isFavorite: boolean;
  positionSecs: number | null;
  updatedAt: Date | null;
  nowPlaying: { title: string; description: string | null; endsAt: string } | null;
};

type ListOptions = {
  kind: string;
  playlistId?: number;
  category?: string;
  q?: string;
  favoriteOnly?: boolean;
  limit?: number;
  offset?: number;
  sort?: "default" | "name" | "recent";
};

async function nowPlayingMap(userId: number, itemIds: number[]) {
  if (itemIds.length === 0) return new Map<number, { title: string; description: string | null; endsAt: Date }>();
  const rows = await db
    .select()
    .from(epgPrograms)
    .where(
      and(
        eq(epgPrograms.userId, userId),
        inArray(epgPrograms.itemId, itemIds),
        lte(epgPrograms.startsAt, new Date()),
        gt(epgPrograms.endsAt, new Date()),
      ),
    );
  const map = new Map<number, { title: string; description: string | null; endsAt: Date }>();
  for (const row of rows) {
    if (!map.has(row.itemId)) {
      map.set(row.itemId, { title: row.title, description: row.description, endsAt: row.endsAt });
    }
  }
  return map;
}

function mapRow(
  row: { channel: Channel; favoriteId: number | null; historyPosition: number | null; updatedAt: Date | null },
  nowPlaying?: { title: string; description: string | null; endsAt: Date } | null,
): LibraryItem {
  return {
    id: row.channel.id,
    kind: row.channel.kind,
    name: row.channel.name,
    logo: row.channel.logo,
    groupTitle: row.channel.groupTitle,
    streamUrl: row.channel.streamUrl,
    rating: row.channel.rating,
    genre: row.channel.genre,
    plot: row.channel.plot,
    castActors: row.channel.castActors,
    director: row.channel.director,
    year: row.channel.releaseDate,
    durationSecs: row.channel.durationSecs,
    season: row.channel.season,
    episode: row.channel.episode,
    playlistId: row.channel.playlistId,
    isFavorite: row.favoriteId !== null,
    positionSecs: row.historyPosition,
    updatedAt: row.updatedAt,
    nowPlaying: nowPlaying
      ? { title: nowPlaying.title, description: nowPlaying.description, endsAt: nowPlaying.endsAt.toISOString() }
      : null,
  };
}

function baseQuery(userId: number) {
  return db
    .select({
      channel: channels,
      favoriteId: favorites.id,
      historyPosition: watchHistory.positionSecs,
      updatedAt: watchHistory.updatedAt,
    })
    .from(channels)
    .leftJoin(favorites, and(eq(favorites.itemId, channels.id), eq(favorites.userId, userId)))
    .leftJoin(watchHistory, and(eq(watchHistory.itemId, channels.id), eq(watchHistory.userId, userId)));
}

async function withNowPlaying(userId: number, rows: Parameters<typeof mapRow>[0][]) {
  const map = await nowPlayingMap(
    userId,
    rows.map((row) => row.channel.id),
  );
  return rows.map((row) => mapRow(row, map.get(row.channel.id) ?? null));
}

export async function listLibrary(userId: number, options: ListOptions) {
  const limit = Math.min(options.limit ?? 60, 200);
  const offset = options.offset ?? 0;

  const filters = [eq(channels.userId, userId)];
  if (options.kind && options.kind !== "all") filters.push(eq(channels.kind, options.kind));
  if (options.playlistId) filters.push(eq(channels.playlistId, options.playlistId));
  if (options.category) filters.push(eq(channels.groupTitle, options.category));
  if (options.q) filters.push(ilike(channels.name, `%${options.q}%`));
  if (options.favoriteOnly) filters.push(sql`${favorites.id} is not null`);

  const rows = await baseQuery(userId)
    .where(and(...filters))
    .orderBy(
      options.sort === "recent" ? desc(watchHistory.updatedAt) : asc(channels.sortOrder),
      asc(channels.name),
    )
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ value: count() })
    .from(channels)
    .leftJoin(favorites, and(eq(favorites.itemId, channels.id), eq(favorites.userId, userId)))
    .where(and(...filters));

  return { items: await withNowPlaying(userId, rows), total: Number(totalRow?.value ?? 0) };
}

export async function listCategories(userId: number, kind: string, playlistId?: number) {
  const filters = [eq(categories.userId, userId), eq(categories.kind, kind)];
  if (playlistId) filters.push(eq(categories.playlistId, playlistId));
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      itemCount: sql<number>`(select count(*) from channels c where c.category_id = ${categories.id})`,
    })
    .from(categories)
    .where(and(...filters))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map((row) => ({ ...row, itemCount: Number(row.itemCount) }));
}

export async function listPlaylists(userId: number): Promise<Playlist[]> {
  return db.select().from(playlists).where(eq(playlists.userId, userId)).orderBy(desc(playlists.createdAt));
}

export async function listFavorites(userId: number, limit = 200) {
  const rows = await baseQuery(userId)
    .where(and(eq(channels.userId, userId), sql`${favorites.id} is not null`))
    .orderBy(desc(favorites.createdAt))
    .limit(limit);
  return withNowPlaying(userId, rows);
}

export async function listHistory(userId: number, limit = 40) {
  const rows = await baseQuery(userId)
    .where(and(eq(channels.userId, userId), sql`${watchHistory.id} is not null`))
    .orderBy(desc(watchHistory.updatedAt))
    .limit(limit);
  return withNowPlaying(userId, rows);
}

export async function getLibraryStats(userId: number) {
  const [row] = await db
    .select({
      live: sql<number>`count(*) filter (where kind = 'live')`,
      movies: sql<number>`count(*) filter (where kind = 'movie')`,
      series: sql<number>`count(*) filter (where kind = 'series')`,
      episodes: sql<number>`count(*) filter (where kind = 'episode')`,
      total: sql<number>`count(*)`,
    })
    .from(channels)
    .where(eq(channels.userId, userId));
  const [favRow] = await db.select({ value: count() }).from(favorites).where(eq(favorites.userId, userId));
  const [playlistRow] = await db.select({ value: count() }).from(playlists).where(eq(playlists.userId, userId));
  return {
    live: Number(row?.live ?? 0),
    movies: Number(row?.movies ?? 0),
    series: Number(row?.series ?? 0),
    episodes: Number(row?.episodes ?? 0),
    total: Number(row?.total ?? 0),
    favorites: Number(favRow?.value ?? 0),
    playlists: Number(playlistRow?.value ?? 0),
  };
}

export async function getChannel(userId: number, id: number) {
  const rows = await baseQuery(userId).where(and(eq(channels.userId, userId), eq(channels.id, id))).limit(1);
  if (rows.length === 0) return null;
  const items = await withNowPlaying(userId, rows);
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, items[0].playlistId)).limit(1);
  return { item: items[0], playlist: playlist ?? null };
}

export async function getEpgSchedule(userId: number, itemId: number) {
  return db
    .select()
    .from(epgPrograms)
    .where(
      and(
        eq(epgPrograms.userId, userId),
        eq(epgPrograms.itemId, itemId),
        gt(epgPrograms.endsAt, new Date(Date.now() - 6 * 3600_000)),
      ),
    )
    .orderBy(asc(epgPrograms.startsAt))
    .limit(48);
}

export async function getNowNext(userId: number, itemId: number) {
  return db
    .select()
    .from(epgPrograms)
    .where(and(eq(epgPrograms.userId, userId), eq(epgPrograms.itemId, itemId), gt(epgPrograms.endsAt, new Date())))
    .orderBy(asc(epgPrograms.startsAt))
    .limit(4);
}

export async function getRelated(userId: number, item: LibraryItem, limit = 14) {
  const filters = [eq(channels.userId, userId), eq(channels.kind, item.kind), sql`${channels.id} <> ${item.id}`];
  if (item.groupTitle) filters.push(eq(channels.groupTitle, item.groupTitle));
  const rows = await baseQuery(userId)
    .where(and(...filters))
    .orderBy(asc(channels.sortOrder))
    .limit(limit);
  return withNowPlaying(userId, rows);
}

export type EpisodeRow = {
  id: number;
  name: string;
  season: number | null;
  episode: number | null;
  plot: string | null;
  durationSecs: number | null;
  streamUrl: string;
  kind: string;
  isFavorite: boolean;
  positionSecs: number | null;
  updatedAt: Date | null;
};

export async function getEpisodesForSeries(userId: number, seriesId: number): Promise<EpisodeRow[]> {
  const rows = await baseQuery(userId)
    .where(and(eq(channels.userId, userId), eq(channels.parentId, seriesId)))
    .orderBy(asc(channels.season), asc(channels.episode), asc(channels.sortOrder));

  return rows.map((row) => ({
    id: row.channel.id,
    name: row.channel.name,
    season: row.channel.season,
    episode: row.channel.episode,
    plot: row.channel.plot,
    durationSecs: row.channel.durationSecs,
    streamUrl: row.channel.streamUrl,
    kind: row.channel.kind,
    isFavorite: row.favoriteId !== null,
    positionSecs: row.historyPosition,
    updatedAt: row.updatedAt,
  }));
}

export async function searchEverything(userId: number, query: string) {
  const term = `%${query}%`;
  const rows = await baseQuery(userId)
    .where(
      and(
        eq(channels.userId, userId),
        or(ilike(channels.name, term), ilike(channels.groupTitle, term), ilike(channels.genre, term)),
      ),
    )
    .orderBy(asc(channels.kind), asc(channels.name))
    .limit(120);
  return withNowPlaying(userId, rows);
}

export async function getLiveNow(userId: number, limit = 14) {
  const rows = await baseQuery(userId)
    .where(and(eq(channels.userId, userId), eq(channels.kind, "live")))
    .orderBy(asc(channels.sortOrder))
    .limit(limit);
  return withNowPlaying(userId, rows);
}

export async function upsertHistory(
  userId: number,
  itemId: number,
  positionSecs: number,
  durationSecs?: number | null,
) {
  await db
    .insert(watchHistory)
    .values({
      userId,
      itemId,
      positionSecs: Math.max(0, Math.round(positionSecs)),
      durationSecs: durationSecs ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [watchHistory.userId, watchHistory.itemId],
      set: {
        positionSecs: Math.max(0, Math.round(positionSecs)),
        durationSecs: durationSecs ?? null,
        updatedAt: new Date(),
      },
    });
}
