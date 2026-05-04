# Aegis System — Agent Reference

> This file is the canonical brief for any AI coding agent (Cursor, Claude, Codex)
> working on this repo. Read it BEFORE writing any code. If something here conflicts
> with a casual chat instruction, this file wins until it is updated.

---

## 1. Project Overview

**Aegis System** is the operations backend for **Aegis Festival** — a multi-stage
electronic music festival in Lebanon (Aranoon Village, Batroun). It replaces a sprawl
of Google Sheets ("Aegis Logistics 2024", "Aegis Festival Line Up", "AF GUESTLIST",
"Byblos Sur Mer", "Big Bang Emails", "Aegis Artist Hotel Options") with a single
typed dashboard.

It handles the full artist + crew lifecycle for a festival run:

- Lineup management (per-stage, per-day, per-slot)
- Contract archiving
- Payments (invoices, proofs of payment, pending list)
- Flights (arrival + departure)
- Hotels (room blocks + per-artist bookings)
- Riders (hospitality + technical)
- Ground transportation (airport ↔ hotel ↔ stage)
- Visas
- Guestlists (DJ guests, competition winners, free list, international guests)
- Marketing assets archive
- **Festival-day live ops mode** — a different, denser view used during the event itself

**Owner / primary user:** Eli (logistics@aegisfestival.com)
**Live URL (target):** `https://logistics.aegisfestival.com` (Vercel)
**GitHub:** `eli-aegis/aegis-system` (or similar — confirm in `SETUP.md`)
**Neon project:** `aegis-system`, region `eu-central-1` (closest to Lebanon)

---

## 2. Stack — locked

This stack mirrors the sister project `greenroom` (on Eli's desktop) deliberately,
so patterns can be lifted across.

- **Next.js 16** App Router, React 19, TypeScript **strict**
- **Tailwind v4** + **shadcn/ui** (no hand-rolled UI primitives)
- **Drizzle ORM** + **Neon** (Postgres, serverless driver)
- **better-auth** for auth (email + password, magic link optional later)
- **Vercel Blob** for file archiving (private store, served via proxy routes)
- **Anthropic SDK** (`claude-sonnet-4-6`) for AI features
- **Resend** for transactional email
- `react-hook-form` + `zod` for forms; `date-fns` for dates
- `react-big-calendar` for festival-day timetable view
- `lucide-react` for icons

**Do not introduce new dependencies without asking.**

---

## 3. Brand & Design System

This is a festival ops tool, aligned to the Aegis brand book (Hammerspace,
Feb 2026). Brand-aligned but restrained — the brand book is for the
festival's outward face; this app is the back office. Operator-grade density.
No marketing flourish.

Full rationale: `docs/BRAND.md`. Tokens: `src/styles/tokens.css`.

### Palette

- **Background (page):** `#150A48` (deep indigo). The brand canvas, slightly
  deeper than the brand book's hero indigo for screen comfort.
- **Surface:** `#1D1158`  **Surface raised:** `#271968`  **Overlay:** `#2F2078`
- **Brand accent (gold):** `#E5B85A` — primary call-to-action, highlights,
  warning state. Aliases `text-brand`, `bg-brand`, `border-brand`.
- **Coral:** `#E73E54` — destructive / urgent / overdue. Alias `text-coral`.
- **Mint:** `#16D060` — success / paid / confirmed. Alias `text-mint`.
- **Cream:** `#FAF3EC` — inverse surfaces (print, exports, light cards only).
  Aliases `bg-cream`, `text-cream`.
- **Text:** `#F3EDF9` (high contrast), `#B0A8D4` muted, `#7A72A3` subtle.
- **Borders:** `rgba(243,237,249,0.10)` standard, `0.06` subtle, `0.18` strong.

**Status mapping:** `success → mint`, `warning → gold`, `danger → coral`.
Don't use generic Tailwind `red-500` / `green-500`.

### Stage colors (use sparingly — only on stage chips/badges/filters)

- Main Stage: `#E5B85A` (gold) — `var(--color-stage-main)`
- Alternative Stage: `#7C9EFF` (blue) — `var(--color-stage-alt)`
- Select Pool: `#A78BFA` (violet) — `var(--color-stage-pool)`
- Collectives: `#F472B6` (pink) — `var(--color-stage-coll)`

### Typography

- **Geist Sans** — body, labels, buttons, nav, every form input.
- **Geist Mono** — every number, date, time, flight number, fee, ID,
  confirmation code. Apply with `text-mono` utility or
  `style={{ fontFamily: "var(--font-mono)" }}`.
- **Newsreader (Google Fonts)** — DISPLAY ONLY. The product wordmark and the
  H1 of major pages. Never inside cards, never on buttons, never on data.
  Apply with `text-display` utility.

### Layout & shape

- **Border radius:** `rounded-md` (8px) ONLY. Never `rounded-xl` / `rounded-2xl`.
- **Borders not shadows** — flat surfaces, hairline borders.
- **Density** — generous whitespace at the page level (the brand book uses a
  lot of empty space), tight inside data tables.
- **Blueprint motif** (dotted construction lines, square + circle from the
  cover) — use sparingly: empty states, auth screens, the 404 page only.
  Never as ambient decoration on data pages.

### Don'ts

- No emoji. No exclamation points. No marketing copy.
- No cyan, no neon green, no brand colors not in the palette above.
- No serif on data, buttons, body, or anything inside a card.
- No `rounded-xl` or larger.
- Don't refer to artists as "users" — see §4.

### Operator vocabulary

artist, crew, set, slot, stage, lineup, advance, rider, roadsheet, PoP (proof
of payment), guestlist, leg (of a flight), pickup, dropoff, room block,
edition, batch.

---

## 4. Domain Vocabulary (READ THIS BEFORE NAMING ANYTHING)

| Term           | Means                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Artist**     | Anyone performing — solo DJ, B2B, live act                               |
| **Crew**       | Stage managers, photographers, volunteers, sound, ops                    |
| **Person**     | Either Artist or Crew (used for flights/hotels/ground)                   |
| **Stage**      | One of: Main Stage, Alternative Stage, Select Pool, Collectives          |
| **Slot**       | A time block on a stage on a day (e.g. Friday 22:00–00:00 Main Stage)    |
| **Set**        | A specific artist's performance in a slot                                |
| **Leg**        | One flight segment (arrival = inbound leg, departure = outbound leg)     |
| **Booking**    | A hotel room booked for a specific person + date range                   |
| **Room Block** | A reserved set of rooms at a hotel (e.g. 20 rooms at Byblos Sur Mer)     |
| **Pickup**     | A ground transport job moving a person from A to B                       |
| **Rider**      | A document — hospitality (hosp) or technical (tech) — uploaded as a file |
| **PoP**        | Proof of payment (a receipt, screenshot, bank confirmation)              |
| **Roadsheet**  | The single-sheet day-of-festival itinerary for one artist                |
| **Day**        | Friday / Saturday / Sunday of the festival weekend                       |

**Do NOT** call artists "users". The user is the operator (Eli + team), not the
performers.

---

## 5. Data Model — high level

Full schema lives in `src/db/schema.ts`. Big picture:

```
people  (artists ∪ crew, polymorphic via `kind`)
  ├── flights (person → leg → flight_number, datetime, airport)
  ├── ground_transport (person → pickup, route, vehicle, vendor, cost)
  ├── hotel_bookings (person → hotel, room_type, checkin/out)
  ├── visas
  └── documents (passports, contracts, riders, etc.)

artists
  ├── sets (artist → stage + slot)
  ├── contracts (status, signed_at, file_url)
  ├── riders (hosp + tech files)
  ├── payments (due_date, amount, currency, paid_at, pop_url)
  └── invoices

stages → slots → sets

hotels → room_blocks → hotel_bookings

guestlist_entries (artist | crew | external) → categorised (DJ guest / comp winner / free list / intl)

vendors (taxi companies, car services)
documents (Vercel Blob proxy — every uploaded file)
emails (parsed inbound communications, Phase 2)
```

See `docs/DATA-MODEL.md` for column-level spec.

---

## 6. AI Features

The user uploads documents (flight confirmations, hotel emails, riders, contracts,
invoices). AI parses them and pre-fills forms — operator confirms before write.

### Endpoint pattern

`POST /api/ai/parse-flight` → accepts file or text → returns structured JSON →
operator reviews in a confirmation dialog → POST to `/api/flights` to commit.

### Tools / parsers (Phase 1)

- `parse_flight_confirmation` — extracts `{passenger_name, flight_number, from, to, depart_dt, arrive_dt, pnr, airline}`
- `parse_hotel_confirmation` — extracts `{guest, hotel, room_type, checkin, checkout, booking_number}`
- `parse_rider` — extracts `{artist, hospitality_items, technical_items}`
- `parse_invoice` — extracts `{vendor, amount, currency, due_date, line_items}`

### Tools (Phase 2)

- Cmd+K agentic chat — read tools (`get_artists`, `get_flights_today`,
  `get_unpaid`, `get_pickups_next_2h`) + write tools (`create_pickup`, `mark_paid`)
- Smart scheduling — given lineup + flight ETAs, suggest pickup times with buffer

### Conventions

- All AI calls go through `src/lib/ai/`. Never import `@anthropic-ai/sdk` from a
  React component.
- Always return structured JSON, validated with Zod at the route handler.
- Always show parsed result for confirmation before writing to DB.
- Stream responses where the UX benefits (chat, long parsing); otherwise plain JSON.

---

## 7. Festival-Day Mode

Most of the year the app is in **planning mode** — CRUD-heavy, dense forms.
During festival weekend it switches to **live mode** — read-heavy, glanceable,
mobile-friendly.

Trigger: a `festival_mode` flag in `agency_settings` plus the system date being
within `festival_start..festival_end`.

Live mode dashboards (per stage filter):

1. **Now & Next** — current set + next set per stage, set times in Geist Mono, big
2. **Pickups in next 2h** — flight or hotel → stage, with vehicle + driver + ETA
3. **Arrivals today** — flights landing today, with status (landed / in transit / at hotel)
4. **Open issues** — anything missing: unpaid, no contract, no rider, no pickup
5. **Roadsheets** — one-tap PDF of any artist's day-of itinerary

Festival-day views must:

- Work on phone (Eli will be walking around)
- Update without manual refresh (server actions + revalidate, or polling 30s)
- Show critical state in 1 glance — color stripes, no charts

See `docs/FESTIVAL-DAY.md` for screen specs.

---

## 8. Conventions (carry over from greenroom)

- Money stored in **cents** (`amountCents: integer`), displayed `/ 100`
- Currencies: `USD` and `EUR` (festival deals split). Store on the row.
- Dates as `timestamp`. Format on client with `date-fns`.
- All numbers/dates in UI use mono: `style={{ fontFamily: "var(--font-geist-mono)" }}`
- Dashboard pages must NOT add `min-h-screen` or `bg-background` wrappers
- Vercel Blob store is **private** — always `access: "private"` on uploads;
  serve via `/api/documents/[id]` proxy route that checks auth.
- DB migrations: `npm run db:generate && npm run db:migrate`. **Never** `db:push`.
- AVOID em-dashes and box-drawing chars in `.ts` files (esbuild chokes on
  non-ASCII bytes). They're safe in `.tsx`.
- Every API route under `src/app/api/<slug>/route.ts`. Every POST/PATCH validated
  with Zod; on failure return 400 + `flatten()`.
- Auth check first in every protected route.
- DB access only through `src/db/client.ts`. No raw SQL in route files.
- Components colocated by feature in `src/components/<feature>/`.

### File-write safety

Write/Edit tools sometimes truncate large files mid-content. For files > ~80
lines, use Python heredoc or bash heredoc with quoted ENDOFFILE marker. After
any write, verify with `tail -10`. Never use `printf >>` to append.

---

## 9. Auth & Permissions

- `getAppSession()` in `src/lib/session.ts` — use in every protected API route.
  Returns `{ user, ownerId, isOwner, role, permissions }`.
- Single tenant for now — `ownerId` is Eli's user id; team members share it.
- Roles (initial): `owner`, `coordinator`, `viewer`.
  - `owner` — everything
  - `coordinator` — full CRUD except settings + payments
  - `viewer` — read-only, used for stage managers / external collaborators
- Permissions stored on `team_members.permissions` JSONB; role gives defaults,
  per-key overrides allowed.
- Festival-day live views are accessible to `coordinator` and above.

---

## 10. Sources of truth (sheets being replaced)

These were uploaded by Eli on session start. The schema must accommodate every
column from these files. Sheet → table mapping:

| Sheet                                                       | Tables that absorb it                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `Aegis Logistics 2024 / General`                            | `sets` (timetable + stage + status flags)                     |
| `Aegis Logistics 2024 / Flights`                            | `flights` (split arrival vs departure into 2 rows per person) |
| `Aegis Logistics 2024 / Ground Transportation`              | `pickups`                                                     |
| `Aegis Logistics 2024 / payments`                           | `payments`                                                    |
| `Aegis Logistics 2024 / pending payments`                   | `payments` (status='pending')                                 |
| `Aegis Logistics 2024 / BYBLOS TAXI / LuxCars / Aqua / BSM` | `vendors` + per-pickup vendor FK                              |
| `Aegis Logistics 2024 / Stage Managers / Volunteers`        | `crew`                                                        |
| `Aegis Festival Line Up 2024 / Line-Up`                     | `sets` (with status: confirmed / option / not_available)      |
| `Aegis Festival Line Up 2024 / Batch 1..N`                  | `sets` (announce batch metadata on `sets`)                    |
| `AF2024 GUESTLIST` (multiple sheets)                        | `guestlist_entries` (category enum)                           |
| `Aegis Artist Hotel Options`                                | `hotels` + `room_blocks`                                      |
| `Byblos Sur Mer`                                            | `hotel_bookings`                                              |
| `Big Bang Emails`                                           | `email_threads` (Phase 2)                                     |

A migration script in `scripts/import-2024.ts` should backfill the 2024 data so
the system starts populated. Spec lives in `docs/DATA-IMPORT.md`.

---

## 11. Definition of done (per feature)

- TypeScript clean — `npx tsc --noEmit` passes
- Lint clean — `npm run lint` passes
- Zod validation on every POST/PATCH input
- Auth check on every protected route
- A `requests/<feature>.http` with success + failure cases
- A Vitest unit test for any non-trivial handler (`tests/unit/`)
- Updated `TASKS.md` (move from Now → Done with date)
- Commit message format: `feat(slug): ...` / `fix(slug): ...` / `chore: ...`

---

## 12. Don't

- Don't commit secrets or `.env*` files (except `.env.example`).
- Don't skip Zod validation.
- Don't skip auth on protected routes.
- Don't call AI SDKs from React components.
- Don't add new dependencies without asking.
- Don't use cyan, neon green, or any color outside the brand palette.
- Don't refer to artists as "users".
- Don't generate large files in one shot via Write — chunk it.

---

## 13. When in doubt

1. Read the relevant doc in `/docs` first.
2. Check `greenroom` (sister project) for the same pattern — copy with adaptation.
3. Ask Eli before introducing a new pattern, dependency, or table.
