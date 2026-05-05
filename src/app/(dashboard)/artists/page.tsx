import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listAgencies, listArtists, type ListArtistsParams } from "@/lib/artists/repo";
import ArtistsTable from "./_components/ArtistsTable";
import ArtistsFilters from "./_components/ArtistsFilters";
import ShareDialog from "./_components/ShareDialog";

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
  // The visible table respects the filters; the share dialog always offers
  // the full set of active artists so a search/agency filter doesn't
  // accidentally restrict what you share.
  const [artists, agencies, shareCandidates] = await Promise.all([
    listArtists({
      editionId: edition.id,
      search: sp.search,
      agency: sp.agency,
      archived,
    }),
    listAgencies(edition.id),
    listArtists({ editionId: edition.id, archived: "active" }),
  ]);

  const sharePicker = shareCandidates.map((a) => ({
    id: a.id,
    name: a.name,
    agency: a.agency,
    pressKitUrl: a.pressKitUrl,
  }));

  return (
    <>
      <Topbar
        title="Artists"
        subtitle={`${artists.length} ${artists.length === 1 ? "artist" : "artists"} for ${edition.name}`}
        actions={
          <div className="flex items-center gap-2">
            <ShareDialog artists={sharePicker} />
            <Link href="/artists/new">
              <Button>New artist</Button>
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <ArtistsFilters agencies={agencies} />
        <ArtistsTable artists={artists} />
      </div>
    </>
  );
}
