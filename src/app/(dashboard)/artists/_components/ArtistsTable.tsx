import Link from "next/link";
import type { Artist } from "@/lib/artists/repo";
import type { ArtistStatusSummary } from "@/lib/artists/status-types";
import { hasGap } from "@/lib/artists/status-types";

interface Props {
  artists: Artist[];
  statusMap: Map<string, ArtistStatusSummary>;
}

export default function ArtistsTable({ artists, statusMap }: Props) {
  if (artists.length === 0) {
    return (
      <div className="shadow-card rounded-[--radius-lg] p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No artists.</p>
      </div>
    );
  }

  return (
    <div className="shadow-card rounded-[--radius-lg] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
          <tr className="border-b border-white/6">
            <th className="text-left px-4 py-3 font-normal">Name</th>
            <th className="text-left px-4 py-3 font-normal">Set</th>
            <th className="text-left px-4 py-3 font-normal hidden sm:table-cell">
              Contract
            </th>
            <th className="text-left px-4 py-3 font-normal hidden md:table-cell">
              Flights
            </th>
            <th className="text-left px-4 py-3 font-normal hidden md:table-cell">
              Hotel
            </th>
            <th className="text-left px-4 py-3 font-normal hidden lg:table-cell">
              Payments
            </th>
            <th className="text-right px-4 py-3 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {artists.map((a) => {
            const s = statusMap.get(a.id);
            const gap = s ? hasGap(s) : false;
            return (
              <tr
                key={a.id}
                className="border-t border-white/4 hover:bg-[linear-gradient(90deg,var(--color-brand-glow),transparent_50%)] transition-colors"
              >
                {/* Name + gap indicator */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {gap ? (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-coral" />
                    ) : (
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{
                          background: a.color ?? "var(--color-fg-subtle)",
                        }}
                      />
                    )}
                    <div>
                      <Link
                        href={`/artists/${a.id}`}
                        className="text-[--color-fg] hover:text-brand transition-colors font-medium"
                      >
                        {a.name}
                      </Link>
                      {a.agency && (
                        <div className="text-[10px] text-[--color-fg-subtle]">
                          {a.agency}
                        </div>
                      )}
                      {a.archivedAt && (
                        <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
                          archived
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Set */}
                <td className="px-4 py-3">
                  <StatusPill value={s?.setStatus ?? null} map={SET_PILL} />
                </td>

                {/* Contract */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  {s && !s.needsContract ? (
                    <NA />
                  ) : (
                    <StatusPill
                      value={s?.contractStatus ?? null}
                      map={CONTRACT_PILL}
                    />
                  )}
                </td>

                {/* Flights */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {s && !s.needsFlight ? (
                    <NA />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <FlightDot label="in" status={s?.inboundFlight ?? null} />
                      <FlightDot
                        label="out"
                        status={s?.outboundFlight ?? null}
                      />
                    </div>
                  )}
                </td>

                {/* Hotel */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {s && !s.needsHotel ? (
                    <NA />
                  ) : (
                    <StatusPill
                      value={s?.hotelStatus ?? null}
                      map={HOTEL_PILL}
                    />
                  )}
                </td>

                {/* Payments */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  {s && !s.needsPayment ? (
                    <NA />
                  ) : s && !s.hasAnyPayment ? (
                    <span className="text-mono text-[10px] text-[--color-warn]">
                      missing
                    </span>
                  ) : s && s.outstandingPayments > 0 ? (
                    <span className="text-mono text-[10px] text-[--color-warn]">
                      {s.outstandingPayments} due
                    </span>
                  ) : (
                    <span className="text-mono text-[10px] text-[--color-brand]">
                      clear
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/artists/${a.id}`}
                    className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] hover:text-brand transition-colors"
                  >
                    view
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

// ── pill maps ────────────────────────────────────────────────────────────────

const SET_PILL: Record<string, string> = {
  confirmed: "pill-emerald",
  live: "pill-emerald",
  done: "pill-emerald",
  option: "pill-amber",
  not_available: "pill-coral",
  withdrawn: "pill-coral",
};

const CONTRACT_PILL: Record<string, string> = {
  signed: "pill-emerald",
  sent: "pill-amber",
  draft: "pill-amber",
};

const HOTEL_PILL: Record<string, string> = {
  confirmed: "pill-violet",
  checked_in: "pill-violet",
  checked_out: "pill-emerald",
  pending: "pill-amber",
  cancelled: "pill-coral",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function NA() {
  return (
    <span className="text-mono text-[9px] text-[--color-fg-subtle] opacity-40">
      N/A
    </span>
  );
}

function StatusPill({
  value,
  map,
}: {
  value: string | null;
  map: Record<string, string>;
}) {
  if (!value) {
    return (
      <span className="text-mono text-[10px] text-[--color-fg-subtle]">-</span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-1.5 py-px rounded text-mono text-[9px] uppercase tracking-[0.14em] ${map[value] ?? "pill-amber"}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function FlightDot({
  label,
  status,
}: {
  label: string;
  status: string | null;
}) {
  const ok =
    status === "confirmed" || status === "landed" || status === "departed";
  const present = status !== null;
  return (
    <span
      title={`${label}: ${status ?? "none"}`}
      className={`inline-flex items-center gap-1 text-mono text-[10px] ${
        !present
          ? "text-[--color-fg-subtle]"
          : ok
            ? "text-[--color-brand]"
            : "text-[--color-warn]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          !present
            ? "bg-[--color-fg-subtle]/30"
            : ok
              ? "bg-[--color-brand]"
              : "bg-[--color-warn]"
        }`}
      />
      {label}
    </span>
  );
}
