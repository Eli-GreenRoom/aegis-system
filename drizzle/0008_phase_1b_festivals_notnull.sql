-- Phase 1b: After seed backfill, flip new columns to NOT NULL and drop old ones.
-- Run AFTER seed.ts has populated workspace_id on festivals and festival_id
-- on stages + all tenant tables.

-- 1. festivals: flip workspace_id NOT NULL, add slug default, add unique constraint.
--    Seed must have set workspace_id and slug before this runs.
ALTER TABLE "festivals" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "festivals" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "festivals" ADD CONSTRAINT "festivals_workspace_id_slug_unique" UNIQUE ("workspace_id", "slug");
-- Drop the old year column.
ALTER TABLE "festivals" DROP COLUMN IF EXISTS "year";

-- 2. stages: flip festival_id NOT NULL, add unique (festival_id, slug).
ALTER TABLE "stages" ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "stages" ADD CONSTRAINT "stages_festival_id_slug_unique" UNIQUE ("festival_id", "slug");

-- 3. slots: flip festival_id + date NOT NULL, drop old edition_id and day columns.
ALTER TABLE "slots" ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "slots" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "slots" DROP COLUMN IF EXISTS "edition_id";
ALTER TABLE "slots" DROP COLUMN IF EXISTS "day";

-- 4. Tenant tables: flip festival_id NOT NULL, drop edition_id.
ALTER TABLE "artists"                  ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "artists"                  DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "crew"                     ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "crew"                     DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "flights"                  ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "flights"                  DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "ground_transport_pickups" ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "ground_transport_pickups" DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "invoices"                 ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "invoices"                 DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "payments"                 ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "payments"                 DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "contracts"                ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "contracts"                DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "guestlist_entries"        ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "guestlist_entries"        DROP COLUMN IF EXISTS "edition_id";

ALTER TABLE "hotel_room_blocks"        ALTER COLUMN "festival_id" SET NOT NULL;
ALTER TABLE "hotel_room_blocks"        DROP COLUMN IF EXISTS "edition_id";

-- 5. Drop the stage_day enum now that no columns use it.
DROP TYPE IF EXISTS "stage_day";
