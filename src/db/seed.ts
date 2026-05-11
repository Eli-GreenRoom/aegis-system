/**
 * Seed script - idempotent. Handles both Phase 0 and Phase 1 backfills.
 *
 * Phase 0: create "Aegis Productions" workspace + owner team member,
 *          backfill workspace_id on every tenant table.
 * Phase 1: backfill workspace_id + slug on the existing festival row,
 *          backfill festival_id on stages (from edition_id already copied
 *          by migration 0007), seed the 4 default stages under the festival.
 *
 * Run between migration A (nullable columns) and migration B (NOT NULL flip).
 * Usage: npm run db:seed
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { eq, isNull, sql } from "drizzle-orm";
import * as schema from "./schema";
import type { PgTable } from "drizzle-orm/pg-core";

const DEFAULT_STAGE_SEEDS = [
  { name: "Main Stage", slug: "main", color: "#E5B85A", sortOrder: 0 },
  {
    name: "Alternative Stage",
    slug: "alternative",
    color: "#7C9EFF",
    sortOrder: 1,
  },
  { name: "Select Pool", slug: "select-pool", color: "#A78BFA", sortOrder: 2 },
  { name: "Collectives", slug: "collectives", color: "#F472B6", sortOrder: 3 },
] as const;

loadEnvConfig(process.cwd());

const WORKSPACE_NAME = "Aegis Productions";
const WORKSPACE_SLUG = "aegis-productions";
const FESTIVAL_SLUG = "aegis-festival-2026";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "booking@aegisfestival.com";

// Tables that need workspace_id backfilled (Phase 0).
const WORKSPACE_TENANT_TABLES: Array<{
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

  // -- Phase 0 ------------------------------------------------------------------

  // 1. Look up owner from better-auth user table.
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

  // 3. Upsert owner team_member.
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

  // 4. Backfill workspace_id on every workspace-scoped tenant table.
  for (const { name, table } of WORKSPACE_TENANT_TABLES) {
    const wsCol = table.workspaceId;
    const result = await db
      .update(table)
      .set({ workspaceId: wsId })
      .where(isNull(wsCol as Parameters<typeof isNull>[0]))
      .returning({ id: sql<string>`id` });
    console.log(`  ${name}: backfilled ${result.length} rows`);
  }

  // -- Phase 1 ------------------------------------------------------------------

  // 5. Backfill workspace_id + slug on the existing festival row.
  //    Migration 0007 renamed the table; the row already exists with the
  //    old data (year, name, startDate, endDate, location, festivalModeActive).
  const [festival] = await db
    .update(schema.festivals)
    .set({ workspaceId: wsId, slug: FESTIVAL_SLUG })
    .where(isNull(schema.festivals.workspaceId))
    .returning();

  if (festival) {
    console.log(
      `Festival backfilled: ${festival.id} (${festival.name}) -> slug: ${FESTIVAL_SLUG}`,
    );
  } else {
    // Already had workspace_id - just fetch it.
    const [existing] = await db
      .select()
      .from(schema.festivals)
      .where(eq(schema.festivals.workspaceId, wsId))
      .limit(1);
    console.log(`Festival already scoped: ${existing?.id} (${existing?.name})`);
  }

  const festivalRow =
    festival ??
    (await db
      .select()
      .from(schema.festivals)
      .where(eq(schema.festivals.workspaceId, wsId))
      .limit(1)
      .then((rows) => rows[0]));

  if (!festivalRow) throw new Error("No festival row found after backfill");

  // 6. Seed the 4 default stages under the festival (idempotent).
  //    Migration 0007 already copied festival_id from the old edition_id FK,
  //    so existing stages already have festival_id set. This upsert handles
  //    fresh installs or re-runs.
  for (const s of DEFAULT_STAGE_SEEDS) {
    const existing = await db
      .select({ id: schema.stages.id })
      .from(schema.stages)
      .where(eq(schema.stages.slug, s.slug))
      .limit(1);

    if (existing.length === 0) {
      const [created] = await db
        .insert(schema.stages)
        .values({ ...s, festivalId: festivalRow.id, activeDates: [] })
        .returning({ id: schema.stages.id });
      console.log(`  Stage created: ${s.name} (${created.id})`);
    } else {
      // Ensure festival_id is set on existing stage.
      await db
        .update(schema.stages)
        .set({ festivalId: festivalRow.id })
        .where(eq(schema.stages.id, existing[0].id));
      console.log(`  Stage already exists: ${s.name}`);
    }
  }

  console.log(
    "\nSeed complete. Now run migration 0008 to flip columns to NOT NULL.",
  );
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
