# Claude Code — Project Brief

This is **GreenRoom Stages** — the festival & live-event operations product in
the GreenRoom HQ family. First deployment: Aegis Festival.

The canonical brief for this project lives in **`AGENT.md`**. Read it first.

Then in this order before doing any work:

1. `AGENT.md` — stack, brand, vocabulary, conventions, AI rules, never-list,
   definition of done (§11)
2. `HANDOFF.md` — phased build plan with acceptance criteria per phase
3. `docs/DATA-MODEL.md` — column-level schema spec
4. `docs/BRAND.md` — palette, type, voice
5. `TASKS.md` — current Now / Next / Later board

If anything in chat conflicts with `AGENT.md`, `AGENT.md` wins until updated.

## Workflow rules

- **One task at a time** — confirm the plan before editing > 3 files.
- **Update `TASKS.md`** when you finish a task: move from Now to Done with
  today's date.
- **Commits:** `feat(slug): ...` / `fix(slug): ...` / `chore: ...`
- **Never** commit `.env*` files (except `.env.example`).
- **Never** run `npm run db:push` against production. Use `db:generate` +
  `db:migrate`.
- **Never** call `@anthropic-ai/sdk` from a React component — only from
  `src/lib/ai/`.

## Done means green

A task is NOT done until **`npm run check`** passes with your diff in place.
That command runs lint + typecheck + vitest.

Before saying "done":

```bash
npm run check
```

Paste the output. If anything fails, fix it. Don't claim done on a red
result. "Should pass" is not "does pass".

CI runs the same command on every push (`.github/workflows/ci.yml`). A red
CI run blocks merge.

## Test as you build

- Every API route ships with a `tests/unit/<feature>.test.ts` covering at
  least: happy path, auth-fail path, validation-fail path.
- Every server action that writes to the DB ships with a unit test.
- Every parser in `src/lib/ai/` ships with a fixture in `tests/fixtures/`
  and a snapshot test of the parsed output.
- Mock the DB and external services. Never hit Neon, Anthropic, Resend, or
  Blob from a unit test.
- Reproduce bugs as a failing test first, then fix.

See `AGENT.md` §11 for the full definition of done.

## Sister product for reference

`C:\Users\user\Desktop\greenroom` is the artist-management product in the same
GreenRoom HQ brand family. Same stack (Next 16 + Drizzle + Neon + better-auth +
Vercel Blob + Resend + Anthropic SDK). When stuck on a pattern, check there
first — but adapt the domain to GreenRoom Stages (artist/set/stage, not
gig/promoter). No shared code, no shared DB, no shared auth — independent
products under one brand.
