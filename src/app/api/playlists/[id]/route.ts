import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlists } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function loadOwned(userId: number, rawId: string) {
  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;
  const [row] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const playlist = await loadOwned(user.id, id);
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });
  return Response.json({ playlist });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const playlist = await loadOwned(user.id, id);
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });

  let body: {
    name?: string;
    isActive?: boolean;
    serverUrl?: string;
    username?: string;
    password?: string;
    epgUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.serverUrl === "string" && body.serverUrl.trim()) patch.serverUrl = body.serverUrl.trim();
  if (typeof body.username === "string" && body.username.trim()) patch.username = body.username.trim();
  if (typeof body.password === "string" && body.password.length > 0) patch.password = body.password;
  if (typeof body.epgUrl === "string") patch.epgUrl = body.epgUrl.trim() || null;

  if (Object.keys(patch).length === 0) {
    return Response.json({ playlist });
  }

  const [updated] = await db
    .update(playlists)
    .set(patch)
    .where(eq(playlists.id, playlist.id))
    .returning();
  return Response.json({ playlist: updated });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const playlist = await loadOwned(user.id, id);
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });
  await db.delete(playlists).where(eq(playlists.id, playlist.id));
  return Response.json({ ok: true });
}
