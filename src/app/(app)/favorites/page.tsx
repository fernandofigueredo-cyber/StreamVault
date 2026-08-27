import { requireUser } from "@/lib/auth";
import { listFavorites, listPlaylists } from "@/lib/queries";
import BrowseView from "@/components/BrowseView";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireUser();
  const [items, playlists] = await Promise.all([listFavorites(user.id, 60), listPlaylists(user.id)]);

  return (
    <BrowseView
      mode="favorites"
      initialKind="all"
      title="Favourites"
      description="Everything you starred, stored on your account and mirrored locally for instant loading."
      initialItems={items}
      initialTotal={items.length}
      initialCategories={[]}
      playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
    />
  );
}
