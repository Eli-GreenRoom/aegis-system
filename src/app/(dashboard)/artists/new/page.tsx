export const dynamic = "force-dynamic";

import Topbar from "@/components/dashboard/Topbar";
import ArtistForm from "../_components/ArtistForm";

export default function NewArtistPage() {
  return (
    <>
      <Topbar
        title="New artist"
        subtitle="Add an artist to the current edition."
      />
      <div className="px-6 py-6">
        <ArtistForm />
      </div>
    </>
  );
}
