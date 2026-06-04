export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listPeople, type PersonKind } from "@/lib/people";
import { suggestPickupsForPerson } from "@/lib/ground/suggest";
import PickupForm from "../_components/PickupForm";
import SuggestPickups from "../_components/SuggestPickups";

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
        <Topbar title="New pickup" subtitle="Add an artist or crew member first." />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No people on this edition yet. Create an artist or crew member
            before scheduling a pickup.
          </p>
        </div>
      </>
    );
  }

  // Pre-fetch suggestions server-side for the default person so they appear
  // immediately without a client-side round trip.
  const firstPerson = defaultPerson ?? {
    id: people[0]!.id,
    kind: people[0]!.kind,
  };
  const { suggestions: initialSuggestions, hotelName: initialHotelName } =
    await suggestPickupsForPerson(
      festival.id,
      firstPerson.id,
      firstPerson.kind,
      festival.groundArrivalBufferMins ?? 120,
    );

  return (
    <>
      <Topbar title="New pickup" subtitle="Schedule ground transport." />
      <div className="px-6 py-6 max-w-2xl space-y-10">

        {/* Smart suggester */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-[--color-fg]">
              Suggested transfers
            </h2>
            <p className="text-xs text-[--color-fg-muted] mt-0.5">
              Based on flights and set times. Adjust times, uncheck any you
              don&apos;t need, then create all at once.
            </p>
          </div>
          <SuggestPickups
            people={people}
            defaultPerson={defaultPerson ?? { id: people[0]!.id, kind: people[0]!.kind }}
            initialSuggestions={initialSuggestions}
            initialHotelName={initialHotelName}
          />
        </section>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 border-t border-[--color-border]" />
          <span className="relative bg-[--color-bg] px-3 text-xs text-[--color-fg-muted] mx-auto block w-fit">
            or add manually
          </span>
        </div>

        {/* Manual form */}
        <section>
          <PickupForm people={people} defaultPerson={defaultPerson} />
        </section>

      </div>
    </>
  );
}
