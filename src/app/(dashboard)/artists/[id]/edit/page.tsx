export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getArtist } from "@/lib/artists/repo";
import ArtistForm from "../../_components/ArtistForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArtistPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const [artist, festival] = await Promise.all([
    getArtist(id),
    getActiveFestival(session),
  ]);
  if (!artist) notFound();

  return (
    <>
      <Topbar title={`Edit ${artist.name}`} subtitle={artist.slug} />
      <div className="px-6 py-6">
        <ArtistForm
          artist={artist}
          festivalLocation={festival?.location ?? null}
        />
      </div>
    </>
  );
}
