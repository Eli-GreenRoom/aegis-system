export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getPickup, listVendors } from "@/lib/ground/repo";
import { listPeople } from "@/lib/people";
import PickupForm from "../../_components/PickupForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPickupPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const pickup = await getPickup(id);
  if (!pickup) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const [people, vendors] = await Promise.all([
    listPeople(festival.id),
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
