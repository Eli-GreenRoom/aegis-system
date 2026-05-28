-- Add nights_covered to hotel_bookings.
-- Nullable integer: how many nights of the stay the festival covers
-- (paid/comped). Distinct from (checkout - checkin) when the artist
-- extends their own stay or we only comp part of a longer booking.
-- Backwards-compatible: existing rows get NULL.
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "nights_covered" integer;
