---
description: Generate a Vitest unit test for an API route file.
argument-hint: <path/to/route.ts>
---

Read $ARGUMENTS. If a test for the same feature already exists in
`tests/unit/`, propose an extension diff rather than a rewrite, and
let the user decide.

Otherwise, generate a test in `tests/unit/<feature>.test.ts` that covers:

- Happy path (200/201)
- Auth-fail path (401, getAppSession returns null)
- Validation-fail path (400, bad input)

Mock `@/lib/session`, `@/lib/edition` (getCurrentEdition),
`@/db/client`, `@/lib/audit`, and any external service. Use the Aegis
pattern from `tests/unit/contracts.test.ts` verbatim — same `vi.mock`,
same `jsonReq` helper, same fixture import pattern. Do not edit the
route — only write the test. Run `npm run test:run` to confirm green.
