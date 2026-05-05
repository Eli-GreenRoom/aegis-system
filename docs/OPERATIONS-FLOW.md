# Operations Flow — Aegis System

> The lifecycle of a single artist (or crew member) from "agency emails me" to
> "set ended Sunday 4am, heading home." How data should enter the system, how
> states should advance, and how the system has to behave on the day itself.
>
> This is the canonical reference for state machines, festival-day UX, and the
> cross-table aggregators that make the dashboard glanceable. Read this before
> touching state enums, festival-day views, or audit logging.
>
> Source-of-truth schema: `docs/DATA-MODEL.md`.
> Festival-day screens: `docs/FESTIVAL-DAY.md`.

---

## 1. The lifecycle (planning → festival → departure)

### Year-out → 90 days out — booking
- Agency offer comes in → create artist (status: `option`)
- Negotiation → set placed in slot, set status `option`, fee captured
- Contract drafted → sent → countersigned → uploaded
- Deposit invoice raised → paid (status `paid`)
- Set status flips to `confirmed`

### 90 → 30 days out — paperwork
- Hospitality + technical riders received and confirmed
- Visa application started (if needed); `visaStatus` advances pending → approved
- Press-kit URL captured (Dropbox / Drive / artist site)
- Passport file uploaded for visa + airport use

### 30 → 7 days out — travel
- Flights booked (inbound + outbound legs, separate rows)
- Hotel block assigned: artist enters a `hotel_booking` against a block
- Pickups scheduled (airport→hotel, hotel→stage, stage→hotel, hotel→airport),
  each linked to its anchoring flight where applicable
- Final invoice raised → paid

### T-1 day — pre-festival
- All flights are `scheduled`
- All paperwork uploaded and confirmed
- Drivers assigned (vendor + driver + phone on every pickup)
- Eli does an `Open issues` sweep the night before — anything in coral gets
  resolved before the artist lands

### Day-of arrival
Each artist's arrival cascade:
```
flight        scheduled → boarded → in_air → landed
                                              │
pickup        scheduled →─── dispatched ──────┴── in_transit → completed
                              (driver heads to airport before landing)         │
                                                                                ▼
hotel_booking                                          booked → checked_in
```

### Festival days proper
- Hotel→Stage pickup follows same machine
- Set: `confirmed` → `live` (auto on slot start) → `done` (auto on slot end)
- Last-minute drop: set goes to `withdrawn` (not the artist — keep history)
- Stage→Hotel pickup
- Repeat per artist per day

### Departure
- Hotel: `checked_in` → `checked_out` (or `no_show` if a guest never arrived)
- Hotel→Airport pickup
- Outbound flight scheduled → boarded → in_air. Stop tracking after boarded
  unless a return-flight problem matters operationally.

---

## 2. State machines (locked)

Each table's status enum and the legal transitions. Backwards transitions are
allowed but require a long-press / overflow action and write a verbose audit
record. Forward transitions are one-tap.

### `flights.status`
```
scheduled → boarded → in_air → landed
        ↘            ↗           ↑
         delayed ────┘    (delayed can be set from any pre-landed state)
        ↘
         cancelled
```
- On `landed`: capture `actualDt = now()` (don't trust user typing)
- On `delayed`: keep current `scheduledDt`; add a `delayMinutes: integer`
  column; UI subtracts the delta from any auto-computed pickup ETA
- `cancelled` is terminal; if a replacement flight is needed, create a new row

### `pickups.status`
```
scheduled → dispatched → in_transit → completed
        ↘                              ↗
         cancelled  ←────── (rare)
```
- New status added: `in_transit` (driver has the passenger but hasn't dropped
  off yet)
- Capture timestamps on each transition: `dispatchedAt`, `inTransitAt`,
  `completedAt`. Don't trust the user — capture click time.
- `linkedFlightId`: if the linked flight is `delayed`, surface a warning on
  the pickup row prompting Eli to push the pickup time. One-tap "Shift +30m"
  / "Shift +1h" buttons.

### `hotel_bookings.status`
```
tentative → booked → checked_in → checked_out
                        │
                        ↓
                    no_show              (new — guest never showed)
```
- `tentative` = block reserved by Eli but not yet confirmed by the hotel
- `booked` = hotel confirmed; default state pre-arrival
- `checked_in` / `checked_out`: capture `checkedInAt` / `checkedOutAt`
- `no_show`: terminal; counts against block usage but flagged separately

### `sets.status`
```
option → confirmed → live → done
   │         ↓        ↓
   │    withdrawn   (artist pulled at last minute — different from option lapse)
   ↓
not_available  (was never going to happen)
```
- New: `live` and `done` for festival-day display
- New: `withdrawn` — distinguishes "they confirmed, then dropped" from
  "we considered them, never confirmed" (`not_available`). Important for
  comms and refunds.
- `live` / `done` auto-flip from `confirmed` on slot start/end. Manual override
  always allowed.

### `payments.status`
Already complete: `pending` → `due` → `paid` (or → `overdue` → `paid`).
`void` for cancelled. No changes.

### `contracts.status`
Already complete: `draft` → `sent` → `signed` (or → `void`). No changes.

### `artists.visaStatus` and `crew.visaStatus`
Currently text. Move to enum:
```
not_needed | pending | approved | rejected
```

---

## 3. Schema deltas (vs current)

These changes land in one consolidated migration before Hotels (Phase 2.5a),
so the rest of Phase 2 builds on top of clean enums.

### Crew table — parity with artists
Add the travel-paperwork columns crew need:
- `nationality: text`
- `passportFileUrl: text` (private Blob proxy URL — uploaded via documents API)
- `pressKitUrl: text` (rare for crew, but cheap to keep symmetric)
- `visaStatus: visaStatusEnum` (new enum)

### New `visaStatusEnum`
```
not_needed | pending | approved | rejected
```
Replace `artists.visa_status` text with this enum. Add same on `crew`.

### Set status enum
Add: `live`, `done`, `withdrawn`.

### Pickup status enum
Add: `in_transit`.
Add columns: `dispatched_at: timestamptz`, `in_transit_at: timestamptz`,
`completed_at: timestamptz`. Existing `status` column is still the
current state; the timestamps are the audit of when each transition happened.

### Hotel booking status enum
Add: `no_show`.
Add columns: `checked_in_at: timestamptz`, `checked_out_at: timestamptz`.

### Hotel room blocks
Add: `label: text` — operator-friendly name like "Artists — Deluxe" or
"Crew — Standard". Lets Eli book separate blocks for crew (per his
2026-05-05 decision).

### Flights
Add: `delay_minutes: integer` — set when status flips to `delayed`. Optional
and nullable.

### Audit events
Table already exists in schema. Wire writes on every status transition across
flights, pickups, hotel_bookings, sets, payments, contracts. Write fields:
`actorId`, `action` ("transition"), `entityType`, `entityId`, `diff`
(`{ from: "scheduled", to: "landed", at: "2026-08-15T18:42:11Z" }`).

---

## 4. Cross-table aggregators

These live in `src/lib/aggregators/` (new folder). Each is a pure function
taking the DB client + scope; each has a unit test with mocked DB.

### `getArtistRoadsheet(artistId, day?)`
Returns chronological events for an artist (or just for one day if `day` is
passed). Powers the per-artist roadsheet PDF and the festival-day card.
```ts
{
  artist,
  set,                 // for the day
  inboundFlight,       // landing today (or yesterday if multi-day stay)
  outboundFlight,      // leaving today (or tomorrow)
  hotel,               // currently active booking
  pickups: Pickup[],   // all pickups linked to this artist on this day, sorted
  riders,              // hosp + tech file links
  payments,            // outstanding only by default
}
```

### `getOpenIssues(editionId, scope: 'today' | 'week' | 'all')`
Runs the rule-set:
- Set `confirmed` + no contract uploaded → severity high
- Set `confirmed` + no rider received → severity medium
- Arrival flight today + no pickup scheduled → severity high
- Set today + payment status not `paid` → severity high
- Hotel booking today + no room block link → severity medium
- Guestlist entry today + invite not sent → severity low
- Pickup `completed` 60min ago + hotel booking still `booked` (not
  `checked_in`) → severity medium ("Where did they go?")

Returns sorted by severity desc, then by chronological proximity.

### `getPickupsInWindow(editionId, startDt, endDt)`
Powers the festival-day "Pickups in next 2h" panel. Includes vendor + driver
+ phone fields denormalised so the row is self-contained.

### `getNowAndNext(stageId, atTime)`
Per stage: the currently-`live` set + the next set with status `confirmed`
or `live`. Defaults `atTime = now()`.

### `getArrivalsToday(editionId, date)`
Inbound flights with `scheduledDt::date = date`. Includes the linked artist
or crew, plus any linked pickup status. Powers the Arrivals screen.

### `getCurrentlyActiveBookings(editionId, date)`
Hotel bookings where `checkin <= date < checkout`. Powers the "who's where
right now" view.

---

## 5. Festival-day UX — the one-tap pattern

The single biggest difference between planning mode and festival-day mode:
forms vs buttons. Planning is forms. Festival day is buttons.

### Anatomy of a festival-day row

```
┌─────────────────────────────────────────────────────────────┐
│ Hiroko Yamamura · TK826 · CDG → BEY · 20:45    [ Boarded ] │
│ Inbound · Air France · scheduled                            │
└─────────────────────────────────────────────────────────────┘
            tap [ Boarded ]
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Hiroko Yamamura · TK826 · CDG → BEY · 20:45    [ In air  ] │
│ Inbound · Air France · boarded · 20:31                      │
└─────────────────────────────────────────────────────────────┘
            tap [ In air ]
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Hiroko Yamamura · TK826 · CDG → BEY · 20:45    [ Landed  ] │
│ Inbound · Air France · in_air · 20:34                       │
└─────────────────────────────────────────────────────────────┘
            tap [ Landed ]
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Hiroko Yamamura · landed 20:48 · BSM pickup    [ Dispatch ]│
│ Driver Sami · +961 70 xxx xxx · LuxCars                     │
└─────────────────────────────────────────────────────────────┘
```

Mechanics:
- **One primary button per row** showing the next forward state
- **Optimistic UI**: button label updates before the server confirms; rolls
  back with a coral toast if the request fails
- **Long-press / overflow**: opens a status menu with rare transitions
  (cancel, mark delayed, edit time, go back a state). Required because
  fat-finger forward-only would be brittle.
- **Click time = transition time**: server captures `now()` as the
  `actualDt` / `dispatchedAt` / `checkedInAt`. Don't trust user typing on
  a phone in a field.
- **Audit on every transition**: write to `audit_events` with actor, before,
  after, time. Disputes ("I dispatched at 5pm, dashboard says 6pm") need this.
- **No confirmation modal** on any forward transition. The system is
  trusting the operator. If they hit it wrong, long-press undoes.
- **Coral pulse** on rows that need attention (pickup overdue, flight
  delayed, set live but artist not checked in)

### Cards, not tables, on phone

The desktop ops view is a dense table. The mobile view is **cards**. One
artist per card, today's events stacked inside, one big primary button:

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
│ Today's timeline                     │
│ • 09:42 landed BEY                   │
│ • 10:35 picked up by Sami            │
│ • 11:18 checked in BSM 305           │
│ • 22:00 pickup BSM → Main (next)     │
│ • 23:00 set Main Stage               │
│ • 01:30 pickup Main → BSM            │
└──────────────────────────────────────┘
```

The `[ Dispatch ]` button advances whatever's currently most actionable for
this artist. Eli sees one card per artist who has activity today; everyone
else is collapsed.

### Stage filter chips, sticky top

```
[ All ] [ Main ] [ Alt ] [ Select ] [ Coll ]
```
Stays visible while scrolling. Selection persists in `localStorage`.

### Refresh model
- Polling every 30s on Now / Pickups / Arrivals
- Pull-to-refresh always works
- Server actions for write — full route revalidate on success
- "Stale at HH:MM" pill if connection drops; last-fetched data still shown

---

## 6. Audit & history

Every status transition writes a row to `audit_events`:
```
{
  actorId:    "user_2hf...",
  action:     "transition",
  entityType: "flight" | "pickup" | "hotel_booking" | "set" | ...,
  entityId:   uuid,
  diff:       { field: "status", from: "scheduled", to: "landed" },
  createdAt:  timestamptz,
}
```

Surface a **History** tab on every detail page (artist, flight, pickup, etc)
showing the audit trail in mono. One row per transition. This is your
defence against "I told you the driver dispatched at 5" disputes.

Helper: `recordTransition(actorId, entity, before, after)` in
`src/lib/audit.ts`. Every server action that changes status calls it. Wrap
in the same DB transaction as the actual update so the two can't drift.

---

## 7. Permissions on transitions

- **Owner** (Eli): everything
- **Coordinator** (logistics team): can transition flights / pickups /
  hotels / sets. Cannot mark payments paid, cannot edit fees, cannot
  edit roles.
- **Viewer** (stage manager / external): read-only on festival-day views.

Permissions are checked in the server action, not just the UI. Don't trust
the button being hidden.

---

## 8. Mobile / connectivity

- **PWA install prompt** on the dashboard root once a coordinator has
  visited 3+ times. Not pushy.
- **Offline-tolerant reads**: last-fetched data shown with a "stale" pill
  when the connection drops. Writes queue locally for ≤ 5 minutes; if
  connection restores within that, they replay; else they fail with a
  clear coral toast.
- **Tap targets** ≥ 44×44 on every interactive element on the festival-day
  views. Not optional.
- **No hover-only affordances** (you can't hover on a phone). If a thing is
  visible only on hover on desktop, it must be a long-press affordance on
  mobile.

---

## 9. Better data entry pre-festival

The pre-festival half of the system today is mostly forms. Two cheap upgrades:

### Bulk row entry
For repeated entries (a batch of flights for 8 artists, all same airline),
support a "+ add another" pattern that keeps the form open with the
previous values prefilled. Doesn't sound like much; saves an hour per batch.

### AI-assisted entry (Phase 4 wedge — restated for emphasis)
Drop a flight confirmation PDF / email / screenshot → Claude extracts the
fields → operator confirms → row created. Same for hotel confirmations,
invoices, riders.

Critically: the AI never writes to the DB directly. The operator confirms
every parse. The audit log records who confirmed what.

### Smart defaults
When creating a pickup linked to an inbound flight:
- `pickupDt` = `flight.scheduledDt` + 30 min (configurable)
- `routeFrom` = `airport`, `routeFromDetail` = `flight.toAirport`
- `routeTo` = `hotel`, `routeToDetail` = artist's currently-active hotel
  booking
- `personKind` / `personId` = inferred from the flight

When creating a hotel booking:
- `checkin` = inbound flight `scheduledDt::date`
- `checkout` = outbound flight `scheduledDt::date`

Most pickups / bookings should be 80% pre-filled. The operator just
confirms.

---

## 10. Build order to get here

1. **Phase 2.5a — Operations groundwork** (small, retrofit)
   - Schema migration: visa enum, set/pickup/hotel status additions, crew
     parity (passport / visa / nationality), pickup transition timestamps,
     hotel booking checkin/out timestamps, hotel block label, flight
     `delayMinutes`
   - Wire `audit_events` writes on every existing status-changing route
   - Add the `recordTransition` helper

2. **Phase 2.5 — Hotels** (already in Now)
   - Built on top of the new block `label` and `no_show` state

3. **Phase 2.7 — Payments + Invoices** (next module)
   - Coral / gold / mint will pop here

4. **Phase 2.8 — Riders, Contracts, Guestlist, Documents** (finish CRUD)

5. **Phase 2.9 — Aggregators**
   - `getArtistRoadsheet`, `getOpenIssues`, `getPickupsInWindow`,
     `getNowAndNext`, `getArrivalsToday`, `getCurrentlyActiveBookings`
   - All in `src/lib/aggregators/`, all unit-tested with mocked DB

6. **Phase 3 — 2024 import**

7. **Phase 4 — AI extraction**

8. **Phase 5 — Festival-day mode**
   - One-tap rows
   - Card view
   - Stage filter
   - Polling
   - PWA prompt

9. **Phase 6 — Cmd+K agent** (uses the same aggregators)

10. **Phase 7 — Polish + comms** (roadsheet emails, public portal, backups)
