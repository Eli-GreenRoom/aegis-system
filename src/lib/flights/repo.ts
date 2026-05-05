import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { flights } from "@/db/schema";
import type {
  Direction,
  FlightDbValues,
  FlightStatus,
  PersonKind,
} from "./schema";

export type Flight = typeof flights.$inferSelect;

export interface ListFlightsParams {
  editionId: string;
  search?: string;
  direction?: Direction;
  status?: FlightStatus;
  personKind?: PersonKind;
  personId?: string;
}

export async function listFlights({
  editionId,
  search,
  direction,
  status,
  personKind,
  personId,
}: ListFlightsParams): Promise<Flight[]> {
  const filters = [eq(flights.editionId, editionId)];
  if (direction) filters.push(eq(flights.direction, direction));
  if (status) filters.push(eq(flights.status, status));
  if (personKind) filters.push(eq(flights.personKind, personKind));
  if (personId) filters.push(eq(flights.personId, personId));

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(flights.flightNumber, q),
      ilike(flights.airline, q),
      ilike(flights.fromAirport, q),
      ilike(flights.toAirport, q),
      ilike(flights.pnr, q)
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(flights)
    .where(and(...filters))
    .orderBy(asc(flights.scheduledDt));
}

export async function getFlight(id: string): Promise<Flight | null> {
  const [row] = await db
    .select()
    .from(flights)
    .where(eq(flights.id, id))
    .limit(1);
  return row ?? null;
}

export async function listFlightsForPerson(
  personKind: PersonKind,
  personId: string
): Promise<Flight[]> {
  return db
    .select()
    .from(flights)
    .where(
      and(eq(flights.personKind, personKind), eq(flights.personId, personId))
    )
    .orderBy(asc(flights.scheduledDt));
}

export async function createFlight(
  editionId: string,
  input: FlightDbValues
): Promise<Flight> {
  const [row] = await db
    .insert(flights)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateFlight(
  id: string,
  input: Partial<FlightDbValues>
): Promise<Flight | null> {
  if (Object.keys(input).length === 0) return getFlight(id);
  const [row] = await db
    .update(flights)
    .set(input)
    .where(eq(flights.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdateFlight(id: string, input: Partial<FlightDbValues>) {
  return db.update(flights).set(input).where(eq(flights.id, id)).returning();
}

export async function deleteFlight(id: string): Promise<Flight | null> {
  const [row] = await db.delete(flights).where(eq(flights.id, id)).returning();
  return row ?? null;
}
