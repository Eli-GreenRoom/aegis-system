export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import ArtistForm from "../_components/ArtistForm";

export default async function NewArtistPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");
  const festival = await getActiveFestival(session);

  return (
    <>
      <Topbar
        title="New artist"
        subtitle="Add an artist to the current edition."
      />
      <div className="px-6 py-6">
        <ArtistForm festivalLocation={festival?.location ?? null} />
      </div>
    </>
  );
}
