export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import { listPeople, type PersonKind } from "@/lib/people";
import BookingForm from "../_components/BookingForm";

interface PageProps {
  searchParams: Promise<{
    personId?: string;
    personKind?: string;
  }>;
}

export default async function NewBookingPage({ searchParams }: PageProps) {
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
  const [hotels, blocks, people] = await Promise.all([
    listHotels(),
    listRoomBlocks({ festivalId: festival.id }),
    listPeople(festival.id),
  ]);

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

  if (hotels.length === 0) {
    return (
      <>
        <Topbar title="New booking" subtitle="Add a hotel first." />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No hotels in the catalogue yet. Create one before adding a booking.
          </p>
        </div>
      </>
    );
  }
  if (people.length === 0) {
    return (
      <>
        <Topbar title="New booking" subtitle="Add a person first." />
        <div className="px-6 py-6 max-w-2xl">
          <p className="text-[--color-fg-muted]">
            No artists or crew on this edition yet.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="New booking"
        subtitle="Assign a person to a hotel for a date range."
      />
      <div className="px-6 py-6">
        <BookingForm
          hotels={hotels}
          blocks={blocks}
          people={people}
          defaultPerson={defaultPerson}
          festivalDefaultNights={festival.defaultNightsCovered ?? null}
        />
      </div>
    </>
  );
}
