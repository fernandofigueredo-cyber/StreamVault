import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureBootstrapped } from "@/db/bootstrap";
import {
  createSessionToken,
  sessionCookieMaxAge,
  sessionCookieName,
  isSecureRequest,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureBootstrapped();
  } catch {
    /* fall through — the schema may already exist */
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "Those credentials didn't work. Please try again." }, { status: 401 });
  }

  const store = await cookies();
  store.set(sessionCookieName, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge,
    secure: isSecureRequest(request),
  });

  return Response.json({ user: toPublicUser(user) });
}
