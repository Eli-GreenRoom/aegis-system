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
  /** True iff at least one payment record exists for this artist (any
   *  status, including paid/void). Lets the UI tell "nothing logged
   *  yet" from "all paid". */
  hasAnyPayment: boolean;
  /** Count of payment rows whose status is not 'paid' and not 'void'. */
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
  // A withdrawn or not-available set status is operationally equivalent
  // to "this artist is not playing" - the slot still needs filling, so
  // count it as a gap on the readiness view.
  if (
    !s.setStatus ||
    s.setStatus === "withdrawn" ||
    s.setStatus === "not_available"
  )
    return true;
  if (s.needsContract && !s.contractStatus) return true;
  if (s.needsPayment && (!s.hasAnyPayment || s.outstandingPayments > 0))
    return true;
  if (s.needsFlight && (!s.inboundFlight || !s.outboundFlight)) return true;
  if (s.needsHotel && !s.hotelStatus) return true;
  if (s.needsGround && !s.groundStatus) return true;
  if (s.needsRider && s.ridersReady === null) return true;
  return false;
}
