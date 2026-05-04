# Aegis System

Operations backend for **Aegis Festival**. Replaces the Google Sheets stack
used to run the festival in 2024 with a typed, multi-user web app — and adds
AI extraction so flight, hotel, rider, and invoice files become structured
rows in seconds.

**Live:** `https://logistics.aegisfestival.com` (once deployed)

---

## What it does

- **Lineup** — per-stage, per-day, per-slot, with status (confirmed / option / not_available)
- **Travel** — flights (per leg), ground transport pickups, vendors
- **Stay** — hotels, room blocks, per-person bookings
- **Money** — payments (paid / pending / overdue), invoices, proofs of payment
- **Documents** — contracts, riders (hospitality + technical), passports, visas, marketing assets
- **Guests** — guestlists by category and day
- **Festival-day mode** — denser, glanceable, mobile-first views during the event

---

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui ·
Drizzle ORM · Neon (Postgres) · better-auth · Anthropic SDK ·
Vercel Blob · Resend.

---

## Get started

1. Read [`AGENT.md`](./AGENT.md) — domain, conventions, brand rules
2. Read [`HANDOFF.md`](./HANDOFF.md) — phased build plan
3. Run [`SETUP.md`](./SETUP.md) — accounts, env, deploy

```bash
npm install
cp .env.example .env.local        # fill in values
npm run db:generate
npm run db:migrate
npm run dev
```

---

## Folder layout

```
aegis-system/
├── AGENT.md              # canonical brief for AI coding agents
├── HANDOFF.md            # phased build roadmap
├── SETUP.md              # one-time setup
├── README.md             # this file
├── docs/
│   ├── DATA-MODEL.md     # column-level schema spec
│   ├── FESTIVAL-DAY.md   # live-ops mode spec
│   ├── AI-FEATURES.md    # parsers + agent spec
│   └── DATA-IMPORT.md    # 2024 sheet → DB field map (TODO)
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # shadcn + feature components
│   ├── db/               # Drizzle client + schema + migrations runner
│   ├── lib/              # session, ai, utils
│   └── styles/           # tokens.css, globals.css
├── drizzle/              # generated migrations (committed)
├── public/
├── requests/             # .http files for every API route
├── scripts/              # one-off scripts (data import, seeders)
└── tests/                # vitest
```

---

## Conventions (TL;DR)

- Money in **cents** + currency on the row
- Dates in UTC; `Asia/Beirut` formatting in UI
- Mono font for all numbers / dates / flight numbers
- `rounded-md` only · brand `#E5B85A` only · no emoji
- Every protected API route: `getAppSession()` first, Zod-validate, then DB
- AI never writes to DB directly — operator-confirmed (Phase 6 agent excepted for
  explicit named writes)

---

## Source data being replaced

These spreadsheets are migrating into the app (see [`docs/DATA-IMPORT.md`](./docs/DATA-IMPORT.md)):

- `Aegis Logistics 2024.xlsx` — General, Flights, Ground Transportation, Payments, Pending Payments, BYBLOS TAXI, LuxCars, Aqua, Stage Managers, Volunteers, BSM
- `Aegis Festival Line Up 2024.xlsx` — Line-Up, Batches
- `AF2024 GUESTLIST.xlsx` — DJ Guests, Competition Winners, Free List, International Guests, Additional GA
- `Aegis Artist Hotel Options.xlsx` — Hotels + price/night + room blocks
- `Byblos Sur Mer.xlsx` — Per-artist bookings
- `Big Bang Emails.xlsx` — Email outreach (Phase 2)
