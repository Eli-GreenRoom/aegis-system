-- Festival-level defaults for hotel nights + post-festival payment lag.
-- Both additive and backwards-compatible.
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "default_nights_covered" integer;
ALTER TABLE "festivals" ADD COLUMN IF NOT EXISTS "payment_term_days_after_end" integer NOT NULL DEFAULT 14;
