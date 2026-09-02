import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { searchHistory } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, user.id))
    .orderBy(desc(searchHistory.createdAt))
    .limit(20);
  // deduplicate by query
  const seen = new Set<string>();
  return Response.json({
    history: rows.filter((r) => {
      if (seen.has(r.query)) return false;
      seen.add(r.query);
      return true;
    }).slice(0, 10),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { query } = (await request.json()) as { query?: string };
  if (!query?.trim() || query.trim().length < 2) return Response.json({ ok: true });

  await db.insert(searchHistory).values({
    userId: user.id,
    query: query.trim(),
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  if (query) {
    await db
      .delete(searchHistory)
      .where(and(eq(searchHistory.userId, user.id), eq(searchHistory.query, query)));
  } else {
    await db.delete(searchHistory).where(eq(searchHistory.userId, user.id));
  }
  return Response.json({ ok: true });
}
