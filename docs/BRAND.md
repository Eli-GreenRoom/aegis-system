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

### Palette

| Role              | Hex       | Token               | Used for                           |
| ----------------- | --------- | ------------------- | ---------------------------------- |
| Background        | `#0A0A0B` | `--color-bg`        | Page background                    |
| Background subtle | `#111113` | `--color-bg-subtle` | Sidebar, rail                      |
| Background muted  | `#1A1A1D` | `--color-bg-muted`  | Card, panel                        |
| Foreground        | `#FAFAFA` | `--color-fg`        | Body text                          |
| Foreground muted  | `#A1A1AA` | `--color-fg-muted`  | Secondary labels                   |
| Foreground subtle | `#52525B` | `--color-fg-subtle` | Captions, timestamps               |
| Brand (emerald)   | `#34D399` | `--color-brand`     | Primary CTA, success, active state |
| Brand fg          | `#0A0A0B` | `--color-brand-fg`  | Text on brand-colored backgrounds  |
| Warn              | `#FBBF24` | `--color-warn`      | Warning state                      |
| Danger            | `#F87171` | `--color-danger`    | Destructive, urgent, overdue       |

**Status mapping:** `success -> brand`, `warning -> warn`, `danger -> danger`.
Never use generic Tailwind `red-500` / `green-500`.

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

### Stage chip colors

These are Aegis Festival tenant data and stay correct for this deployment:

| Stage             | Hex       | Token                |
| ----------------- | --------- | -------------------- |
| Main Stage        | `#E5B85A` | `--color-stage-main` |
| Alternative Stage | `#7C9EFF` | `--color-stage-alt`  |
| Select Pool       | `#A78BFA` | `--color-stage-pool` |
| Collectives       | `#F472B6` | `--color-stage-coll` |

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
