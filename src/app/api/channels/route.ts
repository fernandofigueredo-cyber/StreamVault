import { getCurrentUser, unauthorized } from "@/lib/auth";
import { listCategories, listLibrary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "live";
  const playlistId = searchParams.get("playlistId");
  const category = searchParams.get("category");
  const q = searchParams.get("q") ?? undefined;
  const favoriteOnly = searchParams.get("favorites") === "1";
  const limit = Number(searchParams.get("limit") ?? 60);
  const offset = Number(searchParams.get("offset") ?? 0);
  const withCategories = searchParams.get("withCategories") === "1";

  const result = await listLibrary(user.id, {
    kind,
    playlistId: playlistId ? Number(playlistId) : undefined,
    category: category && category !== "all" ? category : undefined,
    q: q && q.trim().length > 0 ? q.trim() : undefined,
    favoriteOnly,
    limit: Number.isFinite(limit) ? limit : 60,
    offset: Number.isFinite(offset) ? offset : 0,
    sort: (searchParams.get("sort") as "default" | "name" | "recent" | null) ?? "default",
  });

  const cats = withCategories ? await listCategories(user.id, kind, playlistId ? Number(playlistId) : undefined) : undefined;

  return Response.json({ items: result.items, total: result.total, categories: cats ?? [] });
}
