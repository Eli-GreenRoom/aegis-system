# Aegis System — Build Handoff

> Build plan for Cursor / coding agent. Phases are sized to ship something
> usable end of each phase. Don't skip ahead.

---

## North star

Replace the entire spreadsheet stack used to run Aegis Festival 2024 with a
typed, multi-user web app — and add AI extraction on top so flight/hotel/rider
emails turn into structured rows in seconds.

The product exists in two modes:

- **Planning mode** (most of the year) — CRUD, dense forms, bulk edits
- **Festival-day mode** (3 days a year) — read-heavy, glanceable, mobile (very important)

---

## Phase 0 — Setup (Day 0)

> Owner: Eli. Run once. See `SETUP.md` for the actual commands.

- [ ] GitHub repo `eli-aegis/aegis-system`, push initial scaffold
- [ ] Vercel project linked to repo, auto-deploy on `main`
- [ ] Custom domain `logistics.aegisfestival.com` (DNS → Vercel)
- [ ] Neon project `aegis-system`, region `eu-central-1`
- [ ] Vercel Blob store created, token in env
- [ ] Anthropic API key in env
- [ ] Resend account verified for `aegisfestival.com`
- [ ] Better-auth secret generated
- [ ] `.env.local` filled in, `.env.example` committed

**Acceptance:** `npm run dev` starts; landing page loads; `/api/health` returns `{ ok: true }`.

---

## Phase 1 — Foundation (Days 1–4)

Goal: a deployed shell with auth and the schema in place. No real features yet.

- [ ] Drizzle schema written for all core tables (see `docs/DATA-MODEL.md`)
- [ ] First migration generated + run on Neon
- [ ] better-auth wired up (email + password)
- [ ] Sign-in / sign-out working in prod
- [ ] Owner account seeded for `logistics@aegisfestival.com`
- [ ] Dashboard layout (left rail + top bar), empty pages for: Lineup, Artists,
      Crew, Flights, Hotels, Ground, Riders, Contracts, Payments, Guestlist,
      Documents, Settings
- [ ] Brand tokens applied — colors, fonts, radius — see `AGENT.md` §3
- [ ] `requests/auth.http` and `requests/health.http` committed

**Acceptance:** prod URL loads, you can sign in, dashboard shells render.

---

## Phase 2 — Core CRUD (Days 5–10)

Goal: every spreadsheet column has a home. Data can be entered and viewed.

- [ ] Artists CRUD + list page (filter by stage, status, agency)
- [ ] Crew CRUD (stage managers, volunteers, etc.)
- [ ] Stages + Slots + Sets (lineup builder)
  - Drag-to-reorder slots within a day on a stage
  - Status: confirmed / option / not_available
  - Batch metadata (Batch 1, Batch 2…)
- [ ] Flights CRUD — separate arrival + departure legs per person
- [ ] Hotels + Room Blocks + Hotel Bookings
- [ ] Ground Transport / Pickups (FK to Vendor)
- [ ] Payments (incl. pending) + Invoices + PoP file upload
- [ ] Riders — file upload (hosp + tech) per artist
- [ ] Contracts — file upload + status (draft / sent / signed)
- [ ] Guestlist — categorised (DJ guest / comp winner / free list / intl)
- [ ] Documents — generic blob archive (passports, visas, marketing assets)

**Acceptance:** Eli can manually re-create the 2024 festival in the app.

---

## Phase 3 — 2024 import + filters (Days 11–13)

- [ ] `scripts/import-2024.ts` parses uploaded `.xlsx` files and seeds DB
      (see `docs/DATA-IMPORT.md` for the field map)
- [ ] Filter by **stage** everywhere (lineup, flights, pickups, payments)
- [ ] Filter by **day** (Friday / Saturday / Sunday)
- [ ] Bulk-export each module to CSV (escape hatch + audit)
- [ ] Search across artists by name, email, agency, slug

**Acceptance:** open the app, see all 2024 lineup, flights, hotels, payments.

---

## Phase 4 — AI extraction (Days 14–18)

> The core differentiator. Eli forwards / uploads a file, AI fills the form.

- [ ] `POST /api/ai/parse-flight` — text or PDF in, structured JSON out
- [ ] `POST /api/ai/parse-hotel` — same pattern
- [ ] `POST /api/ai/parse-invoice`
- [ ] `POST /api/ai/parse-rider`
- [ ] Confirmation dialog UI — show extracted fields, let user fix, then commit
- [ ] Bulk import — drop a folder of confirmations, queue them, process serially
- [ ] Audit log — who triggered which parse, what was changed

**Acceptance:** drop a Wizz Air confirmation PDF → flight row appears in DB
with passenger linked, ready to commit with one click.

---

## Phase 5 — Festival-day mode (Days 19–22)

> Different UI, same data. Switch happens automatically when within
> `festival_start..festival_end`.

- [ ] `Now & Next` per stage
- [ ] `Pickups in next 2h` (Geist Mono times, vehicle + driver, big enough for phone)
- [ ] `Arrivals today` with status pills
- [ ] `Open issues` (unpaid, no contract, no rider, no pickup)
- [ ] One-tap roadsheet PDF (per artist day-of)
- [ ] Mobile layout — single column, sticky stage filter, large hit areas
- [ ] Polling every 30s OR server actions + revalidate

**Acceptance:** during Aegis 2026 dry-run, Eli runs the day from his phone
without opening a sheet.

---

## Phase 6 — AI agent + Cmd+K (Days 23–26)

Lift directly from greenroom's `CommandPalette.tsx` pattern.

- [ ] `POST /api/ai/agency` streaming SSE agentic loop
- [ ] Read tools: `get_artists`, `get_flights_today`, `get_unpaid`,
      `get_pickups_next_2h`, `get_riders_missing`
- [ ] Write tools: `create_pickup`, `mark_paid`, `update_set_status`
- [ ] Cmd+K palette overlay (Ctrl+K Win / Ctrl+/ fallback)
- [ ] Quick-prompt chips in empty state ("who lands tomorrow?", "unpaid total")

**Acceptance:** "schedule a 17:30 pickup for Hiroko from BSM to Main Stage" →
the agent creates it.

---

## Phase 7 — Polish & comms (Days 27–30)

- [ ] Roadsheet email — Resend, branded template, sent T-1 day per artist
- [ ] Public read-only portal for an artist (signed token URL — like greenroom's
      `pressKitToken`)
- [ ] Audit log surfaced in Settings
- [ ] Backups: nightly cron exports DB → Vercel Blob
- [ ] Light empty states + error pages on brand
- [ ] Final UX pass — sweep against `AGENT.md` §3 / §8

---

## Cross-cutting (do continuously)

- Keep `AGENT.md` and `DATA-MODEL.md` in sync as schema evolves
- Update `TASKS.md` after every shipped feature (Now → Done with date)
- Every PR: lint, typecheck, requests/ updated, screenshots in description

---

## Out of scope (for now — say no politely)

- Public ticketing (handled elsewhere)
- Public marketing site (handled elsewhere)
- Native mobile app (PWA is enough)
- Real-time multi-cursor editing (polling is fine)
- Multi-festival / multi-tenant (we're single-festival, multi-year)
- Gmail OAuth integration (we use upload, not inbox scraping — Eli's call)
