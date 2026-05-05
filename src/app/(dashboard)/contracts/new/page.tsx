import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import ContractForm from "../_components/ContractForm";

export default async function NewContractPage() {
  const edition = await getCurrentEdition();
  const artists = await listArtists({
    editionId: edition.id,
    archived: "active",
  });

  if (artists.length === 0) {
    return (
      <>
        <Topbar title="New contract" subtitle="Add an artist first." />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No artists on this edition yet.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="New contract"
        subtitle="Draft -> sent -> signed."
      />
      <div className="px-6 py-6">
        <ContractForm artists={artists} />
      </div>
    </>
  );
}
