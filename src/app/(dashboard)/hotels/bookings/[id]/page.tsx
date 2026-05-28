export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getBooking, listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import { getPerson, listPeople } from "@/lib/people";
import BookingForm from "../_components/BookingForm";
import AuditHistory from "@/components/ui/AuditHistory";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const [hotels, blocks, people, person] = await Promise.all([
    listHotels(),
    listRoomBlocks({ festivalId: festival.id }),
    listPeople(festival.id),
    getPerson(booking.personKind, booking.personId),
  ]);
  const artistHref =
    booking.personKind === "artist" ? `/artists/${booking.personId}` : null;

  return (
    <>
      <Topbar
        title="Booking"
        subtitle={`${booking.checkin} - ${booking.checkout}`}
        actions={
          artistHref && person ? (
            <Link href={artistHref as Route}>
              <Button variant="ghost" size="sm">
                &larr; {person.name}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="px-6 py-6">
        <BookingForm
          booking={booking}
          hotels={hotels}
          blocks={blocks}
          people={people}
          festivalDefaultNights={festival.defaultNightsCovered ?? null}
        />
        <AuditHistory entityType="hotel_booking" entityId={booking.id} />
      </div>
    </>
  );
}
