export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { getContract } from "@/lib/contracts/repo";
import ContractForm from "../_components/ContractForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const artists = await listArtists({
    festivalId: festival.id,
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
