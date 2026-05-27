-- Add logistics requirement flags to artists.
-- All default TRUE so existing artists are treated as needing everything
-- (no behaviour change). Operators uncheck what doesn't apply.
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_flight" boolean NOT NULL DEFAULT true;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_hotel" boolean NOT NULL DEFAULT true;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_ground" boolean NOT NULL DEFAULT true;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_contract" boolean NOT NULL DEFAULT true;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_payment" boolean NOT NULL DEFAULT true;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "needs_rider" boolean NOT NULL DEFAULT true;
