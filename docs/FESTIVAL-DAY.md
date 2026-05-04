# Festival-Day Mode — Spec

> What the app turns into during the festival weekend itself.
> Triggered automatically when system date is within
> `festival_editions.start_date..end_date` AND `festival_mode_active = true`.

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

---

## Top-level switcher

When in festival mode, the dashboard sidebar collapses to 5 items:

1. **Now** — live ops (default)
2. **Pickups** — full ground transport list, today
3. **Arrivals** — flight tracker, today
4. **Issues** — open problems
5. **Roadsheets** — search any artist, get their sheet

Planning modules stay accessible under "Planning" submenu, but they're not the default.

---

## Stage filter (sticky)

Always visible at the top:

```
[ALL]  [Main]  [Alt]  [Select]  [Coll]
```

Tapping a chip filters every list on the page. Selection persists in
`localStorage` across sessions.

---

## Screen 1 — Now

For each stage (or just selected stage):

```
MAIN STAGE                                     22:14
─────────────────────────────────────────────────────
NOW    Frankey & Sandrino                  22:00–00:00
NEXT   Hiroko Yamamura                     00:00–02:00
LATER  Seth Troxler                        02:00–04:00
```

- Set times in Geist Mono
- "NOW" row has a thin gold stripe on the left
- Tapping a row → roadsheet for that artist

---

## Screen 2 — Pickups (next 2h emphasised)

```
NEXT 2H
17:30  AIRPORT → BSM    Hiroko Yamamura     LuxCars / Black Sedan / +961 70…
18:15  BSM → MAIN       Frankey & Sandrino  BYBLOS TAXI / Van / +961 71…

LATER TODAY
21:00  HOTEL → STAGE    Seth Troxler        LuxCars / Sedan / +961 70…
```

- Color stripe by status: gold = scheduled, blue = dispatched, green = completed
- One-tap "Mark dispatched" / "Mark completed" — server action, no modal
- Tap driver phone → `tel:` link

---

## Screen 3 — Arrivals

A flight tracker. Shows `inbound` flights with `scheduled_dt::date = today`.

```
TK826      Istanbul → BEY      20:45    LANDED      Hiroko Yamamura
FZ157      Dubai → BEY         10:05    IN AIR      Alex James
LH1234     Frankfurt → BEY     14:20    SCHEDULED   Frankey + Sandrino
```

- Status pills with colors: scheduled (grey), in_air (blue), landed (green),
  delayed (amber), cancelled (red)
- Tap row → see linked pickup, or create one inline if missing
- Pull-to-refresh; auto-poll every 30s

---

## Screen 4 — Issues

Anything missing or blocking. Sorted by severity.

Detection rules:
- Artist with confirmed set + no contract uploaded → `severity: high`
- Artist with confirmed set + no rider → `severity: medium`
- Artist arriving today + no pickup scheduled → `severity: high`
- Set today + payment status not `paid` → `severity: high`
- Hotel booking today + no room block → `severity: medium`
- Guestlist entry today + invite not sent → `severity: low`

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
- Pickups (chronologically): flight→hotel, hotel→stage, stage→hotel, hotel→airport
- Outbound flight: airline, number, time, airport
- Payment status
- Rider notes (1-line summary from AI)
- Emergency contact

Print-friendly CSS so it looks the same on screen and on paper. Geist Mono for
all dates/times/numbers.

---

## Mobile patterns

- Stack everything vertically below `md` breakpoint
- Stage filter chips become a horizontal scroll strip
- Tappable areas: minimum 44×44 px
- Sticky bottom action bar for primary action when one obviously applies
- Swipe down to refresh
- Offline-tolerant: last fetched data shown with a "stale at HH:MM" pill

---

## Data refresh

- 30s polling on `Now`, `Pickups`, `Arrivals`
- Manual pull-to-refresh always available
- Server actions for write — full route revalidate on success
- No realtime websockets in v1 (overkill for 3 days a year)

---

## Permissions during festival

- `owner` — everything
- `coordinator` — can mark pickups dispatched/completed; can edit guestlist;
  can flip flight statuses; cannot edit fees or payments
- `viewer` — sees Now / Pickups / Arrivals / Roadsheets, no writes
- Stage manager users get role `viewer` + `artist_scope` filter so they only see
  their own stage (Phase 5 stretch)

---

## Festival-mode toggle

In Settings, `Festival mode` is a read-only chip showing the auto-detected state
plus a manual override:

- `Auto (current: ON)` — based on date
- `Force on` — for rehearsal weekend
- `Force off` — emergency
