# Aegis System — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

- [ ] Phase 2.5 — Hotels (built on top of 2.5a's `label` field + `no_show`).
      Block-and-assign model: book a count of rooms in a (hotel, edition,
      room type) deal, assign individuals via `hotel_bookings`. Capacity
      computed on read by counting overlapping bookings against
      `roomsReserved`. Crew get separate blocks (use `label`).

## Next

- [ ] Phase 2.7 — Payments + Invoices (coral / gold / mint will pop)
- [ ] Phase 2.8 — Riders, Contracts, Guestlist, Documents (finish CRUD)
- [ ] **Phase 2.9 — Aggregators** (`src/lib/aggregators/`): `getArtistRoadsheet`,
      `getOpenIssues`, `getPickupsInWindow`, `getNowAndNext`, `getArrivalsToday`,
      `getCurrentlyActiveBookings`. Each unit-tested with mocked DB. Powers
      Festival-day mode — spec in `docs/OPERATIONS-FLOW.md` §4.
- [ ] Stage / set status filters on /artists now that lineup ships
- [ ] Drag-to-reorder slots within a stage column (currently sortOrder is
      stored but only respected on read)
- [ ] Phase 3 import script `scripts/import-2024.ts`

## Later

- [ ] Phase 4 AI parsers
- [ ] Phase 5 festival-day mode (one-tap rows, card view, PWA prompt)
- [ ] Phase 6 Cmd+K agent
- [ ] Phase 7 polish + comms

---

## Done

- 2026-05-05 — Phase 2.5a stage 2: audit + transition helper.
  Added `src/lib/audit.ts` with `recordTransition(client, { actorId,
  entity, diff })` — returns an unawaited Drizzle insert builder so the
  caller composes `db.batch([updateBuilder, recordTransition(...)])`.
  Under the neon-http driver, `db.batch` is the atomic primitive Neon
  exposes (single-roundtrip transaction); Drizzle's `db.transaction(...)`
  isn't available on neon-http. Repos gained `buildUpdateSet` /
  `buildUpdateFlight` / `buildUpdatePickup` to feed into the batch. The
  three existing status-changing PATCH routes (sets, flights, pickups)
  now branch: status change → batch + audit; non-status PATCH → existing
  awaited update path. 161 tests green (was 150 after stage 1, 132
  baseline). New `tests/unit/audit.test.ts` covers builder shape,
  payload, optional meta, all 8 entity types. Existing route tests
  extended with status-change/no-status/rollback assertions. Probed:
  ran `npm run check` — clean. **Not yet wired:** contracts / payments /
  hotel_bookings PATCH routes don't exist yet (Phase 2.7 / 2.8); they'll
  pick up `recordTransition` when their modules ship. Festival-day
  click-time capture (`actualDt = now()` on landed, `dispatchedAt` on
  dispatch) is Phase 5 — the audit row already records the transition,
  but the UX-side timestamp columns are written separately.
- 2026-05-05 — Phase 2.5a stage 1: schema retrofit landed.
  Migration `0004_phase_2_5a_operations.sql` adds `visa_status` enum
  (data-preserving migration on `artists.visa_status`: legacy text →
  `pending`, NULL/empty → NULL); crew parity columns (`nationality`,
  `visa_status`, `press_kit_url`, `passport_file_url`); `set_status`
  gains `live` / `done` / `withdrawn`; `pickup_status` gains `in_transit`
  plus `dispatched_at` / `in_transit_at` / `completed_at`;
  `hotel_booking_status` gains `no_show` plus `checked_in_at` /
  `checked_out_at`; `hotel_room_blocks` gains `label`; `flights` gains
  `delay_minutes`. Zod schemas, forms (artists visa is now a select; crew
  form gets the four new fields; flights form gets a Delay (min) input;
  lineup board gets the three new set-status options), and detail pages
  updated to match. 150 tests green (was 132). Probed: ran `npm run check`
  — clean. **Not yet wired:** audit log on transitions (stage 2);
  hotel-booking forms / detail pages (Phase 2.5 Hotels module hasn't
  shipped yet so no UI to update); production migration not applied.
- 2026-05-05 — Operations-flow plan integrated: `docs/OPERATIONS-FLOW.md`
  written, AGENT.md §14 added, FESTIVAL-DAY.md rewritten for one-tap UX,
  TASKS.md re-prioritised with Phase 2.5a inserted before Hotels.
- 2026-05-05 — Artist press-kit + passport URL fields wired end-to-end
  (migration `0003_artist_press_kit_passport.sql`). 132 tests green.
- 2026-05-05 — Public press-kit share page at `/share/press` (no auth,
  picker UI on /artists, exposes only safe fields).
- 2026-05-05 — Phase 2.6: Ground shipped (vendors + pickups, 129 tests).
- 2026-05-04 — Phase 2.4: Flights CRUD (polymorphic person, 106 tests).
- 2026-05-04 — Phase 2.3: Lineup builder (Stages + Slots + Sets, 88 tests).
- 2026-05-04 — Phase 2.2: Crew CRUD, narrowed to travelling production only
  (55 tests).
- 2026-05-04 — Phase 2.1: Artists CRUD (32 tests).
- 2026-05-04 — Testing infra: GitHub Actions CI + `npm run check`.
- 2026-05-04 — Phase 1.3: dashboard layout shell (12 placeholder pages).
- 2026-05-04 — Phase 1.2: initial Drizzle migration (20 tables + 14 enums).
- 2026-05-04 — Phase 1.1: better-auth wired (email + password).
- 2026-05-04 — Phase 0 setup: scaffold pushed, Vercel + Neon live, custom
  domain `logistics.aegisfestival.com` active.

---

## Decisions log

- 2026-05-04 — Stack locked: Next.js 16 + Neon + Drizzle + better-auth +
  Vercel Blob + Resend + Anthropic. Mirrors greenroom for cross-pollination.
- 2026-05-04 — Auth scope: owner + coordinator + viewer roles. Single tenant.
- 2026-05-04 — AI flow: upload-and-parse, not Gmail OAuth. Operator confirms
  every parse before write.
- 2026-05-04 — Domain: `logistics.aegisfestival.com`.
- 2026-05-04 — Region: Neon `eu-central-1` (Frankfurt) for proximity to Lebanon.
- 2026-05-04 — Brand accent: `#E5B85A` (warm gold).
- 2026-05-04 — Brand alignment to Aegis brand book (Hammerspace, Feb 2026):
  neutral dark canvas (#0E0E10), gold/coral/mint accents, Newsreader serif
  for wordmark + page H1 only. Full rationale in `docs/BRAND.md`.
- 2026-05-04 — Testing rule (Layer 1 + 2): every API route, server action,
  AI parser ships with a Vitest test. CI runs `npm run check` on every push.
  "Done" requires green output.
- 2026-05-05 — Artists: optional `pressKitUrl` + `passportFileUrl`. Press
  kit is opaque URL; passport file is private Blob via documents API with
  `tags=['passport']`.
- 2026-05-05 — Operations-flow plan: `docs/OPERATIONS-FLOW.md` becomes the
  canonical reference for state machines + festival-day UX. State machines
  locked (set adds `live`/`done`/`withdrawn`, pickup adds `in_transit` +
  transition timestamps, hotel booking adds `no_show` + checkin/out
  timestamps, hotel block gets `label`, crew gets passport/visa/
  nationality parity, visa moves to enum, flights gain `delay_minutes`).
  Aggregators added as Phase 2.9.
