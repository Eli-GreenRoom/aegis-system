/**
 * Phase 0 seed: create the "Aegis Productions" workspace and owner team
 * member, then backfill workspace_id on every existing tenant row.
 *
 * Run AFTER migration A (nullable workspace_id columns exist) and BEFORE
 * migration B (the NOT NULL flip). The script is idempotent.
 *
 * Usage: npm run db:seed
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { isNull, sql } from "drizzle-orm";
import * as schema from "./schema";
import type { PgTable } from "drizzle-orm/pg-core";

loadEnvConfig(process.cwd());

const WORKSPACE_NAME = "Aegis Productions";
const WORKSPACE_SLUG = "aegis-productions";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "booking@aegisfestival.com";

// Tenant tables that need workspace_id backfilled.
// Using explicit array so TS knows these are real PgTables.
const TENANT_TABLES: Array<{
  name: string;
  table: PgTable & { workspaceId: unknown };
}> = [
  {
    name: "artists",
    table: schema.artists as PgTable & { workspaceId: unknown },
  },
  { name: "crew", table: schema.crew as PgTable & { workspaceId: unknown } },
  {
    name: "flights",
    table: schema.flights as PgTable & { workspaceId: unknown },
  },
  {
    name: "vendors",
    table: schema.vendors as PgTable & { workspaceId: unknown },
  },
  {
    name: "ground_transport_pickups",
    table: schema.groundTransportPickups as PgTable & { workspaceId: unknown },
  },
  {
    name: "hotels",
    table: schema.hotels as PgTable & { workspaceId: unknown },
  },
  {
    name: "hotel_bookings",
    table: schema.hotelBookings as PgTable & { workspaceId: unknown },
  },
  {
    name: "invoices",
    table: schema.invoices as PgTable & { workspaceId: unknown },
  },
  {
    name: "payments",
    table: schema.payments as PgTable & { workspaceId: unknown },
  },
  {
    name: "guestlist_entries",
    table: schema.guestlistEntries as PgTable & { workspaceId: unknown },
  },
  {
    name: "documents",
    table: schema.documents as PgTable & { workspaceId: unknown },
  },
  {
    name: "audit_events",
    table: schema.auditEvents as PgTable & { workspaceId: unknown },
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sqlClient = neon(url);
  const db = drizzle(sqlClient, { schema });

  // 1. Look up the owner's user row from better-auth's `user` table.
  //    better-auth owns this table; we query it via raw sql tag.
  const userRows =
    await sqlClient`SELECT id FROM "user" WHERE email = ${OWNER_EMAIL} LIMIT 1`;
  if (userRows.length === 0) {
    throw new Error(
      `Owner user not found for email: ${OWNER_EMAIL}\n` +
        `Ensure the owner has signed up at least once before running seed.`,
    );
  }
  const ownerUserId: string = (userRows[0] as { id: string }).id;
  console.log(`Found owner user: ${ownerUserId} (${OWNER_EMAIL})`);

  // 2. Upsert workspace.
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ name: WORKSPACE_NAME, slug: WORKSPACE_SLUG, ownerUserId })
    .onConflictDoUpdate({
      target: schema.workspaces.slug,
      set: { name: WORKSPACE_NAME, ownerUserId },
    })
    .returning();
  console.log(`Workspace: ${workspace.id} (${workspace.name})`);

  // 3. Upsert owner team_member row.
  const [member] = await db
    .insert(schema.teamMembers)
    .values({
      workspaceId: workspace.id,
      userId: ownerUserId,
      email: OWNER_EMAIL,
      role: "owner",
      status: "active",
      permissions: {},
      festivalScope: null,
      acceptedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.teamMembers.workspaceId, schema.teamMembers.email],
      set: {
        userId: ownerUserId,
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      },
    })
    .returning();
  console.log(`Team member: ${member.id} (role: ${member.role})`);

  const wsId = workspace.id;

  // 4. Backfill workspace_id on every tenant table (WHERE workspace_id IS NULL).
  for (const { name, table } of TENANT_TABLES) {
    const wsCol = table.workspaceId;
    const result = await db
      .update(table)
      .set({ workspaceId: wsId })
      .where(isNull(wsCol as Parameters<typeof isNull>[0]))
      .returning({ id: sql<string>`id` });
    console.log(`  ${name}: backfilled ${result.length} rows`);
  }

  console.log(
    "\nSeed complete. Now run migration B to flip columns to NOT NULL.",
  );
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
