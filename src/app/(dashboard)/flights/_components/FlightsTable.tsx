import Link from "next/link";
import type { Flight } from "@/lib/flights/repo";
import type { Person } from "@/lib/people";
import { format } from "date-fns";

interface Props {
  flights: Flight[];
  people: Map<string, Person>;
}

function fmtTime(dt: Date | string | null): string {
  if (!dt) return "";
  return format(new Date(dt), "HH:mm");
}

function fmtDate(dt: Date | string | null): string {
  if (!dt) return "";
  return format(new Date(dt), "d MMM");
}

function dayKey(dt: Date | string | null): string {
  if (!dt) return "unknown";
  return format(new Date(dt), "yyyy-MM-dd");
}

export default function FlightsTable({ flights, people }: Props) {
  if (flights.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No flights.</p>
      </div>
    );
  }

  const inbound = flights.filter((f) => f.direction === "inbound");
  const outbound = flights.filter((f) => f.direction === "outbound");

  // Build a map: personKey -> outbound flight for quick pairing
  const outboundByPerson = new Map<string, Flight[]>();
  for (const f of outbound) {
    const key = `${f.personKind}:${f.personId}`;
    if (!outboundByPerson.has(key)) outboundByPerson.set(key, []);
    outboundByPerson.get(key)!.push(f);
  }

  // Build rows: each inbound flight may have a paired outbound.
  // Unpaired outbound flights go at the end.
  const pairedOutboundIds = new Set<string>();

  interface Row {
    id: string;
    inbound: Flight | null;
    outbound: Flight | null;
    sortDt: Date;
  }

  const rows: Row[] = [];

  for (const f of inbound) {
    const key = `${f.personKind}:${f.personId}`;
    const outs = outboundByPerson.get(key) ?? [];
    // Pick the first unpaired outbound for this person
    const paired = outs.find((o) => !pairedOutboundIds.has(o.id)) ?? null;
    if (paired) pairedOutboundIds.add(paired.id);
    rows.push({
      id: f.id,
      inbound: f,
      outbound: paired,
      sortDt: f.scheduledDt ? new Date(f.scheduledDt) : new Date(0),
    });
  }

  // Unpaired outbound flights
  for (const f of outbound) {
    if (!pairedOutboundIds.has(f.id)) {
      rows.push({
        id: f.id,
        inbound: null,
        outbound: f,
        sortDt: f.scheduledDt ? new Date(f.scheduledDt) : new Date(0),
      });
    }
  }

  rows.sort((a, b) => a.sortDt.getTime() - b.sortDt.getTime());

  // Group rows by arrival date (or departure date for outbound-only)
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = dayKey(
      row.inbound?.scheduledDt ?? row.outbound?.scheduledDt ?? null,
    );
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  return (
    <div className="border border-[--color-border] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] bg-[--color-surface]">
          <tr>
            {/* Arrivals */}
            <th className="text-left px-3 py-2 font-normal text-[--color-sky] w-[16%]">
              Person
            </th>
            <th className="text-left px-3 py-2 font-normal w-[8%]">From</th>
            <th className="text-left px-3 py-2 font-normal w-[9%]">Date</th>
            <th className="text-left px-3 py-2 font-normal w-[7%]">Time</th>
            <th className="text-left px-3 py-2 font-normal w-[9%]">Flight</th>
            {/* Divider */}
            <th className="w-[2%] bg-[--color-border]" />
            {/* Departures */}
            <th className="text-left px-3 py-2 font-normal text-[--color-warn] w-[16%]">
              Person
            </th>
            <th className="text-left px-3 py-2 font-normal w-[8%]">To</th>
            <th className="text-left px-3 py-2 font-normal w-[9%]">Date</th>
            <th className="text-left px-3 py-2 font-normal w-[7%]">Time</th>
            <th className="text-left px-3 py-2 font-normal w-[9%]">Flight</th>
          </tr>
          <tr>
            <th
              colSpan={5}
              className="text-center px-3 py-1 font-normal text-[--color-sky] border-t border-[--color-border]"
            >
              Arrivals
            </th>
            <th className="bg-[--color-border]" />
            <th
              colSpan={5}
              className="text-center px-3 py-1 font-normal text-[--color-warn] border-t border-[--color-border]"
            >
              Departures
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groups.entries()).map(([dateKey, dateRows]) => (
            <>
              {/* Date group header */}
              <tr
                key={`date-${dateKey}`}
                className="bg-[--color-surface]/60 border-t border-[--color-border]"
              >
                <td colSpan={11} className="px-3 py-1">
                  <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
                    {dateKey !== "unknown"
                      ? format(new Date(dateKey + "T12:00:00Z"), "EEEE, d MMMM")
                      : "Unknown date"}
                  </span>
                </td>
              </tr>
              {dateRows.map((row) => {
                const inPerson = row.inbound
                  ? people.get(
                      `${row.inbound.personKind}:${row.inbound.personId}`,
                    )
                  : null;
                const outPerson = row.outbound
                  ? people.get(
                      `${row.outbound.personKind}:${row.outbound.personId}`,
                    )
                  : null;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-[--color-border] hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Inbound */}
                    <td className="px-3 py-2 text-[--color-fg]">
                      {row.inbound ? (
                        <Link
                          href={`/flights/${row.inbound.id}`}
                          className="hover:text-[--color-sky]"
                        >
                          {inPerson?.name ?? "Unknown"}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {row.inbound?.fromAirport ?? ""}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {fmtDate(row.inbound?.scheduledDt ?? null)}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs font-medium text-[--color-fg]">
                      {fmtTime(row.inbound?.scheduledDt ?? null)}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {row.inbound?.flightNumber ?? ""}
                    </td>

                    {/* Divider */}
                    <td className="bg-[--color-border] w-px p-0" />

                    {/* Outbound */}
                    <td className="px-3 py-2 text-[--color-fg]">
                      {row.outbound ? (
                        <Link
                          href={`/flights/${row.outbound.id}`}
                          className="hover:text-[--color-warn]"
                        >
                          {outPerson?.name ?? "Unknown"}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {row.outbound?.toAirport ?? ""}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {fmtDate(row.outbound?.scheduledDt ?? null)}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs font-medium text-[--color-fg]">
                      {fmtTime(row.outbound?.scheduledDt ?? null)}
                    </td>
                    <td className="px-3 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {row.outbound?.flightNumber ?? ""}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
