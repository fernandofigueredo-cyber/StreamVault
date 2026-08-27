import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureBootstrapped } from "@/db/bootstrap";
import {
  createSessionToken,
  hashPassword,
  isSecureRequest,
  sessionCookieMaxAge,
  sessionCookieName,
  toPublicUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureBootstrapped();
  } catch {
    /* schema already available */
  }

  let body: { email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (name.length < 2) {
    return Response.json({ error: "Please tell us your name." }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "That email is already registered. Try signing in." }, { status: 409 });
  }

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: hashPassword(password) })
    .returning();

  const store = await cookies();
  store.set(sessionCookieName, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge,
    secure: isSecureRequest(request),
  });

  return Response.json({ user: toPublicUser(user) }, { status: 201 });
}
