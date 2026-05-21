# GreenRoom Stages — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

_(nothing — pick from Later)_

## Later

- [ ] **Cmd+K AI agent** — streaming agentic loop, read/write tools, palette overlay
- [ ] **Resend email** — roadsheet email T-1 day per artist, invite emails
- [ ] **Audit log UI** — surface transition history in Settings
- [ ] **Repo + Vercel rename** — manual, Eli does this: `aegis-system` → `greenroom-stages`
- [ ] **Contract signing** — fresh design TBD (previous approach rejected; see memory)

---

## Done

- 2026-05-21 — **gaps filter + PWA icons**
  - `/artists` page reads `?gaps=1`; post-filters result via statusMap (missing
    set/contract/flight/hotel/rider or outstanding payments).
  - `ArtistsFilters`: "Gaps only" toggle button; brand-tint active state.
  - `public/icon-192.png` + `icon-512.png` generated (dark surface + emerald
    cross mark); manifest was already wired, icons were placeholder.
  - 465 tests green.

- 2026-05-21 — **Design v2 Phase 4.5** — Mobile responsiveness
  - Sidebar: mobile bottom-nav bar (4 primary items + "More" slide-up drawer);
    desktop rail unchanged. `safe-area-inset-bottom` padding for iOS.
  - `layout.tsx`: `min-w-0` prevents horizontal overflow; `pb-16 md:pb-0` clears nav.
  - Topbar: `px-4 md:px-6` tighter mobile padding; T-date chip hidden on xs.
  - FestivalSwitcher: `min-w-[180px]` → `min-w-40` canonical class.
  - DayTabs: `overflow-x-auto` wrapper for narrow-phone horizontal scroll.
  - 465 tests green.

- 2026-05-21 — **Design v2 Phase 5** — QA pass + audit history + docs sync
  - `getAuditHistory(entityType, entityId)` added to `src/lib/audit.ts`; 3 new tests.
  - `src/components/ui/AuditHistory.tsx` — shared async server component (collapsible
    `<details>` panel, shows status transitions as `from → to` in mono, timestamps).
  - Wired into 6 detail pages: `/artists/[id]`, `/flights/[id]`, `/ground/[id]`,
    `/contracts/[id]`, `/payments/[id]`, `/hotels/bookings/[id]`.
  - `/invite/[token]` page + `AcceptInviteForm`: radial brand-glow backdrop + loading
    prop on CTA — matching auth/onboarding surface pattern.
  - Contract detail page: `STATUS_CLASSES` → `STATUS_PILL` (pill-\* utilities).
  - Phase 4.5 (mobile) moved to Later; all other Phase 4 + Phase 5 items shipped.
  - 465 tests green (was 462).

- 2026-05-21 — **Design v2 Phase 4** — Forms, tables, pills, auth/onboarding wear v2
  - Button: `loading` prop with spinner; primary variant → `btn-gradient-brand`.
  - Input: `error` prop with message; brand-glow focus ring.
  - AIParseDialog: sky-accented Parse button with `loading` state.
  - All 13 list tables: `STATUS_CLASS` maps replaced with `pill-*` badge utilities.
  - Module-colored row hovers: sky (flights), amber (ground/payments/invoices),
    violet (hotels), pink (guestlist), brand (artists/contracts/riders/crew).
  - Festival surfaces: ArrivalsBoard + PickupsBoard pill badges.
  - Issues page: `SEV_PILL` with `animate-coral-pulse` on high severity.
  - Auth + onboarding pages: radial brand-glow backdrop, `loading` prop on CTAs.
  - 462 tests green (was 462 — no new tests in Phase 4 itself).

- 2026-05-21 — **Design v2 Phase 3** — Lineup + Cockpit + Festival-day Now wear v2
  - LineupBoard: `stage-wash` columns with `--stage-color` CSS var, Newsreader
    stage names in `stage-text`, `pill-*` status chips, empty-column blueprint
    placeholder (dotted border + "+ Add slot" CTA).
  - LineupPipeline: `COLUMN_PILL` replaces left-border `COLUMN_ACCENT`; column
    header labels are now `pill-*` badges. Card stage chips use `stage-pill` +
    inline `--stage-color`; live column has `animate-coral-pulse`.
  - ArtistCockpit: `NEXT_ACTION_TINT` map drives tinted `NextCard` per gap
    type (set=amber, contract/payment=emerald, flight=sky, hotel=violet,
    pickup=amber); `AllClearCard` uses `tinted-emerald`; `Row` dots promoted
    to full-height 2px bars.
  - NowBoard: stage cards use `stage-wash` + radial glow blob + `transition-
colors duration-1000`; "Now" artist name promoted to Newsreader 28pt;
    cancelled pickups get `tinted-coral` highlight.
    462 tests green (unchanged).

- 2026-05-21 — **Design v2 Phase 2** — Sidebar + Topbar + Home wear v2
  UX audit findings:
  - Sidebar: no mobile collapse exists (220px rail = 56% of 390px viewport).
    Filed as Later (Phase 4.5 scope).
  - Topbar: live strip was wired in globals.css but never rendered — added.
    Festival mode computed inline from `festival` object already in context.
  - Home: error boundary missing — added `home/error.tsx`. Loading skeleton
    missing — added `home/loading.tsx`. "Pending by artist" View-all did not
    pass `?gaps=1` — fixed. Consuming the param on /artists filed as Later.
    Visual changes landed:
  - Sidebar active item: brand-green left-to-transparent wash +
    `shadow-[0_0_6px_var(--color-brand-glow)]` on the 2px bar.
  - Sidebar "Live" badge: `pill-coral glow-coral` (vs "Stages" which stays
    the plain brand border pill).
  - Topbar: wraps in a flex-col container; `live-strip` rendered as the last
    child when `festivalMode === true`.
  - Home: T-minus promoted to Newsreader 32pt `text-hero-gradient` number.
    Three tinted stat cards (Readiness/emerald, High Issues/coral,
    Unpaid/amber). Severity dots replaced by full-height 2px severity bars
    with per-severity hover wash. Gap chips use `GAP_PILL` module-colored
    utilities. Radial gradient backdrop on "All clear" empty state.
    New: `GAP_PILL` in `artist-readiness.ts`. `getUnpaidTotal()` in
    `payments/repo.ts`. 7 new tests in `home-stats.test.ts`.
    462 tests green (was 455).

- 2026-05-21 — **Design v2 Phase 1** — tokens + utilities
  Full v2 palette landed in `src/styles/tokens.css`: cooler bg
  `#0B0E16`, six functional accents (emerald · amber · coral · sky ·
  violet · pink) each bound to a product meaning, stage hex values
  aligned to the v2 functional set, gradient + tint + glow tokens,
  brand-soft `#67F0C0` for the gradient button base. New utilities
  in `src/styles/globals.css`: surface tints (`tinted-emerald` etc.),
  stage washes (`wash-stage-main` etc.), status pills (`pill-emerald`
  etc.), glows (`glow-brand` etc.), gradient text (`text-hero-gradient`),
  `live-strip` (2px animated gradient bar for the topbar in festival
  mode), `btn-gradient-brand`, `shadow-brand`. All v1 utility/token
  names preserved (token-only diff). Spec + rollout in
  `DESIGN_V2_PLAN.md`. Visual study in `design-study.html`. AGENT.md
  §3 and docs/BRAND.md refreshed to v2.

- 2026-05-19 — **Lineup pipeline view** (Phase D)
  Added a kanban view to /lineup, alongside the existing calendar grid.
  - **View toggle** (`?view=grid|pipeline`) in the lineup header.
    Pipeline drops the day tabs (status is cross-day). New shared
    `ViewToggle.tsx` component (Suspense-wrapped to satisfy the
    pre-push useSearchParams sweep).
  - **Pipeline component** (`LineupPipeline.tsx`): 6 status columns
    (option / confirmed / not_available / live / done / withdrawn).
    Each card = one set. Drag a card across columns to advance status;
    optimistic UI update, PATCH `/api/sets/[id]` with `{status}` writes
    the audit row via the existing `recordTransition` path. Revert on
    server failure. Card shows artist + stage chip + slot date/time +
    fee. Click navigates to the artist cockpit.
  - **New repo function** `getLineupPipeline(festivalId)` returns all
    sets joined with artist + slot + stage in one shape the client
    groups by status. 3 new unit tests.
    455 tests green (was 452).

- 2026-05-19 — **Cockpit + worklist + side sheets** (planning-mode flow rebuild)
  Three connected wins shipped together:
  - **Deep links + prefill** across every creation page. `/flights/new`,
    `/hotels/bookings/new`, `/ground/new`, `/riders/new`, `/contracts/new`,
    `/payments/new` all accept `?personId=&personKind=` (or `?artistId=`)
    and preselect the artist. Six form components gained matching
    `defaultPerson` / `defaultArtistId` props.
  - **Home rewritten as a worklist**. Dropped the 4-stat-card grid + hero +
    standalone pickups block. New layout: compact festival strip with a
    lineup-readiness progress bar, top 5 open issues (severity-coded
    deep links), and a "Pending by artist" roll-up where each missing piece
    is a chip that deep-links to the prefilled new-X form. Live-mode
    redirects to `/festival/now`. New aggregator
    `src/lib/aggregators/artist-readiness.ts` returns per-artist gaps +
    festival-wide percent.
  - **Artist page is now a cockpit**. Old 4-card + 9-row checklist replaced
    with: header (set time + completion ratio), pulsing "Next" hero card
    with contextual reason text and one primary CTA, 9-row progress rail,
    collapsible identity card. `src/lib/artists/next-action.ts` computes
    the next gap from the roadsheet (operational order:
    set → contract → flight → hotel → pickup → payment). Every "Add"
    button opens a right-aligned **side sheet** with the relevant form
    pre-populated — submit closes the panel and refreshes the page in
    place, no navigation. New primitive
    `src/components/ui/SideSheet.tsx` (portal, ESC, scroll lock, slide-in).
    Six forms gained an optional `onSuccess` prop so they can close the
    sheet instead of `router.push`.
    452 tests green (was 439 — added 5 readiness + 8 next-action tests).
    Deleted orphaned `src/app/(dashboard)/home/PickupAdvanceButton.tsx`.

- 2026-05-19 — **Phase 5 polish**
  - **Stage filter chips** wired into Now page: converted to server+client split
    (`NowBoard` client component), `StageFilterChips` renders above stage grid,
    selection persists in localStorage.
  - **Auto-refresh (30s polling)**: `src/hooks/useAutoRefresh.ts` — polls
    `router.refresh()` on interval, pauses when tab is hidden, resumes + fires
    immediately on tab focus. Wired into NowBoard, PickupsBoard, ArrivalsBoard.
  - **Coral-pulse animation**: `@keyframes coral-pulse` in globals.css,
    `animate-coral-pulse` utility. Applied to high-severity issue rows (Now page)
    and overdue payment rows (Payments page) — border pulses between
    rgba(231,62,84,0.25) and rgba(231,62,84,0.75) on a 2s loop.
  - **PWA manifest**: `public/manifest.json` (name, start_url /home, theme
    #E5B85A, standalone display). `Viewport` export with `themeColor`. Apple
    web-app meta tags. Enables "Add to Home Screen" on iOS/Android.
  - **Roadsheet PDF export**: `GET /api/roadsheets/[artistId]/pdf` — renders
    full roadsheet (set, travel, hotel, pickups, riders, contract, payments) as
    a dark-themed A4 PDF via pdf-lib. Gold top bar, Helvetica, section dividers.
    "Export PDF" download link added to roadsheet page topbar.
    439 tests green.

- 2026-05-19 — **Phase 7 — Brand + copy sweep**
  One string updated: `src/app/layout.tsx` metadata description changed from
  "Festival operations for Aegis Festival" to "Festival & live-event operations
  platform". All other product-name strings ("GreenRoom Stages") were already
  correct. `src/lib/branding/aegis-festival.ts` intentionally kept as-is
  (tenant brand for export templates only). 439 tests green.

- 2026-05-14 — **Phase 6 — Home page + sidebar simplicity sweep**
  `/home` dashboard: festival hero card (name, dates, location, T-date), 4 stat
  cards (artists, open issues, unpaid, pickups next 6h), top-6 open issues with
  HIGH/MED/LOW severity colour coding + direct nav links, upcoming pickups (next 6h)
  with inline one-tap advance buttons (Dispatch / Picked up / Delivered). Sidebar
  reduced to 8 visible items (Home + 7 modules); Crew / Riders / Contracts / Documents
  collapsed under "More" toggle (auto-opens when on those routes). Root / redirect
  updated to /home. Text hierarchy applied throughout: values in --color-fg, labels
  in --color-fg-muted, metadata in --color-fg-subtle. 429 tests green.

- 2026-05-14 — **Phase 5 (GREENROOM_STAGES_PLAN.md) — Festival switcher + T-date fix**
  `getActiveFestival` now checks `active_festival_id` cookie before falling back to oldest
  festival. `POST /api/festivals/active` sets the cookie (httpOnly, 1-year, workspace-scoped).
  `FestivalContext` expanded to carry full festival object + all festivals in workspace.
  `FestivalSwitcher` component: static name when 1 festival, dropdown when >1 (sets cookie
  - reloads). Topbar renders switcher alongside T-date chip; T-date auto-tracks selected
    festival's startDate. Dashboard layout fetches festival list in parallel with mode check.
    4 new tests; 429 total. `npm run check` green.

- 2026-05-14 — **Phase 4 (GREENROOM_STAGES_PLAN.md) — Festival settings page**
  Festival tab added to Settings: editable name, dates (start/end), location,
  description via PATCH /api/festivals/[id]. Stages CRUD in the same tab:
  add/edit/delete stages with name, slug (auto-derived), 8-preset color picker
  - custom hex input, per-stage activeDates chip selector (click to toggle
    dates in the festival window; empty = all days). Slot creation now guards
    activeDates: rejects 422 when the requested date is not in the stage's
    activeDates list (empty/null = unrestricted). 12 new tests; 425 total.
    `npm run check` green.

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
- 2026-05-21 — Design v2 "Festival Console". Move from a single-emerald
  blueprint to six functional accents (emerald · amber · coral · sky ·
  violet · pink). Stage colors elevated from chip-data to wayfinding,
  and made **data-driven** — chrome reads `stage.color` at runtime via
  `--stage-color` CSS variable + `color-mix()` utilities; no four-stage
  enum in code. Newsreader promoted from wordmark-only to hero data
  carrier. Token _names_ preserved so the swap is non-breaking; rollout
  phased 1–5 (with Phase 4.5 mobile-responsiveness pass) in
  `DESIGN_V2_PLAN.md`. Each phase ships v2 visual + a structured UX
  audit in the same commit.
