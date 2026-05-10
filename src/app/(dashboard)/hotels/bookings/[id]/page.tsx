export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getBooking, listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import { listPeople } from "@/lib/people";
import BookingForm from "../_components/BookingForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const edition = await getCurrentEdition();
  const [hotels, blocks, people] = await Promise.all([
    listHotels(),
    listRoomBlocks({ editionId: edition.id }),
    listPeople(edition.id),
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
