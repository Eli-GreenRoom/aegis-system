export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listHotels, listRoomBlocks } from "@/lib/hotels/repo";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function HotelsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const [hotels, blocks] = await Promise.all([
    listHotels({ search: sp.search }),
    listRoomBlocks({ editionId: edition.id }),
  ]);

  // Aggregate rooms reserved per hotel for the current edition.
  const reservedByHotel = new Map<string, number>();
  const blocksByHotel = new Map<string, number>();
  for (const b of blocks) {
    reservedByHotel.set(
      b.hotelId,
      (reservedByHotel.get(b.hotelId) ?? 0) + (b.roomsReserved ?? 0),
    );
    blocksByHotel.set(b.hotelId, (blocksByHotel.get(b.hotelId) ?? 0) + 1);
  }

  return (
    <>
      <Topbar
        title="Hotels"
        subtitle={`${hotels.length} ${hotels.length === 1 ? "hotel" : "hotels"} · ${edition.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={"/hotels/bookings" as Route}>
              <Button variant="secondary">Bookings</Button>
            </Link>
            <Link href={"/hotels/new" as Route}>
              <Button>New hotel</Button>
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <form className="mb-4 flex items-center gap-2 max-w-sm">
          <input
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search hotels"
            className="flex-1 rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {hotels.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No hotels yet.</p>
          </div>
        ) : (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Name</th>
                  <th className="text-left px-4 py-2 font-normal">Location</th>
                  <th className="text-right px-4 py-2 font-normal">Blocks</th>
                  <th className="text-right px-4 py-2 font-normal">
                    Rooms reserved
                  </th>
                  <th className="text-left px-4 py-2 font-normal">Contact</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/hotels/${h.id}` as Route}
                        className="text-[--color-fg] hover:text-brand"
                      >
                        {h.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                      {h.location ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg-muted]">
                      {blocksByHotel.get(h.id) ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg]">
                      {reservedByHotel.get(h.id) ?? 0}
                    </td>
                    <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                      {h.contactName ?? ""}
                      {h.contactPhone && (
                        <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                          {h.contactPhone}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
