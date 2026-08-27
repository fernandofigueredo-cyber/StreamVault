import { requireUser } from "@/lib/auth";
import { listPlaylists } from "@/lib/queries";
import PlaylistManager from "@/components/PlaylistManager";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const user = await requireUser();
  const [{ import: importParam }, playlists] = await Promise.all([
    searchParams,
    listPlaylists(user.id),
  ]);

  return <PlaylistManager initialPlaylists={playlists} openImport={importParam === "1"} />;
}
