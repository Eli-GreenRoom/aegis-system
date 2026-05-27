/**
 * One-off: fix typo in booking email.
 * booking@aegisfestival.com -> bookings@aegisfestival.com
 * Run once: npx tsx scripts/fix-email.ts
 */
import { db } from "../src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  // Fix in better-auth user table
  const userResult = await db.execute(
    sql`UPDATE "user" SET email = 'bookings@aegisfestival.com' WHERE email = 'booking@aegisfestival.com' RETURNING id, email`,
  );
  console.log("user table:", userResult.rows);

  // Fix in team_members table if it exists there too
  const memberResult = await db.execute(
    sql`UPDATE team_members SET email = 'bookings@aegisfestival.com' WHERE email = 'booking@aegisfestival.com' RETURNING id, email`,
  );
  console.log("team_members table:", memberResult.rows);

  // Fix in account table (better-auth stores account_id = email for credential provider)
  const accountResult = await db.execute(
    sql`UPDATE account SET account_id = 'bookings@aegisfestival.com' WHERE account_id = 'booking@aegisfestival.com' RETURNING id, account_id`,
  );
  console.log("account table:", accountResult.rows);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
