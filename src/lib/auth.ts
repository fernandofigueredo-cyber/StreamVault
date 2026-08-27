import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE_NAME = "iptv_session";
const SESSION_DAYS = 30;

function secret(): string {
  return process.env.SESSION_SECRET || "iptv-player-dev-secret-key-change-me";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, keyBuffer);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawId, rawExp, signature] = parts;
  const payload = `${rawId}.${rawExp}`;
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  const exp = Number(rawExp);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const id = Number(rawId);
  return Number.isFinite(id) ? id : null;
}

export const sessionCookieName = COOKIE_NAME;
export const sessionCookieMaxAge = SESSION_DAYS * 24 * 60 * 60;

export async function getCurrentUser(): Promise<User | null> {
  try {
    const store = await cookies();
    const userId = readSessionToken(store.get(COOKIE_NAME)?.value);
    if (!userId) return null;
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export type PublicUser = { id: number; email: string; name: string };

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Cookies are marked `secure` only when the request actually arrived over
 * HTTPS (including behind a reverse proxy). Without this, logging in on a
 * self-hosted `http://vps:3000` would silently fail because browsers refuse to
 * send secure cookies over plain HTTP.
 */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export function unauthorized() {
  return Response.json({ error: "You need to sign in to do that." }, { status: 401 });
}
