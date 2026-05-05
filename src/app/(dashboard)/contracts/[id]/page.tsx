import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { getContract } from "@/lib/contracts/repo";
import ContractForm from "../_components/ContractForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const edition = await getCurrentEdition();
  const artists = await listArtists({
    editionId: edition.id,
    archived: "active",
  });

  return (
    <>
      <Topbar title="Contract" subtitle={`status: ${contract.status}`} />
      <div className="px-6 py-6">
        <ContractForm contract={contract} artists={artists} />
      </div>
    </>
  );
}
