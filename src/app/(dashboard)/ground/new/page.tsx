export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listPeople } from "@/lib/people";
import { listVendors } from "@/lib/ground/repo";
import PickupForm from "../_components/PickupForm";

export default async function NewPickupPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

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
