import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listAgencies, listArtists, type ListArtistsParams } from "@/lib/artists/repo";
import ArtistsTable from "./_components/ArtistsTable";
import ArtistsFilters from "./_components/ArtistsFilters";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    agency?: string;
    archived?: string;
  }>;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const archivedRaw = sp.archived ?? "active";
  const archived: ListArtistsParams["archived"] =
    archivedRaw === "archived" || archivedRaw === "all" ? archivedRaw : "active";

  const edition = await getCurrentEdition();
  const [artists, agencies] = await Promise.all([
    listArtists({
      editionId: edition.id,
      search: sp.search,
      agency: sp.agency,
      archived,
    }),
    listAgencies(edition.id),
  ]);

  return (
    <>
      <Topbar
        title="Artists"
        subtitle={`${artists.length} ${artists.length === 1 ? "artist" : "artists"} for ${edition.name}`}
        actions={
          <Link href="/artists/new">
            <Button>New artist</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <ArtistsFilters agencies={agencies} />
        <ArtistsTable artists={artists} />
      </div>
    </>
  );
}
