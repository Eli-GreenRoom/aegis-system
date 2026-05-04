/**
 * One-off: print the rows in drizzle.__drizzle_migrations to confirm what's
 * been applied. Reads DATABASE_URL via @next/env so it picks up
 * .env.development.local locally and Vercel env in prod.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  const rows = await sql`
    SELECT hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
