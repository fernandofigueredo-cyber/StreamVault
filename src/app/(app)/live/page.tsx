import { requireUser } from "@/lib/auth";
import { listCategories, listLibrary, listPlaylists } from "@/lib/queries";
import BrowseView from "@/components/BrowseView";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const user = await requireUser();
  const [library, categories, playlists] = await Promise.all([
    listLibrary(user.id, { kind: "live", limit: 60 }),
    listCategories(user.id, "live"),
    listPlaylists(user.id),
  ]);

  return (
    <BrowseView
      initialKind="live"
      title="Live TV"
      description="Channels grouped by category, with what's on right now underneath every card."
      initialItems={library.items}
      initialTotal={library.total}
      initialCategories={categories}
      playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
    />
  );
}
