export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getBooking, listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import { listPeople } from "@/lib/people";
import BookingForm from "../_components/BookingForm";

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

  const [hotels, blocks, people] = await Promise.all([
    listHotels(),
    listRoomBlocks({ festivalId: festival.id }),
    listPeople(festival.id),
  ]);

  return (
    <>
      <Topbar
        title="Booking"
        subtitle={`${booking.checkin} - ${booking.checkout}`}
      />
      <div className="px-6 py-6">
        <BookingForm
          booking={booking}
          hotels={hotels}
          blocks={blocks}
          people={people}
        />
      </div>
    </>
  );
}
