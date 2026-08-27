import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getChannel, getEpisodesForSeries, getNowNext, getRelated } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const channelId = Number(id);
  if (!Number.isFinite(channelId)) return Response.json({ error: "Bad id." }, { status: 400 });

  const found = await getChannel(user.id, channelId);
  if (!found) return Response.json({ error: "Item not found." }, { status: 404 });

  const [epg, related] = await Promise.all([
    getNowNext(user.id, channelId),
    getRelated(user.id, found.item),
  ]);

  let episodes: Awaited<ReturnType<typeof getEpisodesForSeries>> = [];
  let parent: { id: number; name: string } | null = null;

  if (found.item.kind === "series") {
    episodes = await getEpisodesForSeries(user.id, channelId);
  } else if (found.item.kind === "episode") {
    const [self] = await db
      .select({ parentId: channels.parentId })
      .from(channels)
      .where(and(eq(channels.userId, user.id), eq(channels.id, channelId)))
      .limit(1);
    const parentId = self?.parentId ?? null;
    if (parentId) {
      const [parentRow] = await db
        .select({ id: channels.id, name: channels.name })
        .from(channels)
        .where(and(eq(channels.userId, user.id), eq(channels.id, parentId)))
        .limit(1);
      parent = parentRow ?? null;
      episodes = await getEpisodesForSeries(user.id, parentId);
    }
  }

  return Response.json({ item: found.item, playlist: found.playlist, epg, related, episodes, parent });
}
