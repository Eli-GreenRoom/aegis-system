import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { hotelBookingStatusEnum, personKindEnum } from "@/lib/hotels/schema";
import { listBookings, listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import { resolvePeople } from "@/lib/people";
import { formatCents } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    hotelId?: string;
    roomBlockId?: string;
    personKind?: string;
    personId?: string;
    status?: string;
    activeFrom?: string;
    activeTo?: string;
  }>;
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const statusParsed = sp.status
    ? hotelBookingStatusEnum.safeParse(sp.status)
    : null;
  const personKindParsed = sp.personKind
    ? personKindEnum.safeParse(sp.personKind)
    : null;

  const [bookings, hotels, blocks] = await Promise.all([
    listBookings({
      editionId: edition.id,
      hotelId: sp.hotelId,
      roomBlockId: sp.roomBlockId,
      status: statusParsed?.success ? statusParsed.data : undefined,
      personKind: personKindParsed?.success ? personKindParsed.data : undefined,
      personId: sp.personId,
      activeFrom: sp.activeFrom,
      activeTo: sp.activeTo,
    }),
    listHotels(),
    listRoomBlocks({ editionId: edition.id }),
  ]);

  const people = await resolvePeople(
    bookings.map((b) => ({ kind: b.personKind, id: b.personId })),
  );

  const hotelsById = new Map(hotels.map((h) => [h.id, h.name]));
  const blocksById = new Map(blocks.map((b) => [b.id, b.label ?? b.roomType]));

  return (
    <>
      <Topbar
        title="Bookings"
        subtitle={`${bookings.length} on ${edition.name}`}
        actions={
          <Link href={"/hotels/bookings/new" as Route}>
            <Button>New booking</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <Filter label="Hotel" name="hotelId" value={sp.hotelId ?? ""}>
            <option value="">All hotels</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Filter>
          <Filter label="Status" name="status" value={sp.status ?? ""}>
            <option value="">Any</option>
            <option value="tentative">Tentative</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="no_show">No show</option>
            <option value="cancelled">Cancelled</option>
          </Filter>
          <Filter
            label="Person kind"
            name="personKind"
            value={sp.personKind ?? ""}
          >
            <option value="">Any</option>
            <option value="artist">Artist</option>
            <option value="crew">Crew</option>
          </Filter>
          <DateInput
            label="Active from"
            name="activeFrom"
            value={sp.activeFrom ?? ""}
          />
          <DateInput
            label="Active to"
            name="activeTo"
            value={sp.activeTo ?? ""}
          />
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        {bookings.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No bookings.</p>
          </div>
        ) : (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Person</th>
                  <th className="text-left px-4 py-2 font-normal">Hotel</th>
                  <th className="text-left px-4 py-2 font-normal">Block</th>
                  <th className="text-left px-4 py-2 font-normal">Check-in</th>
                  <th className="text-left px-4 py-2 font-normal">Check-out</th>
                  <th className="text-right px-4 py-2 font-normal">Credits</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((bk) => {
                  const person = people.get(`${bk.personKind}:${bk.personId}`);
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
                      <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                        <Link
                          href={`/hotels/${bk.hotelId}` as Route}
                          className="hover:text-brand"
                        >
                          {hotelsById.get(bk.hotelId) ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                        {bk.roomBlockId ? (
                          (blocksById.get(bk.roomBlockId) ?? "(deleted)")
                        ) : (
                          <span className="italic">walk-up</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                        {bk.checkin}
                      </td>
                      <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                        {bk.checkout}
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
      </div>
    </>
  );
}

function Filter({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] min-w-[140px]"
      >
        {children}
      </select>
    </label>
  );
}

function DateInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
        {label}
      </span>
      <input
        type="date"
        name={name}
        defaultValue={value}
        className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
      />
    </label>
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
