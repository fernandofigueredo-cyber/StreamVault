import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, watchHistory } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { listHistory, upsertHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const items = await listHistory(user.id);
  return Response.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: { itemId?: number; positionSecs?: number; durationSecs?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const itemId = Number(body.itemId);
  if (!Number.isFinite(itemId)) return Response.json({ error: "Bad item id." }, { status: 400 });

  const [owned] = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.id, itemId), eq(channels.userId, user.id)))
    .limit(1);
  if (!owned) return Response.json({ error: "Item not found." }, { status: 404 });

  await upsertHistory(user.id, itemId, Number(body.positionSecs ?? 0), body.durationSecs ?? null);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const itemId = Number(searchParams.get("itemId"));
  if (Number.isFinite(itemId) && itemId > 0) {
    await db
      .delete(watchHistory)
      .where(and(eq(watchHistory.userId, user.id), eq(watchHistory.itemId, itemId)));
  } else {
    await db.delete(watchHistory).where(eq(watchHistory.userId, user.id));
  }
  return Response.json({ ok: true });
}
