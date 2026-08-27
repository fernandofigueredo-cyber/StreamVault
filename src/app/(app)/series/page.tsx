import { requireUser } from "@/lib/auth";
import { listCategories, listLibrary, listPlaylists } from "@/lib/queries";
import BrowseView from "@/components/BrowseView";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const user = await requireUser();
  const [library, categories, playlists] = await Promise.all([
    listLibrary(user.id, { kind: "series", limit: 60 }),
    listCategories(user.id, "series"),
    listPlaylists(user.id),
  ]);

  return (
    <BrowseView
      initialKind="series"
      title="Series"
      description="Full seasons and episodes pulled in from Xtream Codes portals."
      initialItems={library.items}
      initialTotal={library.total}
      initialCategories={categories}
      playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
    />
  );
}
