/**
 * Festival-mode detection. Decides whether the dashboard should switch
 * to the "phone-driven, glanceable, one-tap" posture for live ops.
 *
 * Spec: docs/FESTIVAL-DAY.md (top section).
 */

import type { festivalEditions } from "@/db/schema";

type Edition = typeof festivalEditions.$inferSelect;

/**
 * `festivalModeActive` is the operator-controlled toggle: when true,
 * festival mode is forced on; when false, falls back to date-range
 * detection (today within [start, end]).
 *
 * To force-OFF outside dates we'd need a third state - we don't have
 * that yet, so the contract is:
 *   - `festivalModeActive=true` -> always on
 *   - `festivalModeActive=false` AND today in range -> on
 *   - otherwise -> off
 *
 * Settings page exposes the boolean directly. If Eli wants force-off
 * during the festival weekend, the date range is the limiting factor,
 * not the flag.
 */
export function isFestivalMode(
  edition: Pick<Edition, "startDate" | "endDate" | "festivalModeActive">,
  now: Date = new Date()
): boolean {
  if (edition.festivalModeActive) return true;
  const today = now.toISOString().slice(0, 10);
  return today >= edition.startDate && today <= edition.endDate;
}

/**
 * Auto-detected state - what the toggle would resolve to if the flag
 * were unset. Used by the Settings UI to render "Auto (currently ON)"
 * / "Auto (currently OFF)" hint copy.
 */
export function autoFestivalMode(
  edition: Pick<Edition, "startDate" | "endDate">,
  now: Date = new Date()
): boolean {
  const today = now.toISOString().slice(0, 10);
  return today >= edition.startDate && today <= edition.endDate;
}
