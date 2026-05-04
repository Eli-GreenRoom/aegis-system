# Claude Code — Project Brief

The canonical brief for this project lives in **`AGENT.md`**. Read it first.

Then in this order before doing any work:

1. `AGENT.md` — stack, brand, vocabulary, conventions, AI rules, never-list
2. `HANDOFF.md` — phased build plan with acceptance criteria per phase
3. `docs/DATA-MODEL.md` — column-level schema spec
4. `TASKS.md` — current Now / Next / Later board

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

## When finishing any change

Before reporting done, mentally run:

```bash
npm run lint
npx tsc --noEmit
```

Call out anything that would fail.

## Sister project for reference

`C:\Users\user\Desktop\greenroom` uses the same stack (Next 16 + Drizzle +
Neon + better-auth + Vercel Blob + Resend + Anthropic SDK). When stuck on a
pattern, check there first — but adapt the domain to Aegis (artist/set/stage,
not gig/promoter).
