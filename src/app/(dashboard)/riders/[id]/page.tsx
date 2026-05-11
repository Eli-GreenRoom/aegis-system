export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { getRider } from "@/lib/riders/repo";
import RiderForm from "../_components/RiderForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRiderPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const rider = await getRider(id);
  if (!rider) notFound();

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
        title="Edit rider"
        subtitle={`${rider.kind} · ${rider.confirmed ? "confirmed" : "pending"}`}
      />
      <div className="px-6 py-6">
        <RiderForm rider={rider} artists={artists} />
      </div>
    </>
  );
}
