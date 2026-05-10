export const dynamic = "force-dynamic";

import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import GuestForm from "../_components/GuestForm";

export default async function NewGuestPage() {
  const edition = await getCurrentEdition();
  const artists = await listArtists({
    editionId: edition.id,
    archived: "active",
  });

  return (
    <>
      <Topbar
        title="New guestlist entry"
        subtitle="DJ guest, comp winner, free list, etc."
      />
      <div className="px-6 py-6">
        <GuestForm artists={artists} />
      </div>
    </>
  );
}
