CREATE TYPE "public"."visa_status" AS ENUM('not_needed', 'pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."hotel_booking_status" ADD VALUE 'no_show' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."pickup_status" ADD VALUE 'in_transit' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."set_status" ADD VALUE 'live';--> statement-breakpoint
ALTER TYPE "public"."set_status" ADD VALUE 'done';--> statement-breakpoint
ALTER TYPE "public"."set_status" ADD VALUE 'withdrawn';--> statement-breakpoint
ALTER TABLE "artists" ALTER COLUMN "visa_status" SET DATA TYPE "public"."visa_status" USING (
  CASE
    WHEN "visa_status" IN ('not_needed', 'pending', 'approved', 'rejected')
      THEN "visa_status"::"public"."visa_status"
    WHEN "visa_status" IS NULL OR "visa_status" = ''
      THEN NULL
    ELSE 'pending'::"public"."visa_status"
  END
);--> statement-breakpoint
ALTER TABLE "crew" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "crew" ADD COLUMN "visa_status" "visa_status";--> statement-breakpoint
ALTER TABLE "crew" ADD COLUMN "press_kit_url" text;--> statement-breakpoint
ALTER TABLE "crew" ADD COLUMN "passport_file_url" text;--> statement-breakpoint
ALTER TABLE "flights" ADD COLUMN "delay_minutes" integer;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD COLUMN "dispatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD COLUMN "in_transit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ground_transport_pickups" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD COLUMN "checked_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hotel_room_blocks" ADD COLUMN "label" text;