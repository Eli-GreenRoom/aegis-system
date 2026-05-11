export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import ContractForm from "../_components/ContractForm";

export default async function NewContractPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

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
      <Topbar title="New contract" subtitle="Draft -> sent -> signed." />
      <div className="px-6 py-6">
        <ContractForm artists={artists} />
      </div>
    </>
  );
}
