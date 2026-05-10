---
description: Generate + apply a Drizzle migration for a schema change.
argument-hint: <description>
---

1. Confirm the schema edit you're about to make in
   `src/db/schema.ts`.
2. Run `npm run db:generate -- --name $ARGUMENTS`.
3. Show me the generated SQL before applying.
4. After approval, run `npm run db:migrate`.
5. NEVER run `npm run db:push` — the rule is no `db:push` ever.
