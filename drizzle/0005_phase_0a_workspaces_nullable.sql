-- Phase 0 migration A: add workspaces table + nullable workspace_id on all tenant tables.
-- Run before db:seed (backfill). Migration B flips columns to NOT NULL after seed.

-- 1. Add new team_role values (must come before table changes that use them).
ALTER TYPE "public"."team_role" ADD VALUE 'admin' BEFORE 'viewer';--> statement-breakpoint
ALTER TYPE "public"."team_role" ADD VALUE 'member' BEFORE 'viewer';--> statement-breakpoint

-- 2. Create workspaces table.
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "owner_user_id" text NOT NULL,
  "logo_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "archived_at" timestamp
);--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_slug_unique" UNIQUE("slug");--> statement-breakpoint

-- 3. Rework team_members:
--    a. Rename owner_id -> workspace_id (repurposed column, type changes text->uuid via cast).
ALTER TABLE "team_members" RENAME COLUMN "owner_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "workspace_id" TYPE uuid USING NULL;--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
--    b. Add festival_scope jsonb column.
ALTER TABLE "team_members" ADD COLUMN "festival_scope" jsonb;--> statement-breakpoint
--    c. Add unique(workspace_id, email) constraint (replaces old ownerId-based scoping).
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_workspace_id_email_unique" UNIQUE("workspace_id","email");--> statement-breakpoint

-- 4. Add nullable workspace_id to tenant tables.
ALTER TABLE "artists" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "crew" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "crew" ADD CONSTRAINT "crew_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "flights" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "vendors" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "ground_transport_pickups" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD CONSTRAINT "ground_transport_pickups_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "hotels" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "hotel_bookings" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "invoices" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "payments" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "guestlist_entries" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "guestlist_entries" ADD CONSTRAINT "guestlist_entries_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

-- 5. documents: rename owner_id (text) -> workspace_id (uuid).
ALTER TABLE "documents" RENAME COLUMN "owner_id" TO "workspace_id";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "workspace_id" TYPE uuid USING NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

-- 6. audit_events: add workspace_id.
ALTER TABLE "audit_events" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
