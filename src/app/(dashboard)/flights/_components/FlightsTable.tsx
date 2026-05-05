import Link from "next/link";
import type { Flight } from "@/lib/flights/repo";
import type { Person } from "@/lib/people";
import { format } from "date-fns";

const STATUS_CLASSES: Record<string, string> = {
  scheduled: "border-[--color-border-strong] text-[--color-fg-muted]",
  boarded: "border-brand/40 text-brand",
  in_air: "border-brand/40 text-brand",
  landed: "border-[--color-brand-mint]/40 text-mint",
  delayed: "border-[--color-brand-coral]/40 text-coral",
  cancelled: "border-[--color-brand-coral]/40 text-coral",
};

interface Props {
  flights: Flight[];
  people: Map<string, Person>;
}

export default function FlightsTable({ flights, people }: Props) {
  if (flights.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No flights.</p>
      </div>
    );
  }

  return (
    <div className="border border-[--color-border] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
          <tr>
            <th className="text-left px-4 py-2 font-normal">Person</th>
            <th className="text-left px-4 py-2 font-normal">Dir</th>
            <th className="text-left px-4 py-2 font-normal">Flight</th>
            <th className="text-left px-4 py-2 font-normal">Route</th>
            <th className="text-left px-4 py-2 font-normal">Scheduled</th>
            <th className="text-left px-4 py-2 font-normal">Status</th>
            <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {flights.map((f) => {
            const person = people.get(`${f.personKind}:${f.personId}`);
            return (
              <tr
                key={f.id}
                className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/flights/${f.id}`}
                    className="text-[--color-fg] hover:text-brand"
                  >
                    {person?.name ?? "Unknown"}
                  </Link>
                  <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                    {f.personKind}
                  </div>
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted] uppercase">
                  {f.direction === "inbound" ? "in" : "out"}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg]">
                  {f.flightNumber ?? ""}
                  {f.airline && (
                    <div className="text-[10px] text-[--color-fg-subtle]">{f.airline}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                  {f.fromAirport ?? "?"} - {f.toAirport ?? "?"}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                  {f.scheduledDt
                    ? format(new Date(f.scheduledDt), "EEE d MMM HH:mm")
                    : ""}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${
                      STATUS_CLASSES[f.status] ??
                      "border-[--color-border-strong] text-[--color-fg-muted]"
                    }`}
                  >
                    {f.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/flights/${f.id}/edit`}
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
