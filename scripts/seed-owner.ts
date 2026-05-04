/**
 * Print instructions for seeding the owner account.
 *
 * Owner promotion is by email match in src/lib/session.ts (OWNER_EMAIL).
 * There's no DB seeding to do — Eli signs up at /sign-up with the owner
 * email and the session resolver detects the match. This script just
 * prints the steps so future-Eli (or future-Claude) doesn't have to dig.
 *
 * Usage: `npx tsx scripts/seed-owner.ts`
 */

import { OWNER_EMAIL } from "../src/lib/session";

console.log(`
Aegis owner seed — instructions only, no DB writes.

The owner is promoted by email match in src/lib/session.ts:
    OWNER_EMAIL = "${OWNER_EMAIL}"

To create the owner account:

  1. Make sure NEXT_PUBLIC_ALLOW_SIGNUP=true is set in your env (it is in
     .env.development.local; for prod, set it temporarily on Vercel).
  2. Visit /sign-up and register with email "${OWNER_EMAIL}".
  3. The session resolver auto-grants role=owner on login. No SQL needed.
  4. After registering, unset NEXT_PUBLIC_ALLOW_SIGNUP in prod so signup
     stays closed.

If you change OWNER_EMAIL, update both:
  - src/lib/session.ts (constant)
  - the project_phase1_pending_decisions.md memory file
`);
