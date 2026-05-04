# Aegis System — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

- [ ] Phase 2.3 — Stages + Slots + Sets (lineup builder: stages CRUD, slots
      per day per stage, sets connecting artists to slots with status +
      announce batch)

## Next

- [ ] Phase 2 remaining CRUD modules — Flights, Hotels, Ground, Payments,
      Riders, Contracts, Guestlist, Documents
- [ ] Stage / set status filters on /artists once Lineup module exists
- [ ] Phase 3 import script `scripts/import-2024.ts`

## Later

- [ ] Phase 4 AI parsers
- [ ] Phase 5 festival-day mode
- [ ] Phase 6 Cmd+K agent
- [ ] Phase 7 polish + comms

---

## Done

- 2026-05-04 — Phase 2.2: Crew CRUD shipped, then narrowed. **Crew now
  means travelling production only**: tour managers, photographers,
  videographers, social media, FOH engineers — NOT festival-supplied stage
  hands or volunteers. They're treated like artists for travel/hotel
  purposes. Initial implementation included `stages[]` and `dailyRateCents`;
  both dropped in migration `0002_crew_drop_stages_rate.sql` after the
  scope clarification. Final shape: name, role, email, phone, days[],
  comments — plus `editionId` + `archivedAt`. List at `/crew` with search
  (name/role/email/phone) + role filter + active/archived/all toggle.
  Detail, create, edit pages. Form uses RHF + Zod with a comma-separated
  text input for days (split client-side). Same pattern as artists:
  edition-scoped, soft archive, partial PATCH (`crewPatchSchema` +
  `toDbPatchValues()` so omitted fields stay untouched). Tests: 23 cases
  cover happy + auth-fail + validation-fail + 404 + partial-PATCH + empty-
  array clears days to null. `requests/crew.http` updated. New helper
  `scripts/check-migrations.ts` queries `drizzle.__drizzle_migrations`.
  **`npm run check` green (lint + typecheck + 55 tests)**. Live-probed
  against Neon as `booking@aegisfestival.com`: full CRUD, role filter,
  archive/restore, partial PATCH (rename preserved role/email/days). Note:
  the journal `idx` had to be bumped past the manually-added
  `0001_auth.sql` (better-auth one-off, not drizzle-managed) — future
  migrations continue from idx=3.
- 2026-05-04 — Phase 2.1: Artists CRUD shipped. List page at `/artists` with
  search (name/agency/slug/email/legal-name) + agency filter + active/archived/
  all toggle, all driven by URL params via `ArtistsFilters` client island.
  Detail page `/artists/[id]`, create at `/artists/new`, edit at
  `/artists/[id]/edit`. Archive is soft (sets `archived_at`), restore via
  `?action=unarchive`. New `getCurrentEdition()` helper in `src/lib/edition.ts`
  upserts the 2026 edition row on first call. `artistInputSchema` keeps form
  and DB types decoupled — `toDbValues()` normalises empty strings to null at
  the route boundary so RHF + zodResolver type cleanly. **PATCH is a true
  partial update**: separate `artistPatchSchema` (every field optional,
  rejects empty body) + `toDbPatchValues()` only sends keys the caller
  actually included, so omitted fields stay untouched in the DB. Empty
  string still clears an optional field to null (unambiguous). Stage/status
  filters deferred to once Lineup ships. Tests: 26 cases in
  `tests/unit/artists.test.ts` cover happy + auth-fail + validation-fail +
  404 + 409-duplicate-slug + 4 partial-PATCH cases, repo + session + edition
  mocked. `requests/artists.http` has 14 cases. **`npm run check` green
  (lint + typecheck + 32 tests)**. Live-probed against Neon as
  `booking@aegisfestival.com`: full CRUD, search, archive, restore, partial
  PATCH preserving omitted fields, empty-body 400 — all verified.
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
