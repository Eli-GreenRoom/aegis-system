CREATE TYPE "public"."contract_status" AS ENUM('draft', 'sent', 'signed', 'void');--> statement-breakpoint
CREATE TYPE "public"."flight_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."flight_status" AS ENUM('scheduled', 'boarded', 'in_air', 'landed', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."guest_category" AS ENUM('dj_guest', 'competition_winner', 'free_list', 'international', 'general_admission');--> statement-breakpoint
CREATE TYPE "public"."hotel_booking_status" AS ENUM('tentative', 'booked', 'checked_in', 'checked_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'due', 'paid', 'overdue', 'void');--> statement-breakpoint
CREATE TYPE "public"."person_kind" AS ENUM('artist', 'crew');--> statement-breakpoint
CREATE TYPE "public"."pickup_route" AS ENUM('airport', 'hotel', 'stage', 'other');--> statement-breakpoint
CREATE TYPE "public"."pickup_status" AS ENUM('scheduled', 'dispatched', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."rider_kind" AS ENUM('hospitality', 'technical');--> statement-breakpoint
CREATE TYPE "public"."set_status" AS ENUM('confirmed', 'option', 'not_available');--> statement-breakpoint
CREATE TYPE "public"."stage_day" AS ENUM('friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."team_member_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'coordinator', 'viewer');--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"nationality" text,
	"email" text,
	"phone" text,
	"agency" text,
	"agent_email" text,
	"instagram" text,
	"soundcloud" text,
	"color" text,
	"local" boolean DEFAULT false NOT NULL,
	"comments" text,
	"visa_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"diff" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"status" "contract_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"signed_at" timestamp,
	"file_url" text,
	"signed_file_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text,
	"phone" text,
	"stages" jsonb,
	"days" jsonb,
	"daily_rate_cents" integer,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"url" text NOT NULL,
	"uploaded_by" text,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "festival_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"location" text,
	"festival_mode_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "festival_editions_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "flights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"person_kind" "person_kind" NOT NULL,
	"person_id" uuid NOT NULL,
	"direction" "flight_direction" NOT NULL,
	"from_airport" text,
	"to_airport" text,
	"airline" text,
	"flight_number" text,
	"scheduled_dt" timestamp with time zone,
	"actual_dt" timestamp with time zone,
	"status" "flight_status" DEFAULT 'scheduled' NOT NULL,
	"pnr" text,
	"ticket_url" text,
	"confirmation_email_url" text,
	"seat" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ground_transport_pickups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"person_kind" "person_kind" NOT NULL,
	"person_id" uuid NOT NULL,
	"route_from" "pickup_route" NOT NULL,
	"route_from_detail" text,
	"route_to" "pickup_route" NOT NULL,
	"route_to_detail" text,
	"linked_flight_id" uuid,
	"pickup_dt" timestamp with time zone NOT NULL,
	"vehicle_type" text,
	"vendor_id" uuid,
	"driver_name" text,
	"driver_phone" text,
	"cost_amount_cents" integer,
	"cost_currency" varchar(3),
	"status" "pickup_status" DEFAULT 'scheduled' NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guestlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"category" "guest_category" NOT NULL,
	"host_artist_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"day" text,
	"invite_sent" boolean DEFAULT false NOT NULL,
	"checked_in" boolean DEFAULT false NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_block_id" uuid,
	"person_kind" "person_kind" NOT NULL,
	"person_id" uuid NOT NULL,
	"hotel_id" uuid NOT NULL,
	"room_type" text,
	"checkin" date NOT NULL,
	"checkout" date NOT NULL,
	"booking_number" text,
	"credits_amount_cents" integer,
	"credits_currency" varchar(3),
	"status" "hotel_booking_status" DEFAULT 'booked' NOT NULL,
	"confirmation_url" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_room_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"hotel_id" uuid NOT NULL,
	"room_type" text NOT NULL,
	"nights" integer,
	"rooms_reserved" integer,
	"price_per_night_amount_cents" integer,
	"price_per_night_currency" varchar(3),
	"breakfast_note" text
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"address" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"number" text,
	"issuer_kind" text NOT NULL,
	"issuer_id" uuid,
	"issue_date" date,
	"due_date" date,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"file_url" text,
	"status" text DEFAULT 'received' NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"artist_id" uuid,
	"vendor_id" uuid,
	"invoice_id" uuid,
	"description" text NOT NULL,
	"due_date" date,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"pop_url" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"paid_via" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"kind" "rider_kind" NOT NULL,
	"file_url" text,
	"parsed_items" jsonb,
	"received_at" timestamp,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"status" "set_status" DEFAULT 'option' NOT NULL,
	"announce_batch" text,
	"fee_amount_cents" integer,
	"fee_currency" varchar(3),
	"agency" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"day" "stage_day" NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"name" text,
	"role" "team_role" NOT NULL,
	"status" "team_member_status" DEFAULT 'pending' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invite_token" text,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew" ADD CONSTRAINT "crew_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD CONSTRAINT "ground_transport_pickups_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD CONSTRAINT "ground_transport_pickups_linked_flight_id_flights_id_fk" FOREIGN KEY ("linked_flight_id") REFERENCES "public"."flights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD CONSTRAINT "ground_transport_pickups_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guestlist_entries" ADD CONSTRAINT "guestlist_entries_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guestlist_entries" ADD CONSTRAINT "guestlist_entries_host_artist_id_artists_id_fk" FOREIGN KEY ("host_artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_room_block_id_hotel_room_blocks_id_fk" FOREIGN KEY ("room_block_id") REFERENCES "public"."hotel_room_blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_room_blocks" ADD CONSTRAINT "hotel_room_blocks_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_room_blocks" ADD CONSTRAINT "hotel_room_blocks_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_edition_id_festival_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."festival_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;