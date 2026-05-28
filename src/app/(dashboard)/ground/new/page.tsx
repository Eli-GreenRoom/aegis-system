export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listPeople, type PersonKind } from "@/lib/people";
import PickupForm from "../_components/PickupForm";

interface PageProps {
  searchParams: Promise<{
    personId?: string;
    personKind?: string;
  }>;
}

export default async function NewPickupPage({ searchParams }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const sp = await searchParams;
  const people = await listPeople(festival.id);

  const kind: PersonKind | undefined =
    sp.personKind === "crew" || sp.personKind === "artist"
      ? sp.personKind
      : undefined;
  const defaultPerson =
    sp.personId &&
    kind &&
    people.some((p) => p.id === sp.personId && p.kind === kind)
      ? { id: sp.personId, kind }
      : undefined;

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
        <PickupForm people={people} defaultPerson={defaultPerson} />
      </div>
    </>
  );
}
