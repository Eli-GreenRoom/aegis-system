# GreenRoom Stages — Brand

> Design system for the GreenRoom Stages product. The app chrome is
> GreenRoom HQ for all operators, regardless of which festival they run.
> The Aegis Festival brand book is preserved below as tenant reference — it
> applies only to customer-facing exports (PDFs, itinerary links, contracts).

---

## Product brand: GreenRoom HQ

GreenRoom Stages is part of the GreenRoom HQ family. The palette, radius,
and voice below match `~/Desktop/greenroom` so both products read as one
family. Tokens are copied, not imported — if HQ changes a hex, update here
manually.

Tokens live in `src/styles/tokens.css`.

### Palette · v2 "Festival Console"

| Role              | Hex       | Token                              | Used for                                  |
| ----------------- | --------- | ---------------------------------- | ----------------------------------------- |
| Background        | `#0B0E16` | `--color-bg`                       | Page background (cooler than v1 #0A0A0B)  |
| Background subtle | `#131826` | `--color-bg-subtle`                | Sidebar, rail                             |
| Background muted  | `#181F30` | `--color-bg-muted`                 | Card, panel                               |
| Surface raised    | `#1E2740` | `--color-surface-raised`           | Hover, raised panel                       |
| Foreground        | `#F5F7FB` | `--color-fg`                       | Body text (cool white, not pure)          |
| Foreground muted  | `#A8B0C7` | `--color-fg-muted`                 | Secondary labels                          |
| Foreground subtle | `#6B7390` | `--color-fg-subtle`                | Captions, timestamps                      |
| Brand (emerald)   | `#34D399` | `--color-brand`                    | Primary CTA, success, paid, confirmed     |
| Brand fg          | `#062018` | `--color-brand-fg`                 | Text on brand-colored backgrounds         |
| Brand soft        | `#67F0C0` | `--color-brand-soft`               | Gradient pair for `btn-gradient-brand`    |
| Amber             | `#FFB546` | `--color-amber`                    | Warn, pending, Main Stage, money          |
| Coral             | `#FF6B7A` | `--color-coral` / `--color-danger` | Danger, overdue, withdrawn, live-pulse    |
| Sky               | `#7DB9FF` | `--color-sky` / `--color-info`     | Info, flights & travel, Alternative Stage |
| Violet            | `#B69CFF` | `--color-violet`                   | Hotels & lodging, Select Pool stage       |
| Pink              | `#FF9DD0` | `--color-pink`                     | Guestlist, Collectives stage              |

**Status mapping:** `success → brand (emerald)`, `warn → amber`,
`danger → coral`, `info → sky`. Hotels are violet; guestlist is pink.
Each accent is bound to product meaning — never decorative. Never use
generic Tailwind `red-500` / `green-500`.

**Surface tints (v2 new):** `tinted-emerald`, `tinted-amber`,
`tinted-coral`, `tinted-sky`, `tinted-violet`, `tinted-pink` — applied
to stat cards, hero cards, and any panel that should wear its module
color via a subtle top-down gradient.

**Stage washes (v2 new):** `wash-stage-main` (amber), `wash-stage-alt`
(sky), `wash-stage-pool` (violet), `wash-stage-coll` (pink). Applied
to lineup columns and Now-board stage cards.

**Glows:** `glow-brand`, `glow-amber`, `glow-coral`, `glow-sky`,
`glow-violet`, `glow-pink`. Used on active sidebar items, urgent rows,
and the festival-day live-strip.

**Live strip:** `live-strip` — a 2px gradient bar
(emerald → amber → coral) with a slow shimmer. Sits at the bottom of
the topbar when `festivalMode === true`. The visceral "we are live"
signal.

Full visual study and rationale: see `design-study.html` (open in
browser → Ctrl+P → Save as PDF). Phased rollout plan:
`DESIGN_V2_PLAN.md`.

### Typography

Three families, three jobs. Don't cross the streams.

**Geist Sans** — every label, button, nav item, body text, table cell, form input.

**Geist Mono** — every number, date, time, flight number, currency, ID,
confirmation code, booking number, set time, fee, count.

```tsx
<span style={{ fontFamily: "var(--font-mono)" }}>22:00</span>
// or
<span className="text-mono">TK826</span>
```

**Newsreader** — display only. Product wordmark. H1 of a major page. Roadsheet
PDF cover. Never on data. Never inside a card. Never on a button.

```tsx
<h1 className="text-display text-4xl">Lineup</h1>
```

### Layout

- **Radius:** `rounded-md` (8px). Only. Never `rounded-xl` / `rounded-2xl`.
- **Borders not shadows.** Hairline `border-[--color-border]` everywhere.
- **Density:** generous at the page level, tight inside tables and lists.
- **Tap targets:** >= 44x44 on mobile (festival-day mode is phone-driven).

### Blueprint motif

Dotted square-and-circle construction lines from the Aegis brand book. Use
sparingly: sign-in screen, empty states, 404. Never behind a data table.

### Voice

Direct. Imperative. No hedging. No emoji. No exclamation points.

| Don't                              | Do                          |
| ---------------------------------- | --------------------------- |
| "Welcome back!"                    | "GreenRoom Stages"          |
| "No flights yet, let's add some!"  | "No flights."               |
| "Awesome, payment marked as paid!" | "Paid."                     |
| "Oops! Something went wrong."      | "Couldn't save. Try again." |
| "Submit"                           | "Save"                      |

---

## Tenant brand: Aegis Festival

The Aegis Festival brand book (Hammerspace, Feb 2026) applies exclusively to
customer-facing exports — PDFs, roadsheet links, contracts, marketing collateral
the festival sends to artists and promoters. It does NOT appear in the app chrome.

Stash these values in `src/lib/branding/aegis-festival.ts` and pipe into export
templates only.

### Aegis palette (export templates only)

| Role                | Hex       | Notes                              |
| ------------------- | --------- | ---------------------------------- |
| Background (poster) | `#1B0E5C` | Deep indigo — marketing canvas     |
| Cream               | `#FAF3EC` | Inverse surfaces, print            |
| Gold                | `#E5B85A` | Primary accent, Main Stage chip    |
| Coral               | `#E73E54` | Tension, destructive               |
| Mint                | `#16D060` | Success, confirmed                 |
| Near-black          | `#0E0E10` | Was the ops background pre-rebrand |

### Stage colors are data

Stages are not enumerated in code. Each row in the `stages` table
carries its own `color` hex, editable from Settings → Festival →
Stages. A festival can have any number of stages, each with any hex.

The chrome reads `stage.color` at runtime via a `--stage-color` CSS
variable set inline; utilities (`stage-wash`, `stage-tint`,
`stage-pill`, `stage-glow`, `stage-text`, `stage-bar`) derive every
variant via `color-mix()`. See AGENT.md §3 "Stage colors — data, not
enum" for the pattern.

**Aegis Festival's default stage seeds** (used by the onboarding flow
when a new festival is created — operator can change them at any
time):

| Stage             | Default hex | Token                | Notes                 |
| ----------------- | ----------- | -------------------- | --------------------- |
| Main Stage        | `#FFB546`   | `--color-stage-main` | Warm gold, v2-aligned |
| Alternative Stage | `#7DB9FF`   | `--color-stage-alt`  | Cool sky              |
| Select Pool       | `#B69CFF`   | `--color-stage-pool` | Soft violet           |
| Collectives       | `#FF9DD0`   | `--color-stage-coll` | Warm pink             |

(v1 used `#E5B85A`, `#7C9EFF`, `#A78BFA`, `#F472B6` — see decisions
log for the May 21 alignment to v2.)

### Aegis brand essence (from the book)

- **Position:** "We are here to restore." Cultural confidence. Artistic risk.
  Lebanon as a land of opportunity.
- **Direction:** Timeless. Playful. Edgy. Dynamic. Unserious.
- **Visual language:** Deep indigo canvas. Cream highlights. Warm gold. Coral
  for tension. Mint for momentum. Classical serif headlines. Blueprint motifs.
- **Typography:** Newsreader serif display + Geist Sans body.
- **Voice:** Direct. Confident. Slightly sardonic. No marketing-speak.

Brand book pages worth re-reading for export design:

- p.1 cover — wordmark structure (square + circle)
- p.5 HOWEVER — coral on indigo, single-word tension
- p.8 Direction diagram
- p.30 wordmark — pixelated globe icon (festival mark, not product mark)
- p.70 OF THIS LAND posters — full color in marketing context

---

## Decisions log

- 2026-05-04 — Adopted Aegis brand-book palette as initial app tokens.
- 2026-05-05 — Switched app canvas from brand indigo to neutral dark.
- 2026-05-10 — Rebrand to GreenRoom Stages. App chrome now uses GreenRoom HQ
  emerald palette. Aegis Festival brand book demoted to tenant export identity.
  Tokens in `src/styles/tokens.css` updated to HQ palette (Phase C).
- 2026-05-21 — Design v2 "Festival Console". Six functional accents
  (emerald · amber · coral · sky · violet · pink), each bound to a
  product meaning. Canvas cooled from `#0A0A0B` to `#0B0E16` so
  accents pop. Stage colors elevated from "chip data" to wayfinding
  — lineup columns and Now-board stage cards wear their stage color
  as a top-down wash. Newsreader promoted from wordmark-only to
  hero-data carrier (set times, T-minus, payment totals render at
  28–64pt with optional gradient fill). New `live-strip` and `glow-*`
  utilities give festival-day a visceral signal it didn't have in v1.
  Token names preserved; the change is non-breaking on its own. Full
  rationale: `design-study.html`. Rollout: `DESIGN_V2_PLAN.md`.
