import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser, unauthorized, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const profileId = Number(id);

  const [profile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
    .limit(1);
  if (!profile) return Response.json({ error: "Perfil não encontrado." }, { status: 404 });

  const body = (await request.json()) as {
    name?: string;
    avatar?: string;
    pin?: string;
    removePin?: boolean;
    isKids?: boolean;
    isDefault?: boolean;
    verifyPin?: string;
  };

  // If PIN verification required
  if (body.verifyPin !== undefined) {
    if (!profile.pin) return Response.json({ ok: true });
    const ok = verifyPassword(body.verifyPin, profile.pin);
    return Response.json({ ok });
  }

  const patch: Record<string, unknown> = {};
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.avatar !== undefined) patch.avatar = body.avatar;
  if (body.pin) patch.pin = hashPassword(body.pin);
  if (body.removePin) patch.pin = null;
  if (body.isKids !== undefined) patch.isKids = body.isKids;
  if (body.isDefault) {
    await db.update(profiles).set({ isDefault: false }).where(eq(profiles.userId, user.id));
    patch.isDefault = true;
  }

  const [updated] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.id, profileId))
    .returning();

  return Response.json({ profile: { ...updated, pin: updated.pin ? "****" : null } });
}

export async function DELETE(_request: Request, ctx: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const profileId = Number(id);

  const all = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (all.length <= 1) {
    return Response.json({ error: "Não pode eliminar o único perfil." }, { status: 400 });
  }

  await db
    .delete(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)));

  return Response.json({ ok: true });
}
