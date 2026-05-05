import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import RiderForm from "../_components/RiderForm";

export default async function NewRiderPage() {
  const edition = await getCurrentEdition();
  const artists = await listArtists({
    editionId: edition.id,
    archived: "active",
  });

  if (artists.length === 0) {
    return (
      <>
        <Topbar title="New rider" subtitle="Add an artist first." />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No artists on this edition yet. Create one before logging riders.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="New rider"
        subtitle="Hospitality or technical, linked to one artist."
      />
      <div className="px-6 py-6">
        <RiderForm artists={artists} />
      </div>
    </>
  );
}
