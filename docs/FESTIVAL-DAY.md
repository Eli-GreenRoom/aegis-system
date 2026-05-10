# GreenRoom Stages — Festival-Day Mode Spec

> What the app turns into during festival weekend. Three days a year, but
> they're the days that matter most. Phone-driven, glanceable, one-tap.
>
> Read `docs/OPERATIONS-FLOW.md` first — that's the canonical reference for
> state machines and the one-tap UX. This doc covers the screens themselves.

Triggered automatically when system date is within
`festival_editions.start_date..end_date` AND `festival_mode_active = true`.
Manual override available in Settings (Auto / Force on / Force off).

---

## Posture shift

Outside festival days:

- Desktop-first
- Dense forms, lots of CRUD
- Lineup, contracts, payments are the busy modules

During festival days:

- **Phone-first** — Eli walks around the site
- **Read-heavy** — almost no typing
- **Glanceable** — every screen is a status board
- **Stage-filtered** — top-level filter chip, sticky on scroll
- **One-tap state advance** — every actionable row has a single primary
  button. See `docs/OPERATIONS-FLOW.md` §5 for the full mechanics.

---

## Top-level switcher

When in festival mode, the dashboard sidebar collapses to 5 items:

1. **Now** — live ops (default)
2. **Pickups** — full ground transport list, today
3. **Arrivals** — flight tracker, today
4. **Issues** — open problems (severity-sorted)
5. **Roadsheets** — search any artist, get their day-of sheet

Planning modules stay accessible under "Planning" submenu.

---

## Stage filter (sticky)

Always visible at the top of the page:

```
[ ALL ]  [ Main ]  [ Alt ]  [ Select ]  [ Coll ]
```

Tapping a chip filters every list on the page. Selection persists in
`localStorage`.

---

## Screen 1 — Now (cards, not tables, on phone)

One card per artist with activity today. Collapsed by default if nothing's
imminent (set in > 6h, no flight today). One **primary button** advances
whatever state is most actionable for this artist:

```
┌──────────────────────────────────────┐
│ HIROKO YAMAMURA          MAIN STAGE  │
│ Saturday · 23:00–01:00 · confirmed   │
│ ──────────────────────────────────── │
│ Now    BSM, room 305                 │
│ Next   Pickup BSM → Main · 22:00     │
│        Sami / LuxCars / 70 xxx xxx   │
│ ──────────────────────────────────── │
│        [        Dispatch        ]    │
│                                      │
│ Today                                │
│ • 09:42 landed BEY                   │
│ • 10:35 picked up by Sami            │
│ • 11:18 checked in BSM 305           │
│ • 22:00 pickup BSM → Main (next)     │
│ • 23:00 set Main Stage               │
│ • 01:30 pickup Main → BSM            │
└──────────────────────────────────────┘
```

The primary button label and target action come from
`getNextActionableTransition(artistId, now())`. Long-press on the button
opens the full status menu (back, cancel, edit time, etc).

Coral pulse on the card if anything is overdue. Mint stripe along the left
when the artist is fully on track.

The same data also renders as a desktop table for ops at the venue.

---

## Screen 2 — Pickups (next 2h emphasised)

```
NEXT 2H
17:30  AIRPORT → BSM    Hiroko Yamamura     LuxCars · Sami · +961 70…  [ Dispatch ]
18:15  BSM → MAIN       Frankey & Sandrino  BYBLOS TAXI · Van · +961 71…  [ Dispatch ]

LATER TODAY
21:00  HOTEL → STAGE    Seth Troxler        LuxCars · Sedan · +961 70…
```

Status colour stripe on the left edge: gold = scheduled, blue = dispatched,
mint-blue = in_transit, mint = completed.

**One primary button per row**, advancing the state:

| Current status | Button                                     |
| -------------- | ------------------------------------------ |
| `scheduled`    | `Dispatch` (sets `dispatched_at = now()`)  |
| `dispatched`   | `Picked up` (sets `in_transit_at = now()`) |
| `in_transit`   | `Delivered` (sets `completed_at = now()`)  |
| `completed`    | (no button — long-press to revise)         |

Tap driver phone → `tel:` link. No form, ever.

If a linked flight is delayed, a coral pill on the row offers
`Shift +30m` / `Shift +1h` shortcuts.

---

## Screen 3 — Arrivals

A flight tracker. Shows `inbound` flights with `scheduled_dt::date = today`.

```
TK826      Istanbul → BEY      20:45    SCHEDULED   Hiroko Yamamura      [ Boarded ]
FZ157      Dubai → BEY         10:05    IN AIR      Alex James           [ Landed ]
LH1234     Frankfurt → BEY     14:20    DELAYED+45  Frankey + Sandrino   [ In air ]
```

Status pills with colours: scheduled (grey), boarded (gold), in_air (blue),
landed (mint), delayed (coral), cancelled (subdued coral).

Primary button advances state forward. Long-press for `Mark delayed` /
`Mark cancelled` / `Edit ETA`.

If a flight is `landed` and there's a linked pickup still `scheduled`,
the pickup row glows coral. One tap on the flight row's "Show pickup"
chevron jumps you to it.

Pull-to-refresh; auto-poll every 30s.

---

## Screen 4 — Issues

Anything missing or blocking. Severity-sorted (high → medium → low),
chronologically within severity. Backed by `getOpenIssues(editionId, scope)`
in `src/lib/aggregators/`. Detection rules listed in
`docs/OPERATIONS-FLOW.md` §4.

```
HIGH    Pickup overdue       Hiroko · airport→hotel · 35min late
HIGH    No pickup            Alex James lands 10:05, no airport pickup
HIGH    Unpaid               Seth Troxler · plays today · $3,000 due
MED     No rider             Frankey + Sandrino · set tomorrow
LOW     Invite not sent      DJ guest list · Hiroko +2
```

Each row is one-tap to the fix screen.

---

## Screen 5 — Roadsheets

Search field at top. Each result row → tap to open the artist's roadsheet.

A roadsheet is a single-page PDF (also viewable as a styled web page) showing:

- Artist name + photo + nationality
- Contact: agent, phone, email
- Set: stage, day, slot, status
- Inbound flight: airline, number, time, airport
- Hotel: name, room, checkin/out, booking number
- Pickups (chronologically): flight→hotel, hotel→stage, stage→hotel,
  hotel→airport
- Outbound flight: airline, number, time, airport
- Payment status
- Rider notes (1-line summary from AI)
- Emergency contact

Print-friendly CSS so it looks the same on screen and on paper. Geist Mono
for all dates/times/numbers. Backed by `getArtistRoadsheet(artistId, day)`
in `src/lib/aggregators/`.

---

## Mobile patterns (non-negotiable)

- Stack everything vertically below `md` breakpoint
- Stage filter chips become a horizontal scroll strip
- Tappable areas: minimum 44×44 px
- Sticky bottom action bar for the primary action when one obviously applies
- Swipe down to refresh
- Offline-tolerant reads: last fetched data shown with a "stale at HH:MM"
  pill if the connection drops. Writes queue locally for ≤ 5 minutes; if
  the connection restores, they replay; otherwise fail with a coral toast.
- No hover-only affordances. Long-press is the mobile equivalent.

---

## Data refresh

- 30s polling on `Now`, `Pickups`, `Arrivals`
- Manual pull-to-refresh always available
- Server actions for write — full route revalidate on success
- No realtime websockets in v1 (overkill for 3 days a year)

---

## Audit on every transition

Every state advance writes an `audit_events` row in the same DB transaction
as the update. Wrapped via `recordTransition(actorId, entity, before, after)`
from `src/lib/audit.ts`. Disputes ("the driver said they arrived at 5pm,
dashboard says 6pm") need this paper trail.

A **History** tab on every detail page shows the audit trail in mono.

---

## Permissions during festival

- `owner` — everything
- `coordinator` — can transition flights / pickups / hotels / sets. Cannot
  edit fees or payments. Cannot edit team or settings.
- `viewer` — sees Now / Pickups / Arrivals / Roadsheets, no writes
- Stage manager users get role `viewer` + (Phase 5 stretch) an
  `artist_scope` filter so they only see their own stage

Permissions are checked in the server action, not just the UI. Don't rely
on a hidden button for security.

---

## Festival-mode toggle

In Settings, `Festival mode` is a chip showing the auto-detected state
plus a manual override:

- `Auto (current: ON)` — based on date
- `Force on` — for rehearsal weekend
- `Force off` — emergency

PWA install prompt fires for coordinators on their 3rd visit.
