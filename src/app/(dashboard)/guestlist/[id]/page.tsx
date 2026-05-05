import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { getGuestlistEntry } from "@/lib/guestlist/repo";
import GuestForm from "../_components/GuestForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const entry = await getGuestlistEntry(id);
  if (!entry) notFound();

  const edition = await getCurrentEdition();
  const artists = await listArtists({
    editionId: edition.id,
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
