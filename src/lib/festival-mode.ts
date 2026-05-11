import type { festivals } from "@/db/schema";

type Festival = typeof festivals.$inferSelect;

export function isFestivalMode(
  festival: Pick<Festival, "startDate" | "endDate" | "festivalModeActive">,
  now: Date = new Date(),
): boolean {
  if (festival.festivalModeActive) return true;
  const today = now.toISOString().slice(0, 10);
  return today >= festival.startDate && today <= festival.endDate;
}

export function autoFestivalMode(
  festival: Pick<Festival, "startDate" | "endDate">,
  now: Date = new Date(),
): boolean {
  const today = now.toISOString().slice(0, 10);
  return today >= festival.startDate && today <= festival.endDate;
}
