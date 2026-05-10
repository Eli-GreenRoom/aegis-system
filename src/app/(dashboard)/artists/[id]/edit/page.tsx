export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getArtist } from "@/lib/artists/repo";
import ArtistForm from "../../_components/ArtistForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArtistPage({ params }: PageProps) {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) notFound();

  return (
    <>
      <Topbar title={`Edit ${artist.name}`} subtitle={artist.slug} />
      <div className="px-6 py-6">
        <ArtistForm artist={artist} />
      </div>
    </>
  );
}
