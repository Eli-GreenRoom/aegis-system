export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import GuestForm from "../_components/GuestForm";

export default async function NewGuestPage() {
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
