import { getCurrentUser, unauthorized } from "@/lib/auth";
import { seedContentForUser } from "@/db/bootstrap";
import { getLibraryStats, listPlaylists } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** One-click starter library so a brand new account can immediately play something. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const result = await seedContentForUser(user.id);
  if (!result.created) {
    return Response.json({ error: "You already have playlists in your library." }, { status: 409 });
  }

  const [stats, playlists] = await Promise.all([getLibraryStats(user.id), listPlaylists(user.id)]);
  return Response.json({ ok: true, stats, playlists });
}
