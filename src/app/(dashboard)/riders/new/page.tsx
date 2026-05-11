export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import RiderForm from "../_components/RiderForm";

export default async function NewRiderPage() {
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
