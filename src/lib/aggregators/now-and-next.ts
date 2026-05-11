import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { artists, sets, slots } from "@/db/schema";

interface SlotSet {
  setId: string;
  status: string;
  slotId: string;
  slotStartTime: string;
  slotEndTime: string;
  slotDate: string;
  artistId: string;
  artistName: string;
}

export interface NowAndNext {
  /** Currently-`live` set if there is one, else the most recently started
   *  set whose end hasn't passed yet. */
  now: SlotSet | null;
  /** Next confirmed-or-live set after `atTime`. */
  next: SlotSet | null;
}

/**
 * Per stage: the currently-live set + the next confirmed-or-live set.
 *
 * `atTime` is compared against slot HH:MM strings. Caller passes a JS
 * Date; we extract its HH:MM in the local server timezone (Beirut/UTC+3
 * for production), matching how slot times are stored.
 *
 * Spec: docs/OPERATIONS-FLOW.md -4.
 */
export async function getNowAndNext(
  stageId: string,
  atTime: Date = new Date(),
): Promise<NowAndNext> {
  const slotRows = await db
    .select()
    .from(slots)
    .where(eq(slots.stageId, stageId))
    .orderBy(asc(slots.date), asc(slots.startTime));

  if (slotRows.length === 0) return { now: null, next: null };

  const slotIds = slotRows.map((s) => s.id);
  const setRows = await db
    .select({
      set: sets,
      artist: { id: artists.id, name: artists.name },
    })
    .from(sets)
    .innerJoin(artists, eq(sets.artistId, artists.id))
    .where(inArray(sets.slotId, slotIds))
    .orderBy(asc(sets.createdAt));

  const slotsById = new Map(slotRows.map((s) => [s.id, s]));
  const all: SlotSet[] = setRows
    .filter((r) => slotsById.has(r.set.slotId))
    .map((r) => {
      const slot = slotsById.get(r.set.slotId)!;
      return {
        setId: r.set.id,
        status: r.set.status,
        slotId: slot.id,
        slotStartTime: slot.startTime,
        slotEndTime: slot.endTime,
        slotDate: slot.date,
        artistId: r.artist.id,
        artistName: r.artist.name,
      };
    });

  const hh = String(atTime.getHours()).padStart(2, "0");
  const mm = String(atTime.getMinutes()).padStart(2, "0");
  const t = `${hh}:${mm}`;

  // "now": prefer status='live'. Fallback to a confirmed set whose
  // window contains `t`. Slot windows that cross midnight (e.g. 23:00 -
  // 01:00) are interpreted as "still live until end on next day".
  const liveSet = all.find((s) => s.status === "live") ?? null;
  let now: SlotSet | null = liveSet;
  if (!now) {
    now =
      all.find(
        (s) =>
          (s.status === "confirmed" || s.status === "live") &&
          inSlotWindow(t, s.slotStartTime, s.slotEndTime),
      ) ?? null;
  }

  // "next": earliest confirmed-or-live set whose start time is after `t`
  // and isn't already the "now" pick. Sort by (date, startTime)
  // lexicographically - YYYY-MM-DD strings sort correctly as-is.
  const ordered = [...all].sort((a, b) => {
    const dateCmp = a.slotDate.localeCompare(b.slotDate);
    if (dateCmp !== 0) return dateCmp;
    return a.slotStartTime.localeCompare(b.slotStartTime);
  });
  const next =
    ordered.find(
      (s) =>
        s.setId !== now?.setId &&
        (s.status === "confirmed" || s.status === "live") &&
        s.slotStartTime > t,
    ) ?? null;

  return { now, next };
}

/**
 * True if `t` (HH:MM) is within `[start, end)`, accounting for slot
 * windows that wrap past midnight (e.g. 23:00-01:00 means 23:00..23:59
 * AND 00:00..00:59).
 */
function inSlotWindow(t: string, start: string, end: string): boolean {
  if (start <= end) {
    return t >= start && t < end;
  }
  // Wraps midnight.
  return t >= start || t < end;
}
