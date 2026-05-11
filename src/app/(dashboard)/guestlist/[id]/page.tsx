export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { getGuestlistEntry } from "@/lib/guestlist/repo";
import GuestForm from "../_components/GuestForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const entry = await getGuestlistEntry(id);
  if (!entry) notFound();

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
      <Topbar title={entry.name} subtitle={entry.category} />
      <div className="px-6 py-6">
        <GuestForm entry={entry} artists={artists} />
      </div>
    </>
  );
}
