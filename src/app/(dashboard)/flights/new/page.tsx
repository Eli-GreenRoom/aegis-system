export const dynamic = "force-dynamic";

import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listPeople } from "@/lib/people";
import FlightForm from "../_components/FlightForm";

export default async function NewFlightPage() {
  const edition = await getCurrentEdition();
  const people = await listPeople(edition.id);

  if (people.length === 0) {
    return (
      <>
        <Topbar
          title="New flight"
          subtitle="Add an artist or crew member first."
        />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No people on this edition yet. Create an artist or crew member
            before adding a flight.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="New flight"
        subtitle="Add a leg for an artist or crew member."
      />
      <div className="px-6 py-6">
        <FlightForm people={people} />
      </div>
    </>
  );
}
