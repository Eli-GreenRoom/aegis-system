/**
 * Phase 0+: workspace + owner seeding is handled by `npm run db:seed`
 * (`src/db/seed.ts`). That script creates the "Aegis Productions" workspace,
 * inserts the owner as a team_member, and backfills workspace_id on all
 * existing tenant rows.
 *
 * Run it after migration A and before migration B:
 *
 *   npm run db:migrate   # applies 0005_phase_0a
 *   npm run db:seed      # creates workspace + backfills
 *   npm run db:migrate   # applies 0006_phase_0b (NOT NULL flip)
 *
 * This file is kept as a placeholder so any scripts referencing it get a
 * clear message. It performs no DB writes.
 */

console.log(
  "Workspace seeding is now handled by: npm run db:seed\n" +
    "See src/db/seed.ts for details.",
);
