/**
 * Run pending Drizzle migrations against DATABASE_URL.
 *
 * The neon-http driver cannot send multi-statement queries in a single
 * prepared statement (error 42601). This migrator reads the Drizzle journal,
 * finds unapplied migrations by hash, splits each SQL file on semicolons,
 * and executes statements one at a time via sql.query().
 *
 * Usage: `npm run db:migrate`
 */

import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";
import crypto from "crypto";

loadEnvConfig(process.cwd());

const MIGRATIONS_FOLDER = "./drizzle";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  entries: JournalEntry[];
}

function hashFile(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function splitStatements(content: string): string[] {
  // Strip single-line comments first, then split on semicolons.
  const stripped = content
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  return stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = neon(url);

  // Load applied migration hashes.
  const applied = await sql.query(
    `SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`,
  );
  const appliedHashes = new Set(
    applied.map((r) => (r as { hash: string }).hash),
  );

  // Read journal.
  const journalPath = path.join(MIGRATIONS_FOLDER, "meta", "_journal.json");
  const journal: Journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

  let ranCount = 0;

  for (const entry of journal.entries) {
    const filePath = path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`);
    if (!fs.existsSync(filePath)) {
      console.warn(`  WARNING: migration file not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const hash = hashFile(content);

    if (appliedHashes.has(hash)) {
      console.log(`  skip  ${entry.tag} (already applied)`);
      continue;
    }

    console.log(`  apply ${entry.tag} ...`);
    const statements = splitStatements(content);

    for (const stmt of statements) {
      await sql.query(stmt);
    }

    await sql.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()})`,
    );

    console.log(`  done  ${entry.tag} (${statements.length} statements)`);
    ranCount++;
  }

  if (ranCount === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`\nMigrations complete (${ranCount} applied).`);
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
