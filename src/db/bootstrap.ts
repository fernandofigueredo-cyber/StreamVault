mport { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { hashPassword } from "@/lib/auth";
import {
  DEMO_LIVE,
  DEMO_MOVIES,
  DEMO_SERIES,
  EPG_LIBRARY,
  poolStream,
} from "@/db/demo-data";
import {
  categories,
  channels,
  epgPrograms,
  favorites,
  playlists,
  users,
  watchHistory,
} from "@/db/schema";

export const DEMO_EMAIL = "demo@streamvault.app";
export const DEMO_PASSWORD = "demo1234";

let bootstrapPromise: Promise<void> | null = null;

const MIGRATE_SQL = `
alter table playlists add column if not exists progress_done integer not null default 0;
alter table playlists add column if not exists progress_total integer;
alter table channels add column if not exists category_id integer;
create index if not exists channels_group_idx on channels(playlist_id, kind, group_title);
`;

const SCHEMA_SQL = `
create table if not exists users (
  id serial primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists playlists (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  kind text not null default 'm3u',
  source_url text,
  server_url text,
  username text,
  password text,
  epg_url text,
  status text not null default 'ready',
  status_message text,
  live_count integer not null default 0,
  movie_count integer not null default 0,
  series_count integer not null default 0,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  progress_done integer not null default 0,
  progress_total integer,
  created_at timestamptz not null default now()
);
create index if not exists playlists_user_idx on playlists(user_id);
create index if not exists channels_group_idx on channels(playlist_id, kind, group_title);
create table if not exists categories (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  playlist_id integer not null references playlists(id) on delete cascade,
  kind text not null,
  name text not null,
  external_id text,
  sort_order integer not null default 0
);
create unique index if not exists categories_unique_idx on categories(playlist_id, kind, name);
create index if not exists categories_kind_idx on categories(kind);
create table if not exists channels (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  playlist_id integer not null references playlists(id) on delete cascade,
  kind text not null,
  name text not null,
  logo text,
  group_title text,
  category_id integer,
  stream_url text not null,
  tvg_id text,
  external_id text,
  container_extension text,
  rating text,
  plot text,
  cast_actors text,
  director text,
  genre text,
  release_date text,
  duration_secs integer,
  parent_id integer,
  season integer,
  episode integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists channels_user_kind_idx on channels(user_id, kind);
create index if not exists channels_playlist_idx on channels(playlist_id);
create index if not exists channels_parent_idx on channels(parent_id);
create index if not exists channels_name_idx on channels(name);
create table if not exists favorites (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  item_id integer not null references channels(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists favorites_unique_idx on favorites(user_id, item_id);
create table if not exists watch_history (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  item_id integer not null references channels(id) on delete cascade,
  position_secs integer not null default 0,
  duration_secs integer,
  play_count integer not null default 1,
  updated_at timestamptz not null default now()
);
create unique index if not exists watch_history_unique_idx on watch_history(user_id, item_id);
create table if not exists epg_programs (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  item_id integer not null references channels(id) on delete cascade,
  title text not null,
  description text,
  category text,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);
create index if not exists epg_item_idx on epg_programs(item_id, starts_at);
`;

async function ensureSchema() {
  await db.execute(sql.raw(SCHEMA_SQL));
  // Safe migrations: add columns that may be missing on existing databases
  await db.execute(sql.raw(MIGRATE_SQL));
}

export function ensureBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await ensureSchema();
      await seedDemoData();
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfHour(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  return copy;
}

/** Creates the whole demo library (playlists, channels, EPG, favourites, history) for any user. */
export async function seedContentForUser(userId: number): Promise<{ created: boolean }> {
  const owned = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .limit(1);
  if (owned.length > 0) return { created: false };

  const now = new Date();
  let streamCursor = 0;

  // ---------------------------------------------------------------- playlist 1
  const [xtreamPlaylist] = await db
    .insert(playlists)
    .values({
      userId,
      name: "Nebula Prime (Xtream Codes)",
      kind: "xtream",
      serverUrl: "https://portal.nebula-prime.tv:8080",
      username: "demo_viewer",
      password: "demo1234",
      epgUrl: "https://portal.nebula-prime.tv:8080/xmltv.php?username=demo_viewer&password=demo1234",
      status: "ready",
      statusMessage: null,
      lastSyncedAt: addMinutes(now, -34),
    })
    .returning();

  // ---------------------------------------------------------------- playlist 2
  const [m3uPlaylist] = await db
    .insert(playlists)
    .values({
      userId,
      name: "Community M3U Mix",
      kind: "m3u",
      sourceUrl: "https://raw.githubusercontent.com/streamvault/community-playlist/main/mix.m3u8",
      status: "ready",
      statusMessage: null,
      lastSyncedAt: addMinutes(now, -190),
    })
    .returning();

  // ---------------------------------------------------------------- playlist 3
  const [vodPlaylist] = await db
    .insert(playlists)
    .values({
      userId,
      name: "Weekend VOD Vault",
      kind: "m3u",
      sourceUrl: "https://cdn.streamvault.app/vault/vod.m3u",
      status: "ready",
      statusMessage: null,
      lastSyncedAt: addMinutes(now, -1430),
    })
    .returning();

  type ChannelInsert = typeof channels.$inferInsert;
  const liveRows: ChannelInsert[] = [];
  const liveGroupsMeta: { name: string; playlistId: number; sortOrder: number }[] = [];
  let liveIndex = 0;

  const addLiveGroup = (group: string, names: string[], playlistId: number) => {
    const meta = { name: group, playlistId, sortOrder: liveGroupsMeta.length };
    liveGroupsMeta.push(meta);
    for (const rawName of names) {
      const name = rawName.trim();
      const poolIndex = streamCursor++;
      liveRows.push({
        userId,
        playlistId,
        kind: "live",
        name,
        groupTitle: group,
        streamUrl: poolStream(poolIndex),
        tvgId: `tvg-${liveIndex + 1}`,
        externalId: String(10000 + liveIndex),
        sortOrder: liveIndex,
      });
      liveIndex += 1;
    }
  };

  DEMO_LIVE.forEach((group) => addLiveGroup(group.group, group.channels, xtreamPlaylist.id));
  addLiveGroup("Free To Air", ["RT News HD", "TRT World", "ABC Australia News", "Al Arabiya"], m3uPlaylist.id);
  addLiveGroup("Radio Visuals", ["Lofi Study Cam", "Ambient Earth Cam", "City Timelapse 24/7"], m3uPlaylist.id);

  const movieRows: ChannelInsert[] = DEMO_MOVIES.map((movie, index) => ({
    userId,
    playlistId: index % 3 === 2 ? vodPlaylist.id : xtreamPlaylist.id,
    kind: "movie",
    name: movie.title,
    groupTitle: movie.group,
    streamUrl: poolStream(streamCursor++),
    externalId: String(50000 + index),
    containerExtension: "mp4",
    rating: movie.rating,
    plot: movie.plot,
    castActors: movie.cast,
    director: movie.director,
    genre: movie.genre,
    releaseDate: movie.year,
    durationSecs: movie.durationSecs,
    sortOrder: index,
  }));

  const seriesRows: ChannelInsert[] = DEMO_SERIES.map((series, index) => ({
    userId,
    playlistId: xtreamPlaylist.id,
    kind: "series",
    name: series.title,
    groupTitle: series.group,
    streamUrl: `https://portal.nebula-prime.tv:8080/series/demo_viewer/demo1234/info`,
    externalId: String(90000 + index),
    rating: series.rating,
    plot: series.plot,
    castActors: series.cast,
    genre: series.genre,
    releaseDate: series.year,
    sortOrder: index,
  }));

  const insertedLive = await db.insert(channels).values(liveRows).returning({ id: channels.id, name: channels.name, groupTitle: channels.groupTitle });
  const insertedMovies = await db.insert(channels).values(movieRows).returning({ id: channels.id, name: channels.name });
  const insertedSeries = await db.insert(channels).values(seriesRows).returning({ id: channels.id, name: channels.name });

  const seriesIdByName = new Map(insertedSeries.map((row) => [row.name, row.id]));

  const episodeRows: ChannelInsert[] = [];
  DEMO_SERIES.forEach((series) => {
    const parentId = seriesIdByName.get(series.title);
    series.episodes.forEach((episode, index) => {
      episodeRows.push({
        userId,
        playlistId: xtreamPlaylist.id,
        kind: "episode",
        name: episode.title,
        groupTitle: series.group,
        streamUrl: poolStream(streamCursor++),
        externalId: `EP-${parentId}-${index}`,
        containerExtension: "mp4",
        plot: episode.plot,
        parentId: parentId ?? null,
        season: episode.season,
        episode: index + 1,
        durationSecs: 2400 + ((index * 7) % 12) * 60,
        genre: series.genre,
        sortOrder: index,
      });
    });
  });
  await db.insert(channels).values(episodeRows);

  // categories
  const categoryRows: (typeof categories.$inferInsert)[] = [];
  const seen = new Set<string>();
  const pushCategory = (kind: string, name: string | null, playlistId: number) => {
    const clean = name ?? "Uncategorized";
    const key = `${playlistId}::${kind}::${clean}`;
    if (seen.has(key)) return;
    seen.add(key);
    categoryRows.push({ userId, playlistId, kind, name: clean, sortOrder: categoryRows.length });
  };
  liveRows.forEach((row) => pushCategory("live", row.groupTitle ?? null, row.playlistId));
  movieRows.forEach((row) => pushCategory("movie", row.groupTitle ?? null, row.playlistId));
  seriesRows.forEach((row) => pushCategory("series", row.groupTitle ?? null, row.playlistId));
  await db.insert(categories).values(categoryRows);

  const categoryIdByKey = new Map<string, number>();
  const insertedCategories = await db
    .select({ id: categories.id, kind: categories.kind, name: categories.name, playlistId: categories.playlistId })
    .from(categories);
  insertedCategories.forEach((row) => categoryIdByKey.set(`${row.playlistId}::${row.kind}::${row.name}`, row.id));

  for (const row of liveRows) {
    const key = `${row.playlistId}::live::${row.groupTitle ?? "Uncategorized"}`;
    const categoryId = categoryIdByKey.get(key);
    if (categoryId) {
      await db.execute(sql`update channels set category_id = ${categoryId} where user_id = ${userId} and group_title = ${row.groupTitle} and kind = 'live'`);
    }
  }
  for (const row of movieRows) {
    const key = `${row.playlistId}::movie::${row.groupTitle ?? "Uncategorized"}`;
    const categoryId = categoryIdByKey.get(key);
    if (categoryId) {
      await db.execute(sql`update channels set category_id = ${categoryId} where user_id = ${userId} and group_title = ${row.groupTitle} and kind = 'movie'`);
    }
  }
  for (const row of seriesRows) {
    const key = `${row.playlistId}::series::${row.groupTitle ?? "Uncategorized"}`;
    const categoryId = categoryIdByKey.get(key);
    if (categoryId) {
      await db.execute(sql`update channels set category_id = ${categoryId} where user_id = ${userId} and group_title = ${row.groupTitle} and kind = 'series'`);
    }
  }

  // EPG: rolling schedule for every live channel
  const epgRows: (typeof epgPrograms.$inferInsert)[] = [];
  insertedLive.forEach((channel, index) => {
    const library = EPG_LIBRARY[channel.groupTitle ?? "Entertainment"] ?? EPG_LIBRARY.Entertainment;
    const anchor = startOfHour(addMinutes(now, -60));
    const slotMinutes = 60 + (index % 3) * 30;
    let cursor = anchor;
    for (let slot = 0; slot < 12; slot += 1) {
      const show = library[(index + slot) % library.length];
      epgRows.push({
        userId,
        itemId: channel.id,
        title: show.title,
        description: show.description,
        category: channel.groupTitle,
        startsAt: cursor,
        endsAt: addMinutes(cursor, slotMinutes),
      });
      cursor = addMinutes(cursor, slotMinutes);
    }
  });
  for (let i = 0; i < epgRows.length; i += 400) {
    await db.insert(epgPrograms).values(epgRows.slice(i, i + 400));
  }

  // favorites + history so the dashboard feels alive
  const favoriteNames = ["Sky Sports Main Event", "BBC Earth 4K", "Sky News HD", "Winterhold", "Deep Field", "HBO Signature HD", "Cartoon Network HD", "Ashfall Precinct"];
  const liveByName = new Map(insertedLive.map((row) => [row.name, row.id]));
  const movieByName = new Map(insertedMovies.map((row) => [row.name, row.id]));
  const seriesByName = new Map(insertedSeries.map((row) => [row.name, row.id]));
  const favoriteIds = favoriteNames
    .map((name) => liveByName.get(name) ?? movieByName.get(name) ?? seriesByName.get(name))
    .filter((id): id is number => typeof id === "number");
  if (favoriteIds.length > 0) {
    await db.insert(favorites).values(favoriteIds.map((itemId) => ({ userId, itemId })));
  }

  const historySeed: { name: string; position: number }[] = [
    { name: "Ashfall Precinct", position: 1560 },
    { name: "Winterhold", position: 4200 },
    { name: "Sky Sports Main Event", position: 600 },
    { name: "Late Checkout", position: 900 },
    { name: "Discovery Channel HD", position: 240 },
    { name: "Neon Harbor", position: 3120 },
  ];
  const historyRows = historySeed
    .map((entry) => {
      const itemId = liveByName.get(entry.name) ?? movieByName.get(entry.name) ?? seriesByName.get(entry.name);
      if (!itemId) return null;
      return {
        userId,
        itemId,
        positionSecs: entry.position,
        durationSecs: 3600 + entry.position,
        playCount: 1,
        updatedAt: new Date(Date.now() - Math.round(Math.random() * 8) * 3600_000),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  if (historyRows.length > 0) {
    await db.insert(watchHistory).values(historyRows);
  }

  const allPlaylists = [xtreamPlaylist, m3uPlaylist, vodPlaylist];
  for (const playlist of allPlaylists) {
    const live = liveRows.filter((row) => row.playlistId === playlist.id).length;
    const movie = movieRows.filter((row) => row.playlistId === playlist.id).length;
    const series = playlist.id === xtreamPlaylist.id ? seriesRows.length : 0;
    await db
      .update(playlists)
      .set({ liveCount: live, movieCount: movie, seriesCount: series })
      .where(eq(playlists.id, playlist.id));
  }

  return { created: true };
}

/** Seeds the shared demo account (used on first run) with a ready-to-watch library. */
export async function seedDemoData(): Promise<{ created: boolean }> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return { created: false };

  const [demoUser] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Demo Viewer",
      passwordHash: hashPassword(DEMO_PASSWORD),
    })
    .returning();

  return seedContentForUser(demoUser.id);
}
