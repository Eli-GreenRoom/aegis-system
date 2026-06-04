-- Additional press/promo links per artist (array of {label, url} stored as jsonb).
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "links" jsonb;
