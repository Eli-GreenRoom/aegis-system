import Link from "next/link";
import { format } from "date-fns";
import type { Route } from "next";
import type { Pickup } from "@/lib/ground/repo";
import type { Person } from "@/lib/people";
import { formatCents } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  scheduled: "border-[--color-border-strong] text-[--color-fg-muted]",
  dispatched: "border-brand/40 text-brand",
  completed: "border-[--color-brand-mint]/40 text-mint",
  cancelled: "border-[--color-brand-coral]/40 text-coral",
};

interface VendorRef {
  id: string;
  name: string;
}

interface Props {
  pickups: Pickup[];
  people: Map<string, Person>;
  vendorsById: Map<string, VendorRef>;
}

export default function PickupsTable({ pickups, people, vendorsById }: Props) {
  if (pickups.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No pickups.</p>
      </div>
    );
  }

  return (
    <div className="border border-[--color-border] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
          <tr>
            <th className="text-left px-4 py-2 font-normal">When</th>
            <th className="text-left px-4 py-2 font-normal">Person</th>
            <th className="text-left px-4 py-2 font-normal">Route</th>
            <th className="text-left px-4 py-2 font-normal">Vehicle</th>
            <th className="text-left px-4 py-2 font-normal">Vendor / Driver</th>
            <th className="text-right px-4 py-2 font-normal">Cost</th>
            <th className="text-left px-4 py-2 font-normal">Status</th>
            <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {pickups.map((p) => {
            const person = people.get(`${p.personKind}:${p.personId}`);
            const vendor = p.vendorId ? vendorsById.get(p.vendorId) : null;
            return (
              <tr
                key={p.id}
                className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
              >
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                  {format(new Date(p.pickupDt), "EEE d MMM HH:mm")}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/ground/${p.id}` as Route}
                    className="text-[--color-fg] hover:text-brand"
                  >
                    {person?.name ?? "Unknown"}
                  </Link>
                  <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                    {p.personKind}
                  </div>
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                  <span className="text-mono">
                    {p.routeFrom} {"->"} {p.routeTo}
                  </span>
                  {(p.routeFromDetail || p.routeToDetail) && (
                    <div className="text-[10px] text-[--color-fg-subtle] mt-0.5">
                      {p.routeFromDetail ?? ""}{p.routeFromDetail && p.routeToDetail ? " - " : ""}{p.routeToDetail ?? ""}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                  {p.vehicleType ?? ""}
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                  {vendor?.name ?? ""}
                  {p.driverName && (
                    <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                      {p.driverName} {p.driverPhone ? `· ${p.driverPhone}` : ""}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg-muted]">
                  {p.costAmountCents != null
                    ? `${formatCents(p.costAmountCents)} ${p.costCurrency ?? ""}`.trim()
                    : ""}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${
                      STATUS_CLASSES[p.status] ??
                      "border-[--color-border-strong] text-[--color-fg-muted]"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/ground/${p.id}/edit` as Route}
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
  );
}
