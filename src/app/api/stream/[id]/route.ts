import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Signed playback proxy.
 *
 * IPTV portals usually redirect to random CDN hosts that do not send CORS
 * headers, so hls.js running in the browser cannot load their manifests or
 * segments. We stream the manifest/segments through the app, rewriting every
 * playlist URL back into a signed proxy link. This also keeps portal
 * credentials out of the browser.
 */

function secret() {
  return process.env.SESSION_SECRET || "iptv-player-dev-secret-key-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function signUrl(target: string) {
  return `${Buffer.from(target).toString("base64url")}.${sign(target)}`;
}

function readUrl(token: string | null): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  let target: string;
  try {
    target = Buffer.from(token.slice(0, separator), "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (sign(target) !== token.slice(separator + 1)) return null;
  if (!/^https?:\/\//i.test(target)) return null;
  return target;
}

const PLAYLIST_TYPES = /m3u8?|mpegurl|vnd\.apple\.mpegurl|x-mpegurl/i;

function proxied(itemId: number, target: string) {
  return `/api/stream/${itemId}?u=${encodeURIComponent(signUrl(target))}`;
}

function rewritePlaylist(body: string, itemId: number, baseUrl: string) {
  const absolutise = (value: string) => {
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  };

  const lines = body.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // #EXT-X-KEY:...URI="..." and #EXT-X-MAP:...URI="..."
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxied(itemId, absolutise(uri))}"`);
    }

    return proxied(itemId, absolutise(trimmed));
  });

  return lines.join("\n");
}

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) return Response.json({ error: "Bad id." }, { status: 400 });

  const { searchParams } = new URL(request.url);

  const [item] = await db
    .select({ id: channels.id, streamUrl: channels.streamUrl })
    .from(channels)
    .where(and(eq(channels.id, itemId), eq(channels.userId, user.id)))
    .limit(1);
  if (!item) return Response.json({ error: "Item not found." }, { status: 404 });

  // No token means "play this item" — start from its own stored stream URL.
  const target = readUrl(searchParams.get("u")) ?? item.streamUrl;

  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "IPTVPlayer/1.0",
        Accept: "*/*",
        ...(range ? { Range: range } : {}),
      },
    });
  } catch {
    return Response.json({ error: "Upstream stream could not be reached." }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return Response.json(
      { error: `Upstream responded with HTTP ${upstream.status}.` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const looksLikePlaylist = PLAYLIST_TYPES.test(contentType) || /\.m3u8(\?|$)/i.test(target);

  if (looksLikePlaylist) {
    const text = await upstream.text();
    const body = text.includes("#EXTM3U") || text.includes("#EXTINF") || text.includes("#EXT-X")
      ? rewritePlaylist(text, itemId, upstream.url || target)
      : rewritePlaylist(text, itemId, upstream.url || target);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store, no-transform",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const headers = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Cache-Control", "no-store, no-transform");
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, { status: upstream.status, headers });
}
