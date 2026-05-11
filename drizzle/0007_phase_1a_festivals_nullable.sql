-- Phase 1a: Rename festival_editions → festivals, restructure stages/slots.
-- All new FK columns are added as nullable first; seed backfills them;
-- migration 0008 flips them to NOT NULL.

-- 1. Rename the table.
ALTER TABLE "festival_editions" RENAME TO "festivals";

-- 2. Drop the year unique constraint (no longer needed — slug unique per workspace).
ALTER TABLE "festivals" DROP CONSTRAINT IF EXISTS "festival_editions_year_unique";

-- 3. Add new columns to festivals (nullable until backfill).
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE;
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "tenant_brand" jsonb;
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

-- 4. Add unique constraint on (workspace_id, slug) — deferred until NOT NULL.
--    Applied in migration 0008 after backfill.

-- 5. Restructure stages: add festival_id (nullable FK), activeDates, archivedAt.
--    Drop global slug unique; unique per (festival_id, slug) added in 0008.
ALTER TABLE "stages" DROP CONSTRAINT IF EXISTS "stages_slug_unique";
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id") ON DELETE CASCADE;
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "active_dates" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

-- 6. slots: rename edition_id → festival_id, rename day → date column.
--    We add the new festival_id column, then drop the old one.
ALTER TABLE "slots" ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id") ON DELETE CASCADE;
ALTER TABLE "slots" ADD COLUMN IF NOT EXISTS "date" date;
-- Copy existing editionId → festivalId (same UUID, table just renamed).
UPDATE "slots" SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
-- Copy day enum → date: derive from the festival's start_date + day offset.
-- friday=+0, saturday=+1, sunday=+2 relative to start_date.
UPDATE "slots" s
SET "date" = (
  SELECT
    CASE s.day
      WHEN 'friday'   THEN f.start_date::date
      WHEN 'saturday' THEN (f.start_date::date + INTERVAL '1 day')::date
      WHEN 'sunday'   THEN (f.start_date::date + INTERVAL '2 days')::date
      ELSE f.start_date::date
    END
  FROM "festivals" f
  WHERE f.id = s.festival_id
)
WHERE s.date IS NULL;

-- 7. artists/crew/flights/pickups/invoices/payments/contracts/guestlist/hotel_room_blocks:
--    add festival_id (nullable), copy from edition_id, keep edition_id for now.
ALTER TABLE "artists"                  ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id") ON DELETE CASCADE;
ALTER TABLE "crew"                     ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id") ON DELETE CASCADE;
ALTER TABLE "flights"                  ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "ground_transport_pickups" ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "invoices"                 ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "payments"                 ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "contracts"                ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "guestlist_entries"        ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");
ALTER TABLE "hotel_room_blocks"        ADD COLUMN IF NOT EXISTS "festival_id" uuid REFERENCES "festivals"("id");

-- 8. Backfill festival_id from edition_id (same UUID — table was just renamed).
UPDATE "artists"                  SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "crew"                     SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "flights"                  SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "ground_transport_pickups" SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "invoices"                 SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "payments"                 SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "contracts"                SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "guestlist_entries"        SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "hotel_room_blocks"        SET "festival_id" = "edition_id" WHERE "festival_id" IS NULL;
UPDATE "stages"                   SET "festival_id" = (SELECT id FROM "festivals" LIMIT 1) WHERE "festival_id" IS NULL;
