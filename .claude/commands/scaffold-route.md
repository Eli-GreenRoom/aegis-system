---
description: Create a new API route with auth + Zod + matching test.
argument-hint: <feature-name>
---

Create `src/app/api/$ARGUMENTS/route.ts` with GET + POST handlers.

- Use `getAppSession(req.headers)` for auth (return 401 on null).
- Validate input with Zod (return 400 on parse failure).
- Return 201 on POST success, 200 on GET success.
- Scope queries by `editionId` from `getCurrentEdition()`.
- Audit transitions via `recordTransition()` in `src/lib/audit.ts`.

Generate `tests/unit/$ARGUMENTS.test.ts` mirroring
`tests/unit/contracts.test.ts`.

Add `requests/$ARGUMENTS.http` with one success + one failure case.

Move the matching Linear issue to In Review.
