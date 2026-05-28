/**
 * Pure types + helpers used by both server and client code. Kept in its
 * own file so client components can import `hasGap` without dragging in
 * `db/client`, which reads env vars at module load.
 */

export interface ArtistStatusSummary {
  setStatus: string | null;
  contractStatus: string | null;
  inboundFlight: string | null;
  outboundFlight: string | null;
  hotelStatus: string | null;
  groundStatus: string | null;
  outstandingPayments: number;
  ridersReady: boolean | null;
  // Logistics requirement flags from the artists table
  needsFlight: boolean;
  needsHotel: boolean;
  needsGround: boolean;
  needsContract: boolean;
  needsPayment: boolean;
  needsRider: boolean;
}

export function hasGap(s: ArtistStatusSummary): boolean {
  if (!s.setStatus) return true;
  if (s.needsContract && !s.contractStatus) return true;
  if (s.needsPayment && s.outstandingPayments > 0) return true;
  if (s.needsFlight && (!s.inboundFlight || !s.outboundFlight)) return true;
  if (s.needsHotel && !s.hotelStatus) return true;
  if (s.needsGround && !s.groundStatus) return true;
  if (s.needsRider && s.ridersReady === null) return true;
  return false;
}
