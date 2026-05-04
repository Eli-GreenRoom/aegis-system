# Aegis System — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

- [ ] Phase 2.1 — Artists CRUD (list page with filter by stage/status/agency,
      detail page, create/edit form)

## Next

- [ ] Phase 2 remaining CRUD modules — Crew, Stages/Slots/Sets, Flights,
      Hotels, Ground, Payments, Riders, Contracts, Guestlist, Documents
- [ ] Phase 3 import script `scripts/import-2024.ts`

## Later

- [ ] Phase 4 AI parsers
- [ ] Phase 5 festival-day mode
- [ ] Phase 6 Cmd+K agent
- [ ] Phase 7 polish + comms

---

## Done

- 2026-05-04 — Testing infra: GitHub Actions CI at
  `.github/workflows/ci.yml` running lint + typecheck + vitest on every push
  and PR (with placeholder env so module-load doesn't crash). Added
  `npm run check` script as the local equivalent. Wrote `vitest.config.ts`
  with `@/` alias and node env. Sample test in `tests/unit/utils.test.ts`
  covers `cn` and `formatCents`. Tightened `AGENT.md` §11 and `CLAUDE.md`
  with non-negotiable testing rules — every API route + server action +
  AI parser ships with a test, mock external services, "done" requires
  green `npm run check` output.
- 2026-05-04 — Phase 1.3: dashboard layout shell. `(dashboard)` route group
  with server-side auth guard via `getAppSession()` redirecting to `/sign-in`.
  Left rail (220px, brand surface) with 12 nav items — Lineup, Artists, Crew,
  Flights, Hotels, Ground, Riders, Contracts, Payments, Guestlist, Documents,
  Settings — gold accent on active row, signed-in email + sign-out at the
  bottom. Topbar with Newsreader page H1, optional subtitle/actions slot, and
  T-minus festival countdown to 2026-08-14. 12 placeholder pages render
  through a shared `EmptyModule` shell. Home `/` redirects signed-in users to
  `/lineup`; sign-in/up land at `/lineup`. Probed: `/lineup /artists /flights
  /payments /settings` all return 307 → `/sign-in` for anon. Lint + typecheck
  clean. Note: signed-in render not probed end-to-end (no test creds in
  session).
- 2026-05-04 — Phase 0 setup: scaffold pushed, Vercel deploy live at
  `https://logistics.aegisfestival.com`, `/api/health` returns ok in prod,
  Neon (Postgres 17, eu-central-1) connected, custom domain + HTTPS active.
- 2026-05-04 — Phase 1.2: initial Drizzle migration applied to Neon —
  20 tables + 14 enums (drizzle/0000_messy_zarek.sql).
- 2026-05-04 — Phase 1.1: better-auth wired (email + password). Server in
  `src/lib/auth.ts`, client in `src/lib/auth-client.ts`, catchall handler at
  `/api/auth/[...all]`. Brand-aligned `/sign-in` + `/sign-up` (gold submit,
  Newsreader H1, mono labels, blueprint corner). `getAppSession()` real, owner
  resolved by email match (`booking@aegisfestival.com`). Auth schema generated
  to `drizzle/0001_auth.sql` via `@better-auth/cli` — apply with
  `npx tsx scripts/apply-auth-sql.ts`. Signup gated by `NEXT_PUBLIC_ALLOW_SIGNUP`
  (true in `.env.development.local`, unset in prod). `requests/auth.http`
  covers signup/signin/signout success + failure cases. Lint + typecheck
  clean.

---

## Decisions log

- 2026-05-04 — stack locked: Next.js 16 + Neon + Drizzle + better-auth + Vercel
  Blob + Resend + Anthropic. Mirrors greenroom for cross-pollination.
- 2026-05-04 — auth scope: owner + coordinator + viewer roles. Single tenant.
- 2026-05-04 — AI flow: upload-and-parse, not Gmail OAuth. Operator confirms
  every parse before write.
- 2026-05-04 — domain: `logistics.aegisfestival.com`.
- 2026-05-04 — region: Neon `eu-central-1` (Frankfurt) for proximity to Lebanon.
- 2026-05-04 — brand accent: `#E5B85A` (warm gold). No cyan, no neon green.
- 2026-05-04 — brand alignment to Aegis brand book (Hammerspace, Feb 2026):
  deep indigo bg `#150A48`, gold `#E5B85A` accent, coral `#E73E54` for danger,
  mint `#16D060` for success, cream `#FAF3EC` for inverse surfaces. Serif
  (Newsreader) used for wordmark + page H1 only — never on data or body.
  Full rationale in `docs/BRAND.md`.
- 2026-05-04 — testing rule (Layer 1 + 2): every API route, server action,
  and AI parser ships with a Vitest unit test. Mock external services. CI
  runs `npm run check` (lint + typecheck + vitest) on every push. "Done"
  requires green output, not "should be green". Playwright E2E deferred
  to Phase 2.5 once enough pages exist to test.
