# GreenRoom Stages — Design v2 "Festival Console" plan

> **Reading order:** This file replaces the visual-pass section of
> `HANDOFF.md` Phase 7. It is the canonical phased plan for the v2
> design refresh AND a structured UX audit loop. Read `AGENT.md` §3
> first (Brand & Design System), then `docs/BRAND.md`, then this file.
>
> **Source of truth for the visual language:** the design book at
> `design-study.html` (open in browser → Ctrl+P → "Save as PDF"). When
> this doc conflicts with the design book, the design book wins until
> updated.
>
> **Authoring rule for the agent running these phases:** every phase
> ships in **two parts** in the same commit — (A) a UX audit answering
> the standard questionnaire below for every screen in that phase's
> scope, and (B) the v2 visual changes. Both land together. The agent
> is empowered to act as a B2B solution designer: if part A surfaces
> friction worth fixing, fold the fix into the same diff.

---

## North star

v1 reads as a CAD tool: neutral dark canvas, hairline borders, one
emerald accent, mono numbers, Newsreader hidden in the wordmark, every
page identical. v2 ("Festival Console") rebuilds the chrome around
six functional accents bound to product meaning **plus stage colors
that are operator data, not a four-element enum.**

| Hex (default) | Token            | Role                                      |
| ------------- | ---------------- | ----------------------------------------- |
| `#34D399`     | `--color-brand`  | Brand · success · paid · confirmed        |
| `#FFB546`     | `--color-amber`  | Warn · pending · money                    |
| `#FF6B7A`     | `--color-coral`  | Danger · overdue · withdrawn · live-pulse |
| `#7DB9FF`     | `--color-sky`    | Info · flights & travel module            |
| `#B69CFF`     | `--color-violet` | Hotels & lodging module                   |
| `#FF9DD0`     | `--color-pink`   | Guestlist module                          |

These six are the **app chrome**, fixed across all tenants.

**Stages are data.** `stages.color` is a user-editable hex (Settings →
Festival → Stages). The chrome reads it at runtime via a `--stage-color`
CSS variable set inline; utilities derive every variant
(`stage-wash`, `stage-tint`, `stage-pill`, `stage-glow`, `stage-text`,
`stage-bar`) using `color-mix()`. A festival can have 1 stage or 12;
each can be any hex. No code lists four slugs.

**Non-negotiable invariants** (from `AGENT.md`):

- All v1 token _names_ survive (`--color-bg`, `--color-fg`,
  `--color-brand`). Only values change.
- Aegis tenant export brand (`src/lib/branding/aegis-festival.ts`)
  untouched.
- Operator vocabulary unchanged.
- Voice unchanged: direct, imperative, no emoji.
- Operator-grade density: card padding does NOT grow. Tap targets
  ≥ 44×44 on phone.

---

## UX audit template — answer this for every screen in scope

Before applying v2 styling to a surface, the agent walks the surface
and answers these questions. Each answer either becomes a sub-task in
the same phase or gets explicitly logged as "out of scope, follow-up
ticket." Skipping the audit is not allowed.

**Reference framing:** Eli is a single-operator running the whole
festival from a laptop most of the year, then from a phone during
the three festival days. The product replaces a sprawl of Google
Sheets. The job to be done is "make Eli's day better" — every audit
question is a lens on that job.

### A · Friction inventory

Walk the primary task on this surface end-to-end. List every click,
tap, keypress, page navigation, and modal between Eli and the goal.

- [ ] Can any click be removed? (Common offenders: confirmation
      modals on reversible actions, navigation away from a list to
      do something that could be inline.)
- [ ] Can any field be inferred? (Default the date, person, currency,
      vendor from context if there's a sane guess.)
- [ ] Does the form preserve work on tab switch / accidental
      navigation? (Localstorage draft, or "you have unsaved changes"
      banner.)
- [ ] If the surface is reached from a deep link, does the deep link
      prefill? (We already deep-link-prefill 6 forms — check
      coverage on this surface.)

### B · Slow paths

- [ ] What's the longest server round-trip? Can it be moved
      server-side (`force-dynamic` page, server action) instead of
      double-fetched?
- [ ] What's the largest payload? Can we paginate, virtualize, or
      strip fields the client doesn't need?
- [ ] Is there a "list → detail" jump that costs a full page load?
      Could a side sheet (we have `SideSheet.tsx`) replace it?
- [ ] Are aggregations recomputed per request? Any opportunity for
      a Drizzle materialized view or memoization?

### C · Missing or ugly states

- [ ] **Empty.** Does the empty state suggest the next action? Is it
      on-brand (blueprint motif allowed, marketing language not)?
- [ ] **Loading.** Skeleton or spinner? Skeleton wins for known
      shapes (lists, tables). Spinner only for unbounded waits.
- [ ] **Error.** What does the user see if the request fails? Is the
      error actionable? Is there a retry?
- [ ] **No-permission.** Coordinator vs viewer vs owner — does the
      page degrade gracefully?
- [ ] **Stale.** If festival-day mode flips ON while the page is open
      (planning view loaded, then time passes into the festival
      window), does the chrome update? Is there a polling
      reconciliation?

### D · Mobile fitness (festival-day-critical)

- [ ] At 390×844 (iPhone 14 Pro), is everything reachable with one
      thumb? Are CTAs in the bottom half?
- [ ] Tap targets ≥ 44×44? (AGENT.md §3 mandates this.)
- [ ] Does horizontal scrolling happen anywhere? It shouldn't —
      tables should reflow or scroll-X within a contained wrapper.
- [ ] Is there a way to dismiss / close any open sheet or modal
      with a thumb-friendly gesture (down-swipe close, big X in
      corner)?
- [ ] Pull-to-refresh isn't wired (we use 30s polling). Should it
      be on this surface? (Festival-day routes: yes. Planning
      routes: no.)

### E · Keyboard / power-user

- [ ] Tab order makes sense? Focus rings visible? (Phase 4 adds
      brand-glow focus rings.)
- [ ] Any obvious keyboard shortcut missing? (Cmd+K is Later. But
      `?` for help, `j/k` for next/prev in a list, `e` for edit,
      `n` for new — cheap wins if the surface is list-heavy.)
- [ ] Esc closes the side sheet? (Already wired in `SideSheet.tsx`.)
- [ ] Enter submits the form? Cmd+Enter from the comment box?

### F · B2B operator patterns

The 10-year B2B designer's checklist:

- [ ] **Bulk operations.** Can Eli select multiple rows and apply
      an action to all? (Mark paid, mark confirmed, export
      selected.) Festival ops is bulk by nature.
- [ ] **Filter persistence.** Do filters survive a page reload?
      URL query params are the right pattern.
- [ ] **Undo / soft-delete.** Is there a fat-finger recovery? At
      minimum a "Just deleted X — Undo" toast with a 5s grace
      window. Hard deletes only after that.
- [ ] **Audit visibility.** Every status transition writes an
      `audit_events` row (AGENT.md §14). Is the row's data
      reachable from the UI? On the detail page, expose a "History"
      collapsible.
- [ ] **Export.** Is there a CSV/PDF escape hatch from this
      surface? Phase 3 of `HANDOFF.md` mandates per-module CSV
      export — verify the button exists.
- [ ] **Search depth.** Fuzzy match? Across which fields? Should
      this surface have a search input?
- [ ] **Inline editing.** For high-frequency single-cell edits
      (set status, payment status, pickup time), can the change be
      made inline instead of navigating to /edit?
- [ ] **Print / save.** Roadsheet PDFs already work; does the
      surface need a print-friendly CSS pass?

### G · "Day better" — the one-question test

> If Eli ran this exact workflow ten times today, what would he be
> annoyed by the tenth time?

Answer with a concrete fix. If none, write "nothing — surface is
clean."

### Output of the audit

For each surface in the phase, write a short audit block in the
commit body (also captured in `TASKS.md` Done entry):

```
SURFACE: /home

A. Friction:
   - Severity-dot click is fine; no redundant nav.
   - Add gap chips already deep-link-prefill correctly. ✓
B. Slow paths:
   - `getOpenIssues` + `getFestivalReadiness` are parallel `Promise.all`. ✓
   - No N+1 visible.
C. States:
   - Empty state copy is on-brand. Add radial-gradient backdrop.
   - Loading: Next.js suspense already cooperative.
   - Error: no boundary on /home — ADD `error.tsx` for /home.    ← in scope
D. Mobile:
   - max-w-3xl renders fine at 390px. ✓
E. Keyboard:
   - Tab order on issue rows skips correctly.
F. B2B:
   - No bulk action on issues — DO NOT add (out of scope, low
     value here, follow-up ticket #).
G. Day-better:
   - The "Pending by artist" roll-up shows 8 — Eli will hit "View
     all → /artists" daily. Add a quick-filter `?gaps=1` URL
     parameter so /artists opens already filtered to artists with
     gaps.                                                       ← in scope
```

---

## Definition of done (every phase)

Per `CLAUDE.md` and `AGENT.md` §11:

```bash
npm run check     # must be green
```

Hard requirements per shipped phase:

- UX audit block written for every surface in scope (above template).
- In-scope follow-ups from the audit landed in the same commit OR
  filed as a Later item in `TASKS.md`.
- `npm run check` green locally.
- `TASKS.md` updated — move the phase from Now to Done with today's
  date; the audit findings + actions go in the Done entry.
- Commit format: `feat(design-v2-phase-N): <one-line>`.
- Screenshots of before/after attached to PR for the touched screens.
- No new dependencies introduced.

---

## Phase 1 — Tokens & utilities ✅ SHIPPED

Already landed in `src/styles/tokens.css` and `src/styles/globals.css`.
Non-breaking on its own: every existing component re-renders against
the new palette.

What landed:

- v2 palette (cooler bg `#0B0E16`, six functional accents).
- Stage colors are **data-driven**: `--stage-color` CSS variable set
  inline from `stage.color`. Utilities: `stage-wash`, `stage-tint`,
  `stage-pill`, `stage-glow`, `stage-text`, `stage-bar`. Derive
  variants via `color-mix()`. The number of stages and their hex
  values are not fixed.
- Default stage hex tokens (`--color-stage-main/alt/pool/coll`)
  preserved as **seeds for festival onboarding only** — the chrome
  doesn't read them; it reads each row's `color` column.
- Surface tints, status pills, glows, gradient text, live-strip,
  gradient button — all from the design book.
- All v1 utility names preserved.

**Acceptance:** `npm run check` green. Whole app renders against new
palette without touching any component.

---

## Phase 2 — Sidebar, Topbar, Home — Days 1–2

**Goal:** make v2 visible on the surfaces Eli looks at every day.
Three files. Highest payoff per minute.

### Surfaces in scope (audit each)

```
src/components/dashboard/Sidebar.tsx
src/components/dashboard/Topbar.tsx
src/app/(dashboard)/home/page.tsx
src/app/(dashboard)/home/error.tsx                (new — A/C audit may require)
src/app/(dashboard)/home/loading.tsx              (new — A/C audit may require)
```

### Part A — UX audit (run the template above)

The agent must produce an audit block per surface in the commit body.
Likely findings to look for (do not paste these as the audit — discover
fresh):

- **Sidebar (mobile).** At 390px the 220px sidebar consumes 56% of
  the viewport. The festival-day mode collapses to icons-only? Verify
  the existing component renders correctly on phone — add an "icons
  only" mobile mode if not. (FESTIVAL-DAY.md mandates mobile-first
  during the festival.)
- **Topbar.** What does it render today besides title + festival
  switcher + T-date? If anything is duplicated from /home (festival
  name, T-minus), remove it from one place.
- **Home — "View all" links.** Each section header has a "View all"
  link. If "/artists" is the destination from "Pending by artist,"
  does /artists open filtered to artists with gaps? If not, add the
  filter query param and consume it on /artists.
- **Home — readiness percent.** The percent jumps as data lands —
  is the change visible? Should the row pulse subtly when the
  percent crosses a threshold (e.g., +5%)?
- **Home — empty state.** "All clear — every artist is fully
  prepped." Reads fine; add the radial-gradient backdrop from v2.

### Part B — v2 visual changes

#### Sidebar.tsx

- Active nav item: replace `bg-white/[0.06]` active background with
  a brand wash:
  ```tsx
  className={active
    ? "text-[--color-fg] bg-[linear-gradient(90deg,rgba(52,211,153,0.16),transparent_60%)]"
    : ...}
  ```
- Existing 2px left bar stays; add `shadow-[0_0_6px_var(--color-brand-glow)]`.
- Festival-mode `Live` badge: swap to `pill-coral` (utility from
  Phase 1) instead of the hand-rolled border + bg, with a
  `glow-coral` to make it visceral.
- Settings + user row at bottom: neutral.

#### Topbar.tsx

- Add a 2px `live-strip` utility under the topbar when
  `festivalMode === true`. Read the flag from `FestivalContext`.
  Place it as the last element in the bar, full width.
- Keep the existing T-date chip in mono on the topbar (small,
  contextual). The hero T-minus number lives on /home (see below).

#### home/page.tsx

1. **T-minus → hero number.** Replace the small mono chip with a
   Newsreader 32pt number rendered with `text-hero-gradient`:

   ```tsx
   <div className="text-hero-gradient text-[32pt] leading-none">
     T−{daysOut}d
   </div>
   ```

2. **Three tinted stat cards above the worklist.** Insert between
   the festival strip and "This week":
   - Readiness percent · `tinted-emerald` · Newsreader 22pt emerald
     value · micro mono label "Readiness"
   - High-severity issue count · `tinted-coral` · same treatment
   - Unpaid total (€/$) · `tinted-amber`

   Unpaid total comes from extending or reading existing
   `getPaymentsSummary(festivalId)` in `src/lib/payments/repo.ts`.
   New test `tests/unit/home-stats.test.ts` snapshotting the three
   values from a fixture.

3. **Severity rows: bar replaces dot.**

   ```tsx
   <span
     className="w-[2px] self-stretch shrink-0 rounded-sm
                    bg-[var(--color-danger)]
                    shadow-[0_0_8px_var(--color-coral-glow)]"
   />
   ```

   Hover gets a low-alpha `coral/amber/fg-subtle` wash per severity.

4. **Pending-by-artist gap chips: module-colored pills.** Map gap to
   pill utility:

   | gap              | pill           |
   | ---------------- | -------------- |
   | `set`            | `pill-amber`   |
   | `contract`       | `pill-emerald` |
   | `inbound_flight` | `pill-sky`     |
   | `hotel`          | `pill-violet`  |
   | `pickup`         | `pill-amber`   |
   | `payment`        | `pill-emerald` |

   Add `GAP_PILL` next to `GAP_LABEL` in
   `src/lib/aggregators/artist-readiness.ts`.

5. **Empty state radial backdrop.** When `topIssues.length === 0 &&
artistsWithGaps.length === 0`, the centered "All clear" message
   gets a soft radial backdrop:

   ```tsx
   <div className="relative">
     <div
       className="absolute inset-0 pointer-events-none"
       style={{
         background:
           "radial-gradient(40% 60% at 50% 50%, var(--color-brand-glow), transparent 60%)",
       }}
     />
     <div className="relative text-center py-16 ...">
       All clear — every artist is fully prepped.
     </div>
   </div>
   ```

6. **Add `home/error.tsx`** if audit C surfaced no error boundary.
   A simple "Couldn't load home — try again" with a refresh button,
   on the v2 surface.

### Tests

- Existing home tests verify regression.
- `tests/unit/home-stats.test.ts` covers the three stat values.
- Audit fixes that touch repos/aggregators get their own tests.

### Acceptance

- Sidebar active item: brand wash + glow.
- Live badge: coral + glow.
- Topbar: 2px gradient strip in festival mode.
- Home: T-minus hero gradient number, three tinted stat cards,
  severity bar replaces dot, module-colored gap chips, radial
  empty-state.
- UX audit block in commit body covering every surface.
- `npm run check` green.

### Commit

```
feat(design-v2-phase-2): sidebar, topbar, home wear v2

UX audit findings + fixes:
- Home: added error.tsx (was missing)
- /artists deep-link from gap roll-up now passes ?gaps=1 (consume on /artists)
- [other audit-driven fixes here]

Visual changes:
- Sidebar active item: brand wash + glow
- Live badge: coral + glow
- Topbar live strip in festival mode
- Home: T-minus hero, 3 tinted stat cards, severity bar, module-colored gap chips, radial empty state

npm run check: <paste output>
```

---

## Phase 3 — Lineup, Cockpit, Festival-day Now — Days 3–5

**Goal:** the dashboard's three highest-touch surfaces. Promote stage
colors from chip data to wayfinding using the **data-driven**
`stage-*` utilities. Hero "Next action" card on the cockpit. Each
stage card on Now wears its own (operator-configured) color.

### Surfaces in scope (audit each)

```
src/app/(dashboard)/lineup/_components/LineupBoard.tsx
src/app/(dashboard)/lineup/_components/LineupPipeline.tsx
src/app/(dashboard)/artists/[id]/_components/ArtistCockpit.tsx
src/app/(dashboard)/festival/now/page.tsx
src/app/(dashboard)/festival/now/_components/NowBoard.tsx       (if split)
src/lib/festivals.ts                                            (DEFAULT_STAGE_SEEDS if hex changes)
```

### Part A — UX audit (run the template)

Likely areas to dig:

- **LineupBoard drag-to-reorder.** Native HTML5 drag. On mobile
  (festival-day), drag doesn't work; what's the fallback? Touch-
  drag with long-press? Up/down arrow buttons? At minimum, "edit
  slot times in the slot dialog" is the escape hatch — verify
  discoverable.
- **LineupPipeline (kanban).** Drag a card across columns. What
  happens on a flaky network — does the optimistic UI revert
  visibly with a toast?
- **ArtistCockpit "Next action."** The current logic computes the
  next gap from the roadsheet. If the next gap is "pickup" but
  the artist has no flight booked yet, is "pickup" actually the
  right next action? Audit the ordering (`src/lib/artists/next-
action.ts`). The visual hero should match what's actionable, not
  the alphabetically-next gap.
- **NowBoard auto-refresh.** 30s polling. If a stage's set ends
  mid-poll, what's the user experience — does the card visibly
  transition, or does it just snap? Add a fade-cross or a 1s
  CSS transition.
- **Roadsheet PDF link** (festival/roadsheets/[artistId]). Is it
  reachable from the cockpit AND the now-board? Verify.
- **Stage filter chips** on Now. Already wired. Are they sticky on
  mobile scroll? Should be.

### Part B — v2 visual changes (data-driven stage colors)

#### LineupBoard.tsx

Each stage column wears its color via `stage-wash` + inline CSS var:

```tsx
<div
  className="stage-wash rounded-md border p-3"
  style={{ "--stage-color": stage.color } as React.CSSProperties}
>
  <h4 className="stage-text text-display text-[14pt] mb-2">{stage.name}</h4>
  {/* slot tiles */}
</div>
```

Slot tile status chips become `pill-emerald/amber/coral` mapped to
set status (see Phase 4 mapping).

Empty-column state: dotted blueprint placeholder with a centered
"+ Add slot" CTA. The CTA is module-emerald.

#### LineupPipeline.tsx

Each of the 6 columns gets a colored status pill header. Status →
pill mapping (Phase 4 confirms):

- `option` → `pill-amber`
- `confirmed` → `pill-emerald`
- `not_available` → `pill-coral`
- `live` → `pill-amber` + the existing `animate-coral-pulse` border
- `done` → `pill-emerald` with `opacity-70`
- `withdrawn` → `pill-coral` with `opacity-70`

Cards inside columns: the stage chip on each card uses
`stage-pill` + inline `--stage-color`:

```tsx
<span
  className="stage-pill text-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded"
  style={{ "--stage-color": set.stage.color } as React.CSSProperties}
>
  {set.stage.name}
</span>
```

#### ArtistCockpit.tsx — hero "Next action" card

The existing `next-action.ts` computes the gap. Wrap the next-action
block in a tinted hero matching the gap's module:

```tsx
const NEXT_ACTION_TINT: Record<ReadinessGap, string> = {
  set: "tinted-amber",
  contract: "tinted-emerald",
  inbound_flight: "tinted-sky",
  hotel: "tinted-violet",
  pickup: "tinted-amber",
  payment: "tinted-emerald",
};
```

Inside:

- Micro label "NEXT ACTION" in the matching accent color.
- Newsreader 18pt copy line ("Book a hotel for Hiroko.").
- Body paragraph with contextual reason (existing copy).
- Primary CTA `btn-gradient-brand` opens the prefilled side sheet
  for the form. (Side sheet already wired.)

9-row progress rail below. Each row gets a `tinted-*` background
matching its module. Filled rows: emerald tint. The next-action
row: the matching module tint + a `glow-*` so it visibly invites a
click.

If the artist's set is on a stage with a non-default color, the
stage chip and "set" rail row use `stage-*` utilities with inline
`--stage-color`.

#### NowBoard.tsx / festival/now/page.tsx

Each stage card wears its color via `stage-wash` (top-down) plus a
soft radial glow blob in the top-right:

```tsx
<div
  className="stage-wash relative overflow-hidden rounded-md border p-4"
  style={{ "--stage-color": stage.color } as React.CSSProperties}
>
  <div
    className="absolute right-0 top-0 w-[40mm] h-[40mm] rounded-full opacity-[.14] pointer-events-none"
    style={{ background: stage.color, filter: "blur(8mm)" }}
  />
  <div className="stage-text text-mono text-[7pt] uppercase tracking-[0.16em]">
    {stage.name} · Live
  </div>
  <div className="text-display text-[32pt] leading-none mt-2">
    {currentSet.artist.name}
  </div>
  <div className="text-mono text-[--color-fg-muted] mt-1">
    {fmt(currentSet.startsAt)} → {fmt(currentSet.endsAt)}
  </div>
  <div className="mt-3">
    <span
      className="stage-pill text-mono text-[7pt] px-2 py-1 rounded"
      style={{ "--stage-color": stage.color } as React.CSSProperties}
    >
      → NEXT · {nextSet.artist.name} · {fmt(nextSet.startsAt)}
    </span>
  </div>
</div>
```

Pickups-next-2h: overdue rows wear `tinted-coral` + the existing
`animate-coral-pulse`. Non-overdue rows stay neutral. In-transit
pickups get a subtle `tinted-amber`.

A 1s CSS `transition-colors` on the stage card so the polling
update doesn't snap.

### Tests

- LineupBoard, LineupPipeline, ArtistCockpit, NowBoard existing
  tests pass (CSS-only changes).
- New test: `tests/unit/stage-color-utility.test.ts` snapshots a
  stage card rendered with a non-default hex (e.g., `#FFFFFF`) to
  confirm the `color-mix` fallback works.
- `NEXT_ACTION_TINT` keyed against `ReadinessGap` enum — locks
  the mapping.

### Acceptance

- Lineup grid: every stage column visibly wears its `stage.color`
  (top-down wash). Adding a new stage in Settings with a custom
  hex Just Works — no new utility class needed.
- LineupPipeline: column headers are colored status pills; live
  column pulses.
- Artist cockpit: hero "Next action" card tinted by next gap's
  module; 9-row rail wears module colors; if the artist's set is
  on a non-default-colored stage, the stage row picks up that hex.
- Now page: stage cards colored by stage.color; active set names
  in Newsreader 28pt+; overdue pickups pulse coral.
- UX audit block in commit body.
- `npm run check` green.

### Commit

```
feat(design-v2-phase-3): lineup, cockpit, now wear v2 with data-driven stage colors

UX audit findings + fixes:
- [from the audit]

Visual:
- LineupBoard: stage-wash + inline --stage-color
- LineupPipeline: colored status pills; live-column pulse
- ArtistCockpit: tinted "Next action" hero, module-colored rail
- NowBoard: stage-wash cards (any operator-chosen hex), Newsreader
  28pt set names, overdue pickups pulse coral, 1s transition

npm run check: <paste output>
```

---

## Phase 4 — Forms, tables, status pills — Days 6–7

**Goal:** push v2 across every list page and form. Surface every
status indicator. Largest screen coverage; lowest unit-of-work
density.

### Surfaces in scope (audit batches)

```
Batch 4a — primitives:
  src/components/ui/button.tsx
  src/components/ui/input.tsx
  src/components/ui/label.tsx
  src/components/ui/AIParseDialog.tsx
  src/components/ui/SideSheet.tsx
  src/components/ui/FileUpload.tsx

Batch 4b — list pages:
  src/app/(dashboard)/artists/_components/*
  src/app/(dashboard)/flights/_components/*
  src/app/(dashboard)/hotels/_components/*
  src/app/(dashboard)/hotels/bookings/_components/*
  src/app/(dashboard)/ground/_components/*
  src/app/(dashboard)/payments/_components/*
  src/app/(dashboard)/payments/invoices/*
  src/app/(dashboard)/guestlist/_components/*
  src/app/(dashboard)/riders/_components/*
  src/app/(dashboard)/contracts/_components/*
  src/app/(dashboard)/crew/_components/*
  src/app/(dashboard)/documents/*

Batch 4c — festival-day:
  src/app/(dashboard)/festival/issues/page.tsx
  src/app/(dashboard)/festival/arrivals/_components/*
  src/app/(dashboard)/festival/pickups/page.tsx
  src/app/(dashboard)/festival/roadsheets/*

Batch 4d — auth/onboarding:
  src/app/sign-in/page.tsx
  src/app/sign-up/page.tsx
  src/app/onboarding/**/page.tsx
  src/app/invite/[token]/*
```

### Part A — UX audit (run the template per batch)

Likely B2B wins to look for in each batch:

- **Batch 4a primitives.** Does `<Input>` accept an `error` prop
  and render the message + coral ring? If not, add it. Does
  `<Button loading={true}>` render a spinner + disabled state? If
  not, add it. These are universal lifts.
- **Batch 4b — list pages.**
  - Bulk select on /payments (mark multiple paid) is a huge win.
    Audit feasibility; if low-risk, ship.
  - Filter persistence: every list page should sync filters to
    URL query params. Audit each; fix the ones that don't.
  - Inline edit on /lineup (slot time, set status) already exists.
    Audit /payments (status flip), /flights (status flip), /ground
    (status flip via existing advance routes) — does the row let
    Eli flip status without navigating to /edit?
  - Audit history exposure: every detail page should have a
    collapsible "History" section reading `audit_events`. Add
    where missing.
- **Batch 4c — festival-day.**
  - Pull-to-refresh on phone. Wire it as a small client hook on
    /festival/\* routes.
  - Big touch targets on issue rows; "tap row to open" is
    discoverable.
  - Roadsheet PDF button: 44×44 minimum.
- **Batch 4d — auth.**
  - Magic-link option is Later (AGENT.md §2). Verify password
    reset flow at minimum reads on-brand.
  - Onboarding skip path: if the operator wants to set up a
    festival later, is there an "Add later" escape on the
    onboarding/festival step?

### Part B — v2 visual changes

#### Status pill standardization

Find every status badge across forms, tables, detail pages.
Replace with the matching pill utility:

| Status                                        | Pill                                 |
| --------------------------------------------- | ------------------------------------ |
| confirmed / paid / signed / completed         | `pill-emerald`                       |
| option / pending / sent / scheduled           | `pill-amber`                         |
| not_available / withdrawn / overdue / no_show | `pill-coral`                         |
| in_air / landed / boarded                     | `pill-sky`                           |
| checked_in / checked_out                      | `pill-violet`                        |
| DJ guest / comp winner / free list / intl     | `pill-pink`                          |
| draft (contract)                              | `pill-amber`                         |
| live (set)                                    | `pill-amber` + `animate-coral-pulse` |
| done (set)                                    | `pill-emerald` opacity-70            |

Each pill base utility is in `globals.css` from Phase 1.

#### Table row hover · module-colored

```tsx
className =
  "hover:bg-[linear-gradient(90deg,var(--color-sky-glow),transparent_50%)]";
```

- `/flights` → sky
- `/hotels`, `/hotels/bookings` → violet
- `/ground` → amber
- `/payments`, `/payments/invoices` → amber
- `/guestlist` → pink
- `/artists`, `/lineup`, `/contracts`, `/riders`, `/crew`,
  `/documents` → emerald (default module)
- `/festival/*` → coral (live mode flavor)

#### Primary buttons

Page-level primary CTA → `btn-gradient-brand`. In-table icon
buttons stay flat (`bg-brand`).

#### "Parse with AI" button

```tsx
className="border border-[--color-sky] text-[--color-sky]
           hover:bg-[--color-sky-glow]"
```

#### Inputs · brand-glow focus ring

Touch `src/components/ui/input.tsx`. Apply to every `<input>` /
`<textarea>` / `<select>`:

```css
focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-glow)]
focus:border-[var(--color-brand)]
```

#### Empty states · radial backdrop

Where the blueprint motif exists (sign-in, 404, empty list
states), wrap with the radial-gradient backdrop pattern from
Phase 2.

#### Audit history collapsible

On any detail page (artist, flight, hotel-booking, pickup,
payment, contract), add a collapsible "History" panel:

```tsx
<details className="rounded-md border border-[--color-border] bg-[--color-surface] mt-4">
  <summary className="text-mono text-[10pt] uppercase tracking-[0.14em] text-[--color-fg-subtle] px-4 py-3 cursor-pointer">
    History
  </summary>
  <ul className="border-t border-[--color-border] divide-y divide-[--color-border]">
    {auditEvents.map((e) => (
      <li key={e.id} className="px-4 py-2 text-[12pt] flex justify-between">
        <span>
          {e.actorEmail} · {humanize(e.action)}
        </span>
        <span className="text-mono text-[--color-fg-subtle]">
          {fmt(e.createdAt)}
        </span>
      </li>
    ))}
  </ul>
</details>
```

This requires a small repo helper to fetch events for an entity
— already feasible with the existing `audit_events` table.

### Tests

- Existing route/component tests should pass.
- Each new in-scope audit fix gets its own unit test (bulk-mark-
  paid endpoint, filter-persistence helper, audit-history repo
  function, etc.).

### Acceptance

- Every status chip in the app uses `pill-*`.
- Each list page row hover wears its module color.
- Primary CTAs use `btn-gradient-brand`.
- Inputs show brand-glow focus.
- Audit-history visible on detail pages.
- All audit-driven follow-ups landed or filed.
- `npm run check` green.

### Commit

```
feat(design-v2-phase-4): forms, tables, pills, audit history wear v2

UX audit fixes:
- /payments: bulk-mark-paid action
- /flights, /hotels, /ground: filter persistence to URL query params
- Detail pages: audit-history collapsible
- /festival/*: pull-to-refresh

Visual:
- Status pills standardized
- Module-colored table hovers
- Primary CTAs → btn-gradient-brand
- Brand-glow focus rings
- Radial empty-state backdrops

npm run check: <paste output>
```

---

## Phase 4.5 — Mobile responsiveness (planning routes) — Days 7–9

**Goal:** make the planning side of the product survive on a phone.
Festival-day routes are already mobile-first (May 5 + May 19 TASKS.md
entries). The remaining gap is everything outside `/festival/*` —
sidebar, tables, filters, side sheets, lineup grid, forms.

**Why this slot:** mobile decisions depend on stable v2 colors,
spacing, and pill utilities (all landed by Phase 4). Doing it earlier
means redoing it.

### Breakpoints

We're on Tailwind v4 defaults:

- `sm` 640px — phones in landscape, small tablets
- `md` 768px — tablets portrait
- `lg` 1024px — small desktop / large tablet landscape
- `xl` 1280px — desktop
- `2xl` 1536px — wide desktop

**Mobile** = `< md` (under 768px). Below `md` we're on a phone.
**Tablet** = `md`–`lg`. **Desktop** = `lg`+.

The festival-day routes already render correctly at `390×844`. The
planning routes assume `lg+`. This phase changes that.

### Surfaces in scope (audit each)

```
src/components/dashboard/Sidebar.tsx
src/components/dashboard/Topbar.tsx
src/components/dashboard/FestivalSwitcher.tsx
src/components/ui/SideSheet.tsx
src/components/ui/AIParseDialog.tsx
src/app/(dashboard)/layout.tsx                          (responsive wrapper)
src/app/(dashboard)/home/page.tsx
src/app/(dashboard)/lineup/_components/LineupBoard.tsx
src/app/(dashboard)/lineup/_components/LineupPipeline.tsx
src/app/(dashboard)/lineup/_components/DayTabs.tsx
src/app/(dashboard)/artists/_components/ArtistsTable.tsx
src/app/(dashboard)/artists/_components/ArtistsFilters.tsx
src/app/(dashboard)/artists/[id]/_components/ArtistCockpit.tsx
src/app/(dashboard)/flights/_components/FlightsTable.tsx
src/app/(dashboard)/flights/_components/FlightsFilters.tsx
src/app/(dashboard)/hotels/_components/* + bookings/_components/*
src/app/(dashboard)/ground/_components/PickupsTable.tsx
src/app/(dashboard)/ground/_components/PickupsFilters.tsx
src/app/(dashboard)/payments/_components/*
src/app/(dashboard)/guestlist/_components/*
src/app/(dashboard)/riders/_components/RidersTable.tsx
src/app/(dashboard)/crew/_components/CrewTable.tsx
src/app/(dashboard)/crew/_components/CrewFilters.tsx
src/components/ui/input.tsx, button.tsx, label.tsx
```

A new shared primitive:

```
src/components/ui/DataList.tsx           NEW — table-or-cards renderer
src/components/ui/FilterSheet.tsx        NEW — slide-up bottom sheet
```

### Part A — UX audit (mobile-specific)

The shared template applies, but section D ("Mobile fitness") becomes
the entire audit for this phase. Specific things to test on every
surface:

- [ ] Width at 390×844 (iPhone 14 Pro). No horizontal scroll on
      `<body>`. Tables scroll-X **within a contained wrapper** only.
- [ ] Tap targets ≥ 44×44.
- [ ] Sticky elements (filter row, day tabs, table headers) don't
      double-up or eclipse content.
- [ ] Keyboard pop-up doesn't push fixed buttons off-screen.
- [ ] One-thumb reach: primary CTA in the bottom half or via a
      sticky action bar.
- [ ] iOS safe-area padding (`env(safe-area-inset-bottom)`) for any
      bottom-fixed bar.
- [ ] Pull-to-refresh: festival-day routes already polled; consider
      pull-to-refresh on `/payments`, `/home` for the use case of
      "I just paid the invoice, did it show up?"

### Part B — Mobile changes

#### `src/app/(dashboard)/layout.tsx` — responsive wrapper

The dashboard shell needs to know which mode it's in. Tailwind handles
most of it with `md:` prefixes; the sidebar needs runtime state for
the mobile drawer.

- Wrap everything in a flex container that becomes column-stack on
  mobile, row on desktop:
  ```tsx
  <div className="flex flex-col md:flex-row min-h-screen">
    <Sidebar ... />
    <main className="flex-1 min-w-0">{children}</main>
  </div>
  ```
- `min-w-0` is the critical prevent-horizontal-overflow fix.

#### `Sidebar.tsx` — bottom-nav on mobile

Two presentations:

**Desktop (`md+`):** the current 220px rail. No change.

**Mobile (`< md`):** transform into a bottom nav fixed to the
viewport bottom. Show 4 primary icons + an overflow "More" button
that opens a drawer with the rest. Planning mode primary = Home,
Lineup, Artists, More. Festival mode primary = Now, Pickups,
Arrivals, More.

```tsx
<aside
  className={cn(
    // Desktop rail
    "md:w-[220px] md:shrink-0 md:flex md:flex-col md:h-screen",
    "md:border-r md:border-[--color-border] md:bg-[--color-surface-1]",
    // Mobile bottom nav
    "fixed md:static bottom-0 left-0 right-0 z-50",
    "md:bottom-auto md:left-auto md:right-auto",
    "flex flex-row md:flex-col h-14 md:h-screen",
    "border-t md:border-t-0 md:border-r",
    "bg-[--color-surface-1] backdrop-blur",
    "pb-[env(safe-area-inset-bottom)] md:pb-0"
  )}
>
```

Items on mobile = icon + tiny label below (8pt mono); active state
= colored icon + brand-glow + 2px bar at top instead of left.

Active item active glow stays — `glow-brand` reads at icon size.

Main content needs bottom padding to avoid the nav: add
`pb-16 md:pb-0` to the `<main>` wrapper in `layout.tsx`.

#### `Topbar.tsx` — shrink on mobile

- Festival switcher collapses to icon + active name truncated.
- Drop the T-date chip on mobile (it's a hero on /home anyway).
- Live-strip stays full-width.

#### `SideSheet.tsx` — full-screen on mobile

Currently a right-aligned 480px panel. On mobile, transform to a
slide-up full-screen modal:

```tsx
<div
  className={cn(
    "fixed inset-0 md:inset-y-0 md:right-0 md:left-auto",
    "md:w-[480px]",
    "bg-[--color-surface-1] border-l border-[--color-border]",
    "animate-sidesheet-slide-mobile md:animate-sidesheet-slide"
  )}
>
```

Add a `sidesheet-slide-mobile` keyframe (slide up from bottom
instead of in from right). Add a close affordance at top-right (big
44×44 X button).

#### `DataList.tsx` — table-or-cards primitive

New shared component. Takes a list of rows + columns + render
functions and decides:

- `lg+` → render as a table (current behavior).
- `< lg` → render as stacked cards, one per row, with each column
  rendered as a labeled key-value pair.

API:

```tsx
<DataList
  data={artists}
  rowKey={(a) => a.id}
  href={(a) => `/artists/${a.id}` as Route}
  columns={[
    { key: "name", label: "Artist", cell: (a) => a.name },
    {
      key: "stage",
      label: "Stage",
      cell: (a) => <StagePill stage={a.set?.stage} />,
    },
    {
      key: "fee",
      label: "Fee",
      cell: (a) => <Money cents={a.set?.feeCents} currency={a.set?.currency} />,
      mono: true,
    },
    {
      key: "status",
      label: "Status",
      cell: (a) => <StatusPill status={a.status} />,
    },
  ]}
/>
```

Retrofit `ArtistsTable`, `FlightsTable`, `PickupsTable`,
`GuestlistTable`, `RidersTable`, `CrewTable`, `FlightsTable` to use
it. Each retrofit is mechanical — one PR per table, all under the
same Phase 4.5 banner.

#### `FilterSheet.tsx` — bottom-sheet on mobile

The current filter rows (`ArtistsFilters`, `FlightsFilters`,
`PickupsFilters`, `CrewFilters`) sit inline above the table on
desktop. On mobile, that wraps badly.

New primitive: a `<FilterSheet>` that renders inline on `md+` and as
a slide-up bottom sheet on `< md`, triggered by a "Filters" button
(with a count badge of active filters).

```tsx
<FilterSheet
  trigger="Filters"
  activeCount={activeFilterCount}
>
  <StageFilter ... />
  <StatusFilter ... />
  <DateFilter ... />
</FilterSheet>
```

Inline filter components don't need to change — they get composed
into the sheet on mobile.

#### `LineupBoard.tsx` — accordion on mobile

The 4-column grid breaks below `lg`. Change to:

- `lg+` → 4-column grid (current).
- `md`–`lg` → 2-column grid (Main + Alt above; Pool + Coll below).
- `< md` → single-column accordion. Each stage is a collapsible
  section. Default-open the stage that has a `live` set right now;
  otherwise default-open Main Stage. Use the `stage-wash` utility on
  the open section.

Drag-to-reorder doesn't survive on mobile. Provide the existing
"open slot dialog" path as the only mobile editor; show a small
hint at the top of the accordion: "Reorder slots on desktop."

#### `LineupPipeline.tsx` — horizontal scroll-snap

The 6-column kanban can't compress to mobile. Switch to a
horizontal scroll-snap on `< md`:

```tsx
<div className="flex md:grid md:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none">
  {columns.map((c) => (
    <div className="flex-shrink-0 w-[85vw] md:w-auto snap-start" key={c.status}>
      {/* column */}
    </div>
  ))}
</div>
```

Drag-across-columns disabled on mobile; the only mobile interaction
is opening a card detail. Add a small swipe-hint at first render
(localStorage flag so it doesn't repeat).

#### `ArtistCockpit.tsx` — single-column stack

Already mostly stacks; verify the 9-row roadsheet rail wraps to one
row per card on `< md` instead of trying to grid.

#### Forms — input sizing

Audit every form's inputs. Below `sm`:

- Input height ≥ 44px (Tailwind `h-11` or larger). Use
  `min-h-[44px]` on the base `<Input>` primitive.
- Labels stack above inputs (default RHF behavior — verify).
- Buttons stretch to full width: `w-full sm:w-auto`.
- The "Save / Cancel" footer becomes sticky at the bottom of the
  side-sheet on mobile.

#### Tap targets in tables

After `DataList` retrofit, each card on mobile is a full-row tap
target (existing pattern). Inside the card, status pills get a
larger hit-area (44×44 invisible tap area around the visible pill)
if the pill is clickable.

### Tests

- `tests/unit/datalist.test.tsx` — renders correctly at desktop and
  mobile widths (use `matchMedia` mock or pass an explicit
  `view="cards" | "table"` prop for testability).
- `tests/unit/filtersheet.test.tsx` — open/close state, active count.
- Existing table tests pass against the new `DataList` retrofit.

### Acceptance

- Every planning route renders correctly at 390×844 with no
  horizontal `<body>` scroll.
- Sidebar collapses to a bottom nav with safe-area padding.
- All tables retrofitted through `DataList`; mobile shows cards.
- All filter rows wrap into `FilterSheet`; mobile shows a slide-up.
- Lineup grid: accordion on mobile, 2-col on tablet, 4-col on
  desktop.
- LineupPipeline: scroll-snap on mobile.
- Side sheets full-screen on mobile.
- Form inputs ≥ 44px tap height.
- UX audit block in commit body.
- `npm run check` green.

### Commit

```
feat(design-v2-phase-4.5): mobile responsiveness on planning routes

UX audit fixes:
- [findings]

Visual / structural:
- Sidebar: bottom-nav on <md with safe-area padding
- DataList primitive: tables→cards on <lg
- FilterSheet primitive: inline on md+, bottom-sheet on <md
- SideSheet: slide-up full-screen on <md
- LineupBoard: accordion on <md, 2-col on md-lg, 4-col on lg+
- LineupPipeline: scroll-snap on <md
- Forms: ≥44px input heights below sm
- Topbar: T-date chip hidden on <md; festival switcher icon-only

npm run check: <paste output>
```

---

## Phase 5 — QA + polish + decisions log — Day 10

### Visual + UX QA checklist

Walk every route twice (planning mode off; festival mode on). For
each, verify both the v2 visual and the audit-driven UX fixes:

- [ ] `/home` — stats, severity bars, gap chips, T-minus hero,
      error.tsx, /artists?gaps=1 deep link.
- [ ] `/lineup?view=grid` — stage colors render from `stage.color`
      (test by changing a stage hex in Settings).
- [ ] `/lineup?view=pipeline` — colored pill columns; live pulse.
- [ ] `/artists` — gaps filter consumed; row hovers emerald.
- [ ] `/artists/[id]` — cockpit hero, module-colored rail, history
      collapsible.
- [ ] `/flights`, `/flights/[id]` — sky hovers; sky pills; filter
      persistence; AI-parse CTA sky; history collapsible.
- [ ] `/hotels`, `/hotels/bookings` — violet hovers; pills; history.
- [ ] `/ground` — amber hovers; status flip inline; history.
- [ ] `/payments`, `/payments/invoices` — bulk-mark-paid; overdue
      pulses coral; history.
- [ ] `/guestlist` — pink hovers; pills.
- [ ] `/riders`, `/contracts`, `/documents`, `/crew` — emerald
      hovers; pills.
- [ ] `/settings` — neutral; festival mode toggle visible; stage
      color picker still functions (test by setting `#00FF00` and
      verifying the column wears it).
- [ ] `/festival/now` — stage cards colored from `stage.color`;
      Newsreader names; overdue pulse; live strip; transitions
      cooperate.
- [ ] `/festival/pickups` — overdue coral; in-transit amber;
      pull-to-refresh on phone.
- [ ] `/festival/arrivals` — landed emerald; in-air sky.
- [ ] `/festival/issues` — severity bars; pull-to-refresh.
- [ ] `/festival/roadsheets/[artistId]` — section colors; PDF
      button ≥ 44×44.
- [ ] `/sign-in`, `/sign-up`, `/onboarding/*`, `/invite/[token]`
      — radial backdrop, CTAs gradient.
- [ ] `/share/press` — UNTOUCHED; verify still light-surface and
      on Aegis tenant brand.
- [ ] **Mobile 390×844 — every route**, planning + festival.
      Bottom nav, no horizontal scroll, tables→cards, filter
      sheets open and close, side sheets full-screen, lineup
      accordion, form buttons full-width, sticky footers respect
      safe-area-inset-bottom.
- [ ] **Tablet 768×1024** — sidebar back to rail, tables back to
      tables, filters back inline, lineup 2-col.
- [ ] **Desktop 1440×900** — full v2 visual unchanged from
      pre-mobile pass.

### Documentation

- Update `TASKS.md`: every v2 phase Now → Done with date and the
  audit findings.
- Update `docs/BRAND.md`: append decisions log if anything new
  came up.
- Verify `AGENT.md` §3 still matches the implemented palette.
- Delete or archive `design-study.html` once shipped (lives in git).

### Commit

```
chore(design-v2-phase-5): QA + docs sync
```

---

## Risks & mitigations

| Risk                                                          | Mitigation                                                                                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator sets a stage to a low-contrast hex (e.g., `#1F1F1F`) | `color-mix(... transparent)` collapses gracefully but stage name becomes unreadable. Add a contrast check in the stage form (warn-only); fallback color for text in `stage-text` falls to `fg-muted`. |
| Tailwind v4 doesn't compile `color-mix()` arbitrary value     | We use it inside `@utility` blocks, not arbitrary classes — should compile fine. If not, switch to inline-style fallback.                                                                             |
| Newsreader font not loaded on a server-rendered page          | Verified in `src/app/layout.tsx`. Confirm `var(--font-newsreader)` resolves before shipping each phase.                                                                                               |
| Stage-colored hover washes leak into row neighbors            | Use `linear-gradient(..., transparent 50%)` cap — never full-width tint.                                                                                                                              |
| Aegis export PDFs accidentally pick up v2 chrome              | Export templates source from `src/lib/branding/aegis-festival.ts`. Phase 1 didn't touch it.                                                                                                           |
| `animate-coral-pulse` flickers with many overdue rows         | Apply only to `severity === "high" && overdue` rows.                                                                                                                                                  |
| UX audit produces too many fixes to ship in one phase         | Triage in the audit block: in-scope (this commit) vs Later (file in `TASKS.md` Later). Don't balloon a phase.                                                                                         |

---

## Out of scope (do not do)

- Light mode. v2 stays dark.
- Marketing surface. `/share/press` stays on Aegis tenant brand.
- New dependencies (no framer-motion, no headlessui).
- Animation libraries beyond existing keyframes.
- Touching `tests/fixtures/`. Token swaps don't move data.
- Cmd+K agent (it's a Later item; the audit may discover keyboard
  shortcuts worth adding, ship those inline if cheap).

---

## Cross-references

- `AGENT.md` §3 — Brand & Design System
- `docs/BRAND.md` — palette, type, voice
- `TASKS.md` — v2 phases tracked under Now / Next / Later / Done
- `design-study.html` — visual design book
- `CLAUDE.md` — project rules
- `docs/OPERATIONS-FLOW.md` — state machines (audit history pulls from `audit_events`)
- `docs/FESTIVAL-DAY.md` — mobile-first requirements
