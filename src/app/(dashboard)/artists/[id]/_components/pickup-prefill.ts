import type { ArtistRoadsheet } from "@/lib/aggregators";

/**
 * Derive pickup-form prefill from the artist's known travel. Pickups added
 * from the cockpit are almost always airport->hotel transfers tied to the
 * inbound flight; if no inbound exists yet, fall back to outbound (hotel->
 * airport).
 */
export function pickupPrefill(sheet: ArtistRoadsheet) {
  const inbound = sheet.inboundFlight;
  if (inbound?.scheduledDt) {
    const dt = new Date(inbound.scheduledDt);
    dt.setMinutes(dt.getMinutes() + 30);
    return {
      linkedFlightId: inbound.id,
      pickupDtLocal: toLocalDtString(dt),
      routeFrom: "airport" as const,
      routeTo: "hotel" as const,
    };
  }
  const outbound = sheet.outboundFlight;
  if (outbound?.scheduledDt) {
    const dt = new Date(outbound.scheduledDt);
    dt.setHours(dt.getHours() - 3);
    return {
      linkedFlightId: outbound.id,
      pickupDtLocal: toLocalDtString(dt),
      routeFrom: "hotel" as const,
      routeTo: "airport" as const,
    };
  }
  return undefined;
}

function toLocalDtString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
