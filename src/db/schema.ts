import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playlists = pgTable(
  "playlists",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** "m3u" | "xtream" */
    kind: text("kind").notNull().default("m3u"),
    sourceUrl: text("source_url"),
    serverUrl: text("server_url"),
    username: text("username"),
    password: text("password"),
    epgUrl: text("epg_url"),
    /** "ready" | "error" | "syncing" */
    status: text("status").notNull().default("ready"),
    statusMessage: text("status_message"),
    liveCount: integer("live_count").notNull().default(0),
    movieCount: integer("movie_count").notNull().default(0),
    seriesCount: integer("series_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    /** Items already written while a (potentially huge) import is running. */
    progressDone: integer("progress_done").notNull().default(0),
    /** Total items detected for the current import, when the source announces it. */
    progressTotal: integer("progress_total"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("playlists_user_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: integer("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    /** "live" | "movie" | "series" */
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    externalId: text("external_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("categories_unique_idx").on(table.playlistId, table.kind, table.name),
    index("categories_kind_idx").on(table.kind),
  ],
);

export const channels = pgTable(
  "channels",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: integer("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    /** "live" | "movie" | "series" | "episode" */
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    logo: text("logo"),
    groupTitle: text("group_title"),
    categoryId: integer("category_id"),
    streamUrl: text("stream_url").notNull(),
    tvgId: text("tvg_id"),
    externalId: text("external_id"),
    containerExtension: text("container_extension"),
    rating: text("rating"),
    plot: text("plot"),
    castActors: text("cast_actors"),
    director: text("director"),
    genre: text("genre"),
    releaseDate: text("release_date"),
    durationSecs: integer("duration_secs"),
    parentId: integer("parent_id"),
    season: integer("season"),
    episode: integer("episode"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("channels_user_kind_idx").on(table.userId, table.kind),
    index("channels_playlist_idx").on(table.playlistId),
    index("channels_parent_idx").on(table.parentId),
    index("channels_name_idx").on(table.name),
    index("channels_group_idx").on(table.playlistId, table.kind, table.groupTitle),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("favorites_unique_idx").on(table.userId, table.itemId)],
);

export const watchHistory = pgTable(
  "watch_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    positionSecs: integer("position_secs").notNull().default(0),
    durationSecs: integer("duration_secs"),
    playCount: integer("play_count").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("watch_history_unique_idx").on(table.userId, table.itemId)],
);

export const epgPrograms = pgTable(
  "epg_programs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("epg_item_idx").on(table.itemId, table.startsAt)],
);

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatar: text("avatar"),
    pin: text("pin"),
    isKids: boolean("is_kids").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("profiles_user_idx").on(table.userId)],
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: integer("profile_id"),
    query: text("query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("search_history_user_idx").on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type EpgProgram = typeof epgPrograms.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
