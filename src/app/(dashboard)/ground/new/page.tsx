import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listPeople } from "@/lib/people";
import { listVendors } from "@/lib/ground/repo";
import PickupForm from "../_components/PickupForm";

export default async function NewPickupPage() {
  const edition = await getCurrentEdition();
  const [people, vendors] = await Promise.all([
    listPeople(edition.id),
    listVendors(),
  ]);

  if (people.length === 0) {
    return (
      <>
        <Topbar
          title="New pickup"
          subtitle="Add an artist or crew member first."
        />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No people on this edition yet. Create an artist or crew member
            before scheduling a pickup.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="New pickup" subtitle="Schedule a ground transport job." />
      <div className="px-6 py-6">
        <PickupForm people={people} vendors={vendors} />
      </div>
    </>
  );
}
