# Brand — Aegis System

> Translation of the Aegis brand book (Hammerspace, Feb 2026) into the
> operator dashboard. Reference for any UI decision. Source of truth for
> tokens lives in `src/styles/tokens.css`.

---

## Brand essence (from the book)

- **Position:** "We are here to restore." Not a rebrand — a correction in the
  cultural trajectory. Cultural confidence. Artistic risk. Innovation.
  Lebanon as a land of opportunity.
- **Direction:** Timeless · Playful · Edgy · Dynamic · Unserious.
- **Visual language:** Deep indigo canvas. Cream highlights. Warm gold for
  attention. Coral for tension. Mint for momentum. Classical serif headlines
  on clean sans body. Generous empty space. Blueprint construction motifs
  (dotted square + circle, dotted glass).
- **Voice:** Direct. Confident. Slightly sardonic. No marketing-speak.

---

## What translates to the ops app, and what doesn't

The brand book is for festival-goers, sponsors, press. The ops app is for
Eli and the logistics team — at 3am during festival weekend, on a phone, in a
field, holding a coffee. So:

| Brand book | Ops app |
|---|---|
| Big serif display headlines | Serif only on wordmark + page H1 |
| Dotted blueprint backgrounds | Empty states / auth / 404 only |
| Cream-on-indigo poster art | Cream is for print/export inverse only |
| Sentence-as-art ("HOWEVER") | Don't. Plain operator labels. |
| Cinematic empty space | Generous page-level, tight inside tables |
| All-caps tension words | No. Sentence case. |

The point: the dashboard *feels* like Aegis at a glance — deep indigo, warm
gold accent, classical wordmark — but the second you start working, it gets
out of your way.

---

## Palette (locked)

| Role | Hex | Token | Used for |
|---|---|---|---|
| Background | `#150A48` | `--color-bg` | Page background. Slightly deeper than brand-book indigo for screen comfort. |
| Brand indigo | `#1B0E5C` | `--color-brand-indigo` | The book's hero indigo — exports, hero headers if needed |
| Surface | `#1D1158` | `--color-surface` | Card, panel |
| Surface raised | `#271968` | `--color-surface-raised` | Popover, dropdown, selected row |
| Overlay | `#2F2078` | `--color-surface-overlay` | Modal, dialog scrim base |
| Cream | `#FAF3EC` | `--color-brand-cream` | Inverse surfaces — print, PDF, exports |
| Gold | `#E5B85A` | `--color-brand` | Primary CTA, highlights, warning state, Main Stage chip |
| Coral | `#E73E54` | `--color-brand-coral` | Destructive, urgent, overdue, danger |
| Mint | `#16D060` | `--color-brand-mint` | Success, paid, confirmed, landed |
| Text | `#F3EDF9` | `--color-fg` | Body |
| Text muted | `#B0A8D4` | `--color-fg-muted` | Secondary labels |
| Text subtle | `#7A72A3` | `--color-fg-subtle` | Captions, timestamps in lists |

**Stage chips** (use only on the stage badge/filter):

| Stage | Hex | Token |
|---|---|---|
| Main Stage | `#E5B85A` | `--color-stage-main` |
| Alternative Stage | `#7C9EFF` | `--color-stage-alt` |
| Select Pool | `#A78BFA` | `--color-stage-pool` |
| Collectives | `#F472B6` | `--color-stage-coll` |

---

## Typography

Three families, three jobs. Don't cross the streams.

### Geist Sans — workhorse

Every label, button, nav item, body text, table cell, form input.

### Geist Mono — data

Every number, date, time, flight number, currency, ID, confirmation code,
booking number, set time, fee, count.

```tsx
<span style={{ fontFamily: "var(--font-mono)" }}>22:00</span>
// or
<span className="text-mono">TK826</span>
```

This isn't decoration — operators read this stuff at speed and the tabular
figures (`tnum`) keep columns aligned.

### Newsreader — display, sparingly

The product wordmark. The H1 of a major page (Lineup, Settings, Login).
Roadsheet PDF cover. **That's it.** Never on data. Never inside a card.
Never on a button.

```tsx
<h1 className="text-display text-4xl">Lineup</h1>
```

Why Newsreader: free Google font, classical serif feel matching the brand
book without going overboard. If you ever need to swap, the alternates are
Cormorant Garamond, Newsreader (current), or Tiempos (paid).

---

## Layout

- **Radius:** `rounded-md` (8px). Only. Never `rounded-xl` / `rounded-2xl`.
- **Borders not shadows.** Hairline `border-[--color-border]` everywhere.
  Avoid box-shadow except on overlays.
- **Density:** generous at the page level (the brand book lives on whitespace).
  Tight inside tables and lists — operators want to see a lot at once.
- **Tap targets:** ≥ 44×44 on mobile (festival-day mode is phone-driven).

---

## Blueprint motif

The dotted square-and-circle / dotted glass construction lines are the brand's
visual signature. Use them in the app sparingly:

- Sign-in / sign-up screens — fades into the background corner
- Empty states — "no flights yet" gets a small dotted glass icon
- 404 page
- Roadsheet PDF cover
- Festival countdown panel (if we build one)

**Never** behind a data table. **Never** on the dashboard home as ambient
decoration. The dashboard is for working, not gazing.

---

## Voice & UX copy

From the brand book: direct, confident, slightly sardonic, no marketing-speak.

Examples:

| Don't | Do |
|---|---|
| "Welcome back!" | "Aegis System" |
| "No flights yet — let's add some!" | "No flights." |
| "Awesome, payment marked as paid!" | "Paid." |
| "Oops! Something went wrong." | "Couldn't save. Try again." |
| "Manage your artists" | "Artists" |
| "Submit" | "Save" |

Sentence case for buttons and labels. No exclamation points. No emoji.

---

## Brand book references

Pages worth re-reading when in doubt:

- **p.1 cover** — wordmark structure (square + circle), Hammerspace credit
- **p.3 The Context** — "restore teeth to culture" (positioning)
- **p.5 HOWEVER** — coral on indigo, single-word tension
- **p.6 EVERYONE IS DOING THIS** — serif display + sans body composition
- **p.8 Direction** — Timeless / Playful / Edgy / Dynamic / Unserious diagram
- **p.30 wordmark** — pixelated globe icon (festival mark, not app mark)
- **p.70 OF THIS LAND posters** — full color use in marketing context

---

## Decisions log (for this app, not the brand)

- 2026-05-04 — Adopted brand-book palette as app tokens. Ops dashboard
  inherits the look but stays operator-dense. Serif used for wordmark + page
  H1 only.
- 2026-05-04 — `success → mint`, `warning → gold`, `danger → coral`. Generic
  Tailwind `red-500` / `green-500` are forbidden.
- 2026-05-04 — `Newsreader` from Google Fonts as the display family. Free,
  reasonable match to brand-book serif.
