import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .orderBy(profiles.isDefault, profiles.createdAt);
  return Response.json({ profiles: rows.map((p) => ({ ...p, pin: p.pin ? "****" : null })) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as {
    name?: string;
    avatar?: string;
    pin?: string;
    isKids?: boolean;
    isDefault?: boolean;
  };

  if (!body.name?.trim()) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const count = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (body.isDefault) {
    await db
      .update(profiles)
      .set({ isDefault: false })
      .where(eq(profiles.userId, user.id));
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      userId: user.id,
      name: body.name.trim(),
      avatar: body.avatar ?? null,
      pin: body.pin ? hashPassword(body.pin) : null,
      isKids: body.isKids ?? false,
      isDefault: body.isDefault ?? count.length === 0,
    })
    .returning();

  return Response.json({ profile: { ...profile, pin: profile.pin ? "****" : null } }, { status: 201 });
}
