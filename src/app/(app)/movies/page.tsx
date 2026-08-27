import { requireUser } from "@/lib/auth";
import { listCategories, listLibrary, listPlaylists } from "@/lib/queries";
import BrowseView from "@/components/BrowseView";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const user = await requireUser();
  const [library, categories, playlists] = await Promise.all([
    listLibrary(user.id, { kind: "movie", limit: 60 }),
    listCategories(user.id, "movie"),
    listPlaylists(user.id),
  ]);

  return (
    <BrowseView
      initialKind="movie"
      title="Movies"
      description="Every VOD item from your playlists, with ratings, runtimes and resume positions."
      initialItems={library.items}
      initialTotal={library.total}
      initialCategories={categories}
      playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
    />
  );
}
