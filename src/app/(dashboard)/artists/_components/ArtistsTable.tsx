import Link from "next/link";
import type { Artist } from "@/lib/artists/repo";
import type { ArtistStatusSummary } from "@/lib/artists/status";

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
          <tr className="border-b border-white/[0.06]">
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
            return (
              <tr
                key={a.id}
                className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{
                        background: a.color ?? "var(--color-fg-subtle)",
                      }}
                    />
                    <div>
                      <Link
                        href={`/artists/${a.id}`}
                        className="text-[--color-fg] hover:text-brand transition-colors font-medium"
                      >
                        {a.name}
                      </Link>
                      {a.archivedAt && (
                        <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
                          archived
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <StatusPill value={s?.setStatus ?? null} map={SET_MAP} />
                </td>

                <td className="px-4 py-3 hidden sm:table-cell">
                  <StatusPill
                    value={s?.contractStatus ?? null}
                    map={CONTRACT_MAP}
                  />
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <FlightDot label="in" status={s?.inboundFlight ?? null} />
                    <FlightDot label="out" status={s?.outboundFlight ?? null} />
                  </div>
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <StatusPill value={s?.hotelStatus ?? null} map={HOTEL_MAP} />
                </td>

                <td className="px-4 py-3 hidden lg:table-cell">
                  {s && s.outstandingPayments > 0 ? (
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

// ── Status pill maps ────────────────────────────────────────────────────────

type PillStyle = "ok" | "warn" | "muted";

const PILL: Record<PillStyle, string> = {
  ok: "bg-[--color-brand]/10 text-[--color-brand] border-[--color-brand]/20",
  warn: "bg-[--color-warn]/10 text-[--color-warn] border-[--color-warn]/20",
  muted: "bg-white/[0.03] text-[--color-fg-subtle] border-white/[0.06]",
};

const SET_MAP: Record<string, PillStyle> = {
  confirmed: "ok",
  live: "ok",
  done: "ok",
  option: "warn",
  not_available: "muted",
  withdrawn: "muted",
};

const CONTRACT_MAP: Record<string, PillStyle> = {
  signed: "ok",
  sent: "warn",
  draft: "warn",
};

const HOTEL_MAP: Record<string, PillStyle> = {
  confirmed: "ok",
  checked_in: "ok",
  checked_out: "ok",
  pending: "warn",
  cancelled: "muted",
};

function StatusPill({
  value,
  map,
}: {
  value: string | null;
  map: Record<string, PillStyle>;
}) {
  if (!value) {
    return (
      <span className="text-mono text-[10px] text-[--color-fg-subtle]">-</span>
    );
  }
  const style = map[value] ?? "muted";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-mono text-[10px] ${PILL[style]}`}
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
