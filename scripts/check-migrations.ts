import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  const rows =
    await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log("Applied migrations:", rows.length);

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log(
    "Public tables:",
    tables.map((r: { table_name: string }) => r.table_name).join(", "),
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
