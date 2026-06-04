-- Travel time presets on hotels (drive minutes to/from key locations).
-- Used by the smart ground transport suggester to pre-fill pickup times.
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "mins_to_airport" integer;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "mins_from_airport" integer;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "mins_to_venue" integer;

-- Festival-level arrival buffer for ground transport (default 120 = 2 hours before set).
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "ground_arrival_buffer_mins" integer NOT NULL DEFAULT 120;
