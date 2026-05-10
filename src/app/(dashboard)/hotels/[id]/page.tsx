export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import {
  getBlockCapacity,
  getHotel,
  listBookings,
  listRoomBlocks,
} from "@/lib/hotels/repo";
import { resolvePeople } from "@/lib/people";
import { formatCents } from "@/lib/utils";
import RoomBlocksSection from "./_components/RoomBlocksSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HotelDetailPage({ params }: PageProps) {
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) notFound();

  const edition = await getCurrentEdition();
  const blocks = await listRoomBlocks({ editionId: edition.id, hotelId: id });
  const bookings = await listBookings({
    editionId: edition.id,
    hotelId: id,
  });

  // Capacity per block. Sequential calls are fine here - blocks per hotel
  // is small (single digits in practice).
  const capacities = await Promise.all(
    blocks.map((b) => getBlockCapacity(b.id)),
  );

  const people = await resolvePeople(
    bookings.map((bk) => ({ kind: bk.personKind, id: bk.personId })),
  );

  return (
    <>
      <Topbar
        title={hotel.name}
        subtitle={hotel.location ?? undefined}
        actions={
          <Link href={`/hotels/${hotel.id}/edit` as Route}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-10">
        {/* Hotel info */}
        <section>
          <dl className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Row label="Address" value={hotel.address} />
            <Row label="Contact" value={hotel.contactName} />
            <Row label="Email" value={hotel.contactEmail} mono />
            <Row label="Phone" value={hotel.contactPhone} mono />
            {hotel.notes && (
              <div className="col-span-2">
                <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
                  Notes
                </dt>
                <dd className="text-[--color-fg] whitespace-pre-wrap">
                  {hotel.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Room blocks */}
        <RoomBlocksSection
          hotelId={hotel.id}
          blocks={blocks.map((b, i) => ({
            ...b,
            capacity: capacities[i],
          }))}
        />

        {/* Bookings */}
        <section>
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] text-[--color-fg]">
              Bookings on this hotel
            </h2>
            <Link href={"/hotels/bookings" as Route}>
              <Button variant="ghost">All bookings</Button>
            </Link>
          </header>
          {bookings.length === 0 ? (
            <p className="text-[--color-fg-subtle] text-sm italic">
              No bookings yet.
            </p>
          ) : (
            <div className="border border-[--color-border] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                  <tr>
                    <th className="text-left px-4 py-2 font-normal">Person</th>
                    <th className="text-left px-4 py-2 font-normal">
                      Check-in
                    </th>
                    <th className="text-left px-4 py-2 font-normal">
                      Check-out
                    </th>
                    <th className="text-left px-4 py-2 font-normal">
                      Room type
                    </th>
                    <th className="text-right px-4 py-2 font-normal">
                      Credits
                    </th>
                    <th className="text-left px-4 py-2 font-normal">Status</th>
                    <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((bk) => {
                    const person = people.get(
                      `${bk.personKind}:${bk.personId}`,
                    );
                    return (
                      <tr
                        key={bk.id}
                        className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                      >
                        <td className="px-4 py-2 text-[--color-fg]">
                          {person?.name ?? "Unknown"}
                          <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                            {bk.personKind}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                          {bk.checkin}
                        </td>
                        <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                          {bk.checkout}
                        </td>
                        <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                          {bk.roomType ?? ""}
                        </td>
                        <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg-muted]">
                          {bk.creditsAmountCents != null
                            ? `${formatCents(bk.creditsAmountCents)} ${bk.creditsCurrency ?? ""}`.trim()
                            : ""}
                        </td>
                        <td className="px-4 py-2">
                          <BookingStatusPill status={bk.status} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/hotels/bookings/${bk.id}` as Route}
                            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                          >
                            edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
        {label}
      </dt>
      <dd
        className={mono ? "text-mono text-[--color-fg]" : "text-[--color-fg]"}
      >
        {value ? value : <span className="text-[--color-fg-subtle]">-</span>}
      </dd>
    </div>
  );
}

const STATUS_CLASSES: Record<string, string> = {
  tentative: "border-[--color-border-strong] text-[--color-fg-muted]",
  booked: "border-brand/40 text-brand",
  checked_in: "border-[--color-brand]/60 text-mint",
  checked_out: "border-[--color-fg-subtle]/40 text-[--color-fg-muted]",
  no_show: "border-[--color-danger]/40 text-coral",
  cancelled: "border-[--color-danger]/40 text-coral",
};

function BookingStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${
        STATUS_CLASSES[status] ??
        "border-[--color-border-strong] text-[--color-fg-muted]"
      }`}
    >
      {status}
    </span>
  );
}
