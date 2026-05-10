---
name: aegis-conventions
description: Brand, vocabulary, and code conventions for Aegis Festival operations system. Auto-load when editing any file in src/.
---

# Aegis Conventions

Auto-loaded for any work in `C:\Users\user\Desktop\aegis-system`.

## Brand

- Background: #0E0E10 (page), #15151A (surface), #1F1F25 (raised), #25252C (overlay).
- Brand gold #E5B85A — primary CTA / highlights / warning.
- Coral #E73E54 — destructive / overdue.
- Mint #16D060 — paid / confirmed.
- Cream #FAF3EC — print / export / light cards only.
- Borders: rgba(236,236,238,0.08) standard, 0.06 subtle, 0.18 strong.
- Border radius: rounded-md ONLY.
- Borders, not shadows.

## Stage colors (use sparingly — chips/badges/filters only)

- Main Stage: #E5B85A gold
- Alternative Stage: #7C9EFF blue
- Select Pool: #A78BFA violet
- Collectives: #F472B6 pink

## Typography

- Geist Sans — body, labels, buttons, nav, every form input.
- Geist Mono — numbers, dates, times, flight numbers, fees, IDs,
  confirmation codes. (`text-mono` utility.)
- Newsreader — DISPLAY ONLY. Wordmark + major-page H1. Never on data.

## Vocabulary

- artist (lineup acts), crew (stage managers, volunteers, vendors),
  edition (the year's festival), stage / slot / set, rider (hospitality
  - technical), flight (arrival + departure legs), hotel + room block +
    hotel booking, ground (pickups), guestlist (DJ guest / comp winner /
    free list / international).
- Festival-day live ops mode is "festival mode" — different read
  surface, denser, glanceable.

## Money

- Stored in cents. Always divide by 100 for display. No float math.

## Auth

- `getAppSession(req.headers)` — never with no args.
- Single-tenant (one festival org). `isOwner` and role-based checks
  per route via `requirePermission`.

## DB

- Migrations: `npm run db:generate && npm run db:migrate`. NEVER
  `db:push`.
- All list queries scope by `editionId` from `getCurrentEdition()`.
- Audit transitions go through `recordTransition()` in `src/lib/audit.ts`.

## Festival mode

- `isFestivalMode()` / `autoFestivalMode()` in `src/lib/festival-mode.ts`.
- Active on date range OR force-on flag (`festivalEditions.festivalModeActive`).
- Festival-mode routes: /festival/now, /pickups, /arrivals, /issues, /roadsheets.
- When changing a planning-mode route, verify festival mode still works.

## Testing

- Every API route ships with a `tests/unit/<feature>.test.ts`.
- Pattern: `tests/unit/contracts.test.ts` is the reference. Mock
  @/lib/session, @/lib/edition (getCurrentEdition), @/db/client,
  @/lib/audit, and any repo module.
- Cover happy / 401 / 400 minimum.
- Don't claim done until `npm run check` is green.
