import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, favorites } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { listFavorites } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const items = await listFavorites(user.id);
  return Response.json({ items });
}

/** Toggles a favourite. Returns the new state so the UI can update optimistically. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: { itemId?: number };
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

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.itemId, itemId)))
    .limit(1);

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    return Response.json({ itemId, isFavorite: false });
  }

  await db.insert(favorites).values({ userId: user.id, itemId }).onConflictDoNothing();
  return Response.json({ itemId, isFavorite: true });
}
