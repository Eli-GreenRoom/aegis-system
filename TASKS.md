# GreenRoom Stages — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

- [ ] **Phase 4 (GREENROOM_STAGES_PLAN.md) — Festival settings page**
      Editable festival (name, dates, location). Stages CRUD per festival with
      activeDates. Nothing hardcodes a stage list, date, or festival name.

## Later

- [ ] Phase 2 — Onboarding + festival creation (sign-up → workspace → festival → dashboard)
- [ ] Phase 3 — Team page + invites (copy-link only, no Resend yet)
- [ ] Phase 4 — Festival settings page (editable stages, per-stage activeDates)
- [ ] Phase 5 — T-date fix + topbar festival/workspace switcher
- [ ] Phase 6 — UI simplicity sweep (7-item sidebar, real Home page, HQ density)
- [ ] Phase 7 — Brand + copy sweep (package.json name, docs, UI strings)
- [ ] Phase 8 — Repo + Vercel rename (manual, Eli does this — aegis-system → greenroom-stages)
- [ ] Original Phase 6 — Cmd+K AI agent (deferred; sits after the structural phases)
- [ ] Original Phase 7 — Polish + comms (Resend email, roadsheet email, audit log in UI)
- [ ] Phase 5 polish: stage filter chips on Now/Pickups, polling /
      pull-to-refresh, PWA install prompt, roadsheet PDF export,
      coral-pulse animations on overdue rows.

---

## Done

- 2026-05-11 — **Phase 3 (GREENROOM_STAGES_PLAN.md) — Team invites + settings page**
  GET/POST /api/team (list members, create pending invite with copy-link URL).
  PATCH/DELETE /api/team/[id] (update role/permissions/status, remove member).
  POST /api/team/invite/[token] (accept invite — sets userId, status active).
  /invite/[token] public page (server: resolve invite, guard email, render AcceptInviteForm).
  Settings page rebuilt: Workspace tab (read-only name) + Team tab (invite form + member list
  with role/status badges + optimistic remove). PermissionGate component. email.ts placeholder.
  413 tests green.

- 2026-05-11 — **Phase 2 (GREENROOM_STAGES_PLAN.md) — Onboarding + festival creation**
  Sign-up now redirects to `/onboarding/workspace` (name workspace) then `/onboarding/festival`
  (name, dates, location) then `/lineup`. `POST /api/workspaces` creates workspace + owner
  team_member using bare better-auth session (no existing team_member row required).
  `GET/POST /api/festivals` lists + creates festivals scoped to workspace with slug collision
  retry. Dashboard layout redirects to onboarding when session has no active festival.
  413 tests green.

- 2026-05-11 — **Phase 1 (GREENROOM_STAGES_PLAN.md) — Festivals as projects**
  Renamed `festival_editions` -> `festivals`; added `workspaceId`, `slug`, `description`,
  `tenantBrand`, `archivedAt`. Dropped `stageDayEnum`; replaced `slots.day` enum with
  `slots.date` (YYYY-MM-DD). Made `stages` festival-scoped (`festivalId` NOT NULL FK,
  `activeDates` jsonb, `(festivalId, slug)` unique). Replaced `src/lib/edition.ts` with
  `src/lib/festivals.ts` (`getActiveFestival`, `listFestivals`, `festivalDates`,
  `dateToDayLabel`, `DEFAULT_STAGE_SEEDS`). All ~50 routes/pages/repos switched from
  `getCurrentEdition()` to `getActiveFestival(session)`; all `editionId` FKs renamed to
  `festivalId`. DayTabs now uses `?date=YYYY-MM-DD` URL param + derives Friday/Saturday/
  Sunday labels from festival dates. Two-phase migration: 0007 (nullable + backfill) ->
  seed -> 0008 (NOT NULL flip + drop old columns). 413 tests green.

- 2026-05-10 — **Phase 0 (GREENROOM_STAGES_PLAN.md) — Workspace foundation + multi-tenant scoping**
  Added `workspaces` table + 4-role `team_members` (owner/admin/member/viewer). New
  `src/lib/permissions.ts` with 30 dot-notation keys and `resolvePermissions`. Rewrote
  `src/lib/session.ts`: session resolves workspace via team membership, no more
  `OWNER_EMAIL` shortcut. Added `workspaceId` FK (nullable → seed backfill → NOT NULL)
  to 12 tenant tables via two migrations (`0005_phase_0a_workspaces_nullable`,
  `0006_phase_0b_workspaceid_notnull`). `documents.ownerId` renamed to `workspaceId`.
  `src/db/seed.ts` creates "Aegis Productions" workspace + owner team member, backfills
  existing rows. Shared session fixture in `tests/fixtures/session.ts`; all 13 test
  files updated. 413 tests green. Deployed: Neon has 6 migrations applied, seed ran.

- 2026-05-10 — Fix: stage delete now works for all stages including the 4 seeded
  defaults. Root cause: `ensureDefaultStages()` was called inside
  `getCurrentEdition()` on every request, re-inserting deleted stages immediately.
  Removed the auto-seed call from the hot path. Also fixed optimistic UI update
  in StagesAdmin (router.refresh() was racing with local state).

- 2026-05-10 — Rebrand Phase C: GreenRoom HQ emerald palette applied to app chrome.
  - `src/styles/tokens.css` rewritten: brand accent changed from Aegis gold
    (`#E5B85A`) to GreenRoom emerald (`#34D399`); bg/surface/text tokens
    updated to match BRAND.md HQ spec; old `--color-brand-mint` /
    `--color-brand-coral` / `--color-brand-cream` / `--color-brand-indigo`
    tokens removed.
  - `src/styles/globals.css`: utility aliases updated (`text-coral` now
    points at `--color-danger`; `text-mint` at `--color-brand`; added
    `text-warn` and `text-danger`; removed orphaned `text-cream`/`bg-cream`).
  - `src/lib/branding/aegis-festival.ts` created: stashes the full Aegis
    Festival brand palette (indigo, cream, gold, coral, mint, stage colors)
    for use in export templates only.
  - Sidebar wordmark changed from "Aegis" + "Ops" badge to "GreenRoom" +
    "Stages" badge (festival mode badge stays "Live").
  - "Aegis System" string replaced with "GreenRoom Stages" in: layout.tsx
    metadata, app/page.tsx, sign-in/page.tsx, sign-up/page.tsx (x2),
    db/schema.ts comment.
  - All 13 component files that referenced old Aegis tokens updated via
    batch script (`--color-brand-mint` -> `--color-brand`,
    `--color-brand-coral` -> `--color-danger`,
    `--color-brand-cream` -> `--color-brand-fg`).
  - 413 tests green. `npm run check` clean.

- 2026-05-05 — Phase 5 MVP: festival-day mode shipped (413 tests).
  - `isFestivalMode` / `autoFestivalMode` helpers in
    `src/lib/festival-mode.ts`. Active on date range OR force-on flag.
  - Sidebar swaps to a 5-item festival nav (Now / Pickups / Arrivals
    / Issues / Roadsheets) when on; planning modules collapse into a
    "Planning" submenu so they're still reachable. Wordmark badge
    flips Ops -> Live (mint). Settings page grew a force-on toggle
    that flips `festivalEditions.festivalModeActive`.
  - Five festival routes under `/festival/`:
    - Now: per-stage now+next, pickups in next 2h, currently-checked-in
      bookings, top-5 open issues. Pure read board.
    - Pickups: next 2h emphasised + later today, with one-tap status
      advance buttons (Dispatch -> Picked up -> Delivered).
    - Arrivals: inbound flights today, with one-tap (Boarded -> In
      air -> Landed). Coral ring on rows where flight landed but
      linked pickup is still scheduled.
    - Issues: severity-sorted (high coral / medium brand / low
      muted), with scope chips today/week/all and per-row deep links
      to the relevant entity.
    - Roadsheets: searchable artist list -> per-artist day-of bundle
      from `getArtistRoadsheet`. Web-rendered, print-friendly CSS.
  - Three new advance routes wire into `recordTransition` for audit:
    - POST /api/flights/[id]/advance: server stamps `actualDt` on
      the landed transition (per spec - never trust user typing).
    - POST /api/pickups/[id]/advance: stamps dispatchedAt /
      inTransitAt / completedAt on the matching transition.
    - POST /api/hotel-bookings/[id]/advance: stamps checkedInAt /
      checkedOutAt.
      All three reject 409 at terminal forward states; the planning UI
      is the way to revise. PickupDbValues + HotelBookingDbValues
      extended with the new timestamp fields (table columns already
      existed since Phase 2.5a; only the typed shape was missing).
  - 24 new tests; suite up to 413.

  **Deferred to "Phase 5 polish":** stage filter chips wiring on
  Now/Pickups (component exists but unused), polling / pull-to-
  refresh, PWA install prompt, roadsheet PDF export, coral-pulse
  animations on overdue rows.

- 2026-05-05 — Phase 4: AI parsers (invoices + flights only, per Eli's
  scope direction). Two parsers in `src/lib/ai/`:
  - `parseInvoiceText` — extracts vendor / number / amount / currency /
    issue+due dates / line items / issuer kind from any pasted invoice
    text or extracted PDF body.
  - `parseFlightText` — extracts passenger / airline / flight number /
    IATA codes / scheduled datetime / PNR / seat / direction
    (inbound/outbound relative to BEY) from confirmation emails.
    Both wrap `claude-sonnet-4-6`, validate output with Zod, throw on
    malformed JSON or invalid fields. AI never writes - parsers return
    structured JSON; reusable `<AIParseDialog>` shows the result, the
    operator clicks Apply to fill the form, then submits normally to
    persist. "Parse with AI" button on the new-invoice and new-flight
    pages (hidden in edit mode). Routes auth-gated by `payments` and
    `flights` permissions respectively. 26 new tests; suite up to 389
    (was 363).
- 2026-05-05 — Drag-to-reorder slots within a stage column. Native
  HTML5 drag-and-drop (no new dep) inside `LineupBoard`: each slot
  is `draggable`, on drag-over the column reorders optimistically via
  a per-stage local override, on drop POSTs `{stageId, day, slotIds}`
  to a new `/api/slots/reorder` endpoint that validates each id
  belongs to the stage+day+edition before renumbering. 363 tests
  (was 356).
- 2026-05-05 — Stage / set-status filters on /artists. Two new
  dropdowns on the artists list: Stage (any of the 4 stages) and Set
  status (any of option / confirmed / not_available / live / done /
  withdrawn). `listArtists` resolves matching artist IDs via a
  `sets -> slots` selectDistinct join, then narrows the main query
  with `inArray` - cheaper than DISTINCTing the main select. API
  threads both as `?stageId=...&setStatus=...`. 356 tests (was 354).
- 2026-05-05 — Phase 2.9 + edit-flow fixes (354 tests).
  Aggregators: `src/lib/aggregators/` with `getArtistRoadsheet`,
  `getOpenIssues` (severity-sorted with the 7-rule set from
  OPERATIONS-FLOW.md §4), `getPickupsInWindow` (vendor + person
  denormalised), `getNowAndNext` (per-stage live + next, slot windows
  that wrap midnight handled), `getArrivalsToday` (inbound flights with
  linked-pickup status surfaced), `getCurrentlyActiveBookings` (edition
  scope via room-block join, walk-up bookings included).
  All pure functions with mocked-DB tests (lazy-queue mock pattern in
  `tests/unit/aggregators.test.ts`). 19 aggregator tests.
  Edit-flow gaps fixed:
  - Slots are now editable in-place via the lineup grid (click the
    time label to open `SlotDialog` in edit mode); previously you
    could only delete + recreate, losing attached sets.
  - Riders gained a full edit page at `/riders/[id]` (was inline-only:
    confirmed-toggle + delete).
    354 tests green (was 335). Probed: ran `npm run check` - clean.
- 2026-05-05 — Phase 2.65: Documents API + Vercel Blob proxy.
  `src/lib/documents/{schema,repo,blob}.ts` + `/api/documents` POST
  (multipart upload, max 25MB, PDF + image MIME types only) and
  `/api/documents/[id]` GET (auth-checked stream proxy with
  no-store cache headers, 404 across tenants — never leaks existence)
  and DELETE (deletes blob first, then row; orphaned blob over dangling
  ref). Reusable `<FileUpload>` component (upload button OR paste
  external URL, shows "uploaded file" or the raw URL once set,
  `Remove` button to clear). Retrofit applied to 8 forms across
  11 fields: ArtistForm passport, CrewForm passport, FlightForm
  ticket + confirmation email, InvoiceForm file, PaymentForm PoP,
  ContractForm draft + signed, RiderForm file, BookingForm
  confirmation. All use RHF Controller + tags so the documents row
  records the intent (passport / ticket / pop / contract / etc.).
  No schema changes — entity columns still store a URL string,
  now a proxy URL like `/api/documents/<uuid>`. **Existing free-text
  URLs you've typed already keep working** — the FileUpload widget
  shows the raw URL when it's not a proxy URL, and you can clear or
  re-upload. 26 new tests; suite up to 335. Probed: ran `npm run
check` — clean. **Note:** Blob is private (`access: 'private'`),
  so the actual file requires the BLOB_READ_WRITE_TOKEN that's set
  on the Vercel deployment. Local dev: ensure the token is in
  `.env.local`.
- 2026-05-05 — Phase 2.8: Riders, Contracts, Guestlist modules shipped
  (52 tests). Three CRUD modules from the same template:
  `src/lib/{riders,contracts,guestlist}/{schema,repo}.ts` + 6 routes
  - 3 dashboard pages each (list / new / detail). Contracts wires
    status transitions through `recordTransition` (added contract path
    to the audit channel - it was already in `AuditEntityType`); on
    draft → sent it auto-stamps `sentAt` to server now() unless the
    patch supplied one or `sentAt` was already set, same on
    sent → signed for `signedAt`. Riders has no audit (just a
    `confirmed` boolean toggled inline from the table). Guestlist has
    inline `inviteSent` + `checkedIn` toggles plus a four-card summary
    (total / pending invite / checked in / DJ guests breakdown via
    `getGuestlistSummary`). 309 tests green (was 257). Probed:
    ran `npm run check` - clean. **Not yet wired:** all three modules'
    file URL fields are still free-text (Phase 2.65 documents API
    retrofit). No production migration needed.
- 2026-05-05 — Phase 2.7: Payments + Invoices module shipped (39 tests).
  `src/lib/payments/{schema,repo}.ts` + 4 routes (`/api/invoices`,
  `/api/payments` with `[id]` siblings). Both PATCH routes wire status
  changes through `recordTransition` from 2.5a stage 2 - audit rows on
  every payment status flip, and on invoice status flips too (added
  `'invoice'` to `AuditEntityType`). Payment PATCH auto-stamps `paidAt`
  to server `now()` on a `→ paid` transition, but only when the patch
  doesn't already include an explicit `paidAt`. Aggregator
  `getPaymentsSummary(editionId)` returns counts + totals per status,
  partitioned by currency (USD/EUR; never converted). Dashboard:
  `/payments` page with four summary cards (pending/due/paid/overdue
  in muted/brand/mint/coral), filter row, payments table; sub-route
  `/payments/invoices` with its own list + filters; payment + invoice
  forms with display-unit money inputs that convert to cents on
  submit. 257 tests green (was 218 after 2.5). Probed: ran `npm run
check` - clean. **Not yet wired:** invoice file URL + payment
  popUrl are still free-text URLs (Phase 2.65 documents API will
  retrofit). No production migration needed - both tables already
  existed in the initial schema.
- 2026-05-05 — Phase 2.5: Hotels module shipped (3 resources, 57 tests).
  `src/lib/hotels/{schema,repo}.ts` + 6 routes (`/api/hotels`,
  `/api/room-blocks`, `/api/hotel-bookings` with their `[id]` siblings).
  Booking PATCH wires through `recordTransition` from 2.5a stage 2 -
  `booked → checked_in / checked_out / no_show / cancelled` all write
  audit rows atomically via `db.batch`. Capacity is computed on read
  via a sweep-line over booking date ranges (`getBlockCapacity`):
  reserved / peakAssigned / free, with overbooked blocks reporting
  negative free for UI flagging. Dashboard pages: hotels list with
  per-hotel block + reserved-rooms aggregates; hotel detail with inline
  room-blocks dialog + bookings table; flat /hotels/bookings list with
  status / hotel / person / date-range filters. Booking form filters
  blocks by selected hotel via `useWatch`. 218 tests green (was 161).
  Probed: ran `npm run check` - clean. **Not yet wired:**
  hotel-booking `confirmationUrl` is still a free-text URL field
  (Phase 2.65 documents API will retrofit it alongside artist passport,
  crew passport, contract, rider, invoice). Production migration not
  applied (no schema changes in this phase - already done in 2.5a).
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
