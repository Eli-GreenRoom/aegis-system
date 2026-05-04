/**
 * Dev-only: arbitrary SQL via env-loaded Neon connection.
 * Usage: `npx tsx scripts/dev-query.ts "SELECT 1"`
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);
  const stmt = process.argv[2];
  if (!stmt) throw new Error("Pass SQL as argv[2]");
  const rows = await sql.query(stmt);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
