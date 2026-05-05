import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getPickup, listVendors } from "@/lib/ground/repo";
import { listPeople } from "@/lib/people";
import PickupForm from "../../_components/PickupForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPickupPage({ params }: PageProps) {
  const { id } = await params;
  const pickup = await getPickup(id);
  if (!pickup) notFound();

  const edition = await getCurrentEdition();
  const [people, vendors] = await Promise.all([
    listPeople(edition.id),
    listVendors(),
  ]);

  return (
    <>
      <Topbar
        title="Edit pickup"
        subtitle={`${pickup.routeFrom} -> ${pickup.routeTo}`}
      />
      <div className="px-6 py-6">
        <PickupForm pickup={pickup} people={people} vendors={vendors} />
      </div>
    </>
  );
}
