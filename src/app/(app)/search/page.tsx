import { requireUser } from "@/lib/auth";
import { listPlaylists, searchEverything } from "@/lib/queries";
import BrowseView from "@/components/BrowseView";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireUser();
  const query = (q ?? "").trim();
  const [items, playlists] = await Promise.all([
    query ? searchEverything(user.id, query) : Promise.resolve([]),
    listPlaylists(user.id),
  ]);

  return (
    <BrowseView
      mode="search"
      initialKind="all"
      title={query ? `Results for “${query}”` : "Search your library"}
      description={
        query
          ? `${items.length} matching channels, movies, series and episodes.`
          : "Search runs across every imported playlist — channels, films, series and episodes."
      }
      initialItems={items}
      initialTotal={items.length}
      initialCategories={[]}
      initialQuery={query}
      playlists={playlists.map((playlist) => ({ id: playlist.id, name: playlist.name }))}
    />
  );
}
