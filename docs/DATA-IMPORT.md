# Data Import — 2024 → Aegis System

> One-time backfill of the 2024 festival data from the spreadsheets into the
> live DB. Run via `npm run import:2024` after Phase 2 schema is migrated.

The script lives at `scripts/import-2024.ts`. It reads from the `.xlsx` files
placed in `/data/2024/` (gitignored).

---

## Source files (place under `/data/2024/`)

- `Aegis Logistics 2024.xlsx`
- `Aegis Festival Line Up 2024.xlsx`
- `AF2024 GUESTLIST.xlsx`
- `Aegis Artist Hotel Options.xlsx`
- `Byblos Sur Mer.xlsx`
- `Big Bang Emails.xlsx`

---

## Field maps

### `Aegis Logistics 2024.xlsx → General` → `sets`

Sheet header row is row 3 (rows 1-2 are merged labels). Columns observed:

| Sheet column | Target |
|---|---|
| `Itinerary` | (skip — derived) |
| `Timetable` | `slots.start_time` + `slots.end_time` (parse "8PM--10PM") |
| `Artist` | `artists.name` (link or create) |
| `Deal` | `sets.fee_amount_cents` + `sets.fee_currency` (parse "500$" / "€1000") |
| `guestlist` | (skip — separate sheet) |
| `Contract` | `contracts.status` (`done` → `signed`, `no contract` → `void`, blank → `draft`) |
| `Comments` | `sets.comments` |
| `Flights` | (informational — actual flight rows live in Flights sheet) |
| `Payment` | `payments.paid_via` (`In Cash` → `cash`) + status |
| `Visa` | `artists.visa_status` (`No need` → `not_needed`) |
| `Hotel` | `hotel_bookings.status` cue |
| `Hotel Name` | `hotel_bookings.hotel_id` (lookup by name) |
| `Rider` | (informational — actual rider files in Riders module) |
| `Rec?` | `riders.confirmed` |

Day grouping: top of sheet says `Mainstage / Friday` then later `Saturday`,
`Sunday`. Walk the sheet keeping current `(stage, day)` context.

### `Aegis Logistics 2024.xlsx → Flights` → `flights`

Two side-by-side sub-tables: arrival (cols A-E) and departure (cols G-K).

| Sheet col | Target (direction = `inbound` for left, `outbound` for right) |
|---|---|
| `Person` | `flights.person_id` (lookup artist or crew by name) |
| `From` / ` To` | `flights.from_airport` / `flights.to_airport` |
| `Arrival/Departure Date` + `Time` | `flights.scheduled_dt` |
| `Flight #` | `flights.flight_number` + parse airline prefix |

### `Aegis Logistics 2024.xlsx → Ground Transportation` → `ground_transport_pickups`

Same layout: arrival pickups on the left, departure pickups on the right.

| Sheet col | Target |
|---|---|
| `Full Passport Name` | `pickups.person_id` (lookup) |
| `Routing` | parse "Airport→BSM" → `route_from` + `route_to` + details |
| `Arr./Dep. Date` + `Time` | `pickups.pickup_dt` (use `Pickup Time` for departures if present) |
| `Flight #` | resolve to `pickups.linked_flight_id` |
| `Car Type` | `pickups.vehicle_type` |
| `Cost` | `pickups.cost_amount_cents` + currency parse |

### `Aegis Logistics 2024.xlsx → payments` → `payments`

Direct map:
| Sheet col | Target |
|---|---|
| `Due Date` | `payments.due_date` |
| `Artist` | `payments.artist_id` (lookup) |
| `Payment Desc` | `payments.description` |
| `Amount Due` | `payments.amount_cents` + currency parse |
| `Invoice Link` | optional — fetch + upload to Blob |
| `Comment` | `payments.comments` |
| `Paid` (TRUE/FALSE) | `payments.status` (`paid` if true, else `pending`) |

### `Aegis Logistics 2024.xlsx → pending payments` → `payments` (status='pending')

| Sheet col | Target |
|---|---|
| `Description` | `payments.description` |
| `Amount $` | parse → `amount_cents` with `currency='USD'` |
| `Amount Euro` | parse → `amount_cents` with `currency='EUR'` |
| `Comments` | `payments.comments` |

### `Aegis Logistics 2024.xlsx → Stage Managers` / `Volunteers` → `crew`

One row per person. `role` set to `stage_manager` / `volunteer` accordingly.

### `Aegis Logistics 2024.xlsx → BYBLOS TAXI` / `LuxCars` / `Aqua` / `BSM` → `vendors` (one row each)

Plus their per-pickup detail rows feed `ground_transport_pickups.vendor_id`.

### `Aegis Festival Line Up 2024.xlsx → Line-Up` → `sets`

Stage indicated by section header rows. Day in column A. Time in column B.
Artist in `Line Up A/B/C` columns (multiple options per slot). Status:
- `Line Up A` non-empty + name not in `Not Available` column → `option`
- Confirmed names (cross-reference with sheet `General`) → `confirmed`

`Fee Estimation from A` → store as `sets.fee_amount_cents` for the A choice.

`Batch 1`, `Batch 2`, etc sheets → `sets.announce_batch` value.

### `AF2024 GUESTLIST.xlsx → DJs Guests` → `guestlist_entries` (`category=dj_guest`)

| Sheet col | Target |
|---|---|
| Header (artist name, e.g. `Raphael Merheb`) | `host_artist_id` |
| `Guestlist Name` | `name` |
| `Guestlist Number` | `phone` |
| `Guestlist Email` | `email` |
| `Invite sent?` | `invite_sent` |

`Competition winners`, `Additional General Admission`, `International Guests`,
`AEGIS FREE LIST` map to `competition_winner` / `general_admission` /
`international` / `free_list` respectively.

### `Aegis Artist Hotel Options.xlsx` → `hotels` + `hotel_room_blocks`

| Sheet col | Target |
|---|---|
| `Hotel Name` | `hotels.name` |
| `Room Type` | `hotel_room_blocks.room_type` |
| `# of Rooms` | `hotel_room_blocks.rooms_reserved` (parse "As much as needed" → null) |
| `Breakfast` | `hotel_room_blocks.breakfast_note` |
| `Price/Night` | `hotel_room_blocks.price_per_night_amount_cents` + currency |
| `Location` | `hotels.location` |
| `Comment` | `hotels.notes` |

### `Byblos Sur Mer.xlsx` → `hotel_bookings`

| Sheet col | Target |
|---|---|
| `Artist` | `person_id` (lookup, `person_kind='artist'`) |
| `Check In Date` + `Check In Time` | `checkin` |
| `Check Out Date` + `Check Out Time` | `checkout` |
| `Room Type` | `room_type` |
| `Booking Number` | `booking_number` |
| `Credits` | `credits_amount_cents` |
| `#Nights` | derived; verify |

`hotel_id` = lookup "Byblos Sur Mer".

---

## Strategy

1. Pre-create the 2024 `festival_editions` row.
2. Pre-create stages (Main / Alt / Select / Coll).
3. Walk lineup sheets first — populates `artists` + `slots` + `sets`.
4. Walk `General` to enrich artists with status flags.
5. Walk Flights, then Ground (Ground references Flights).
6. Walk Hotels meta, then Byblos Sur Mer bookings, then any other hotel
   bookings (TODO: ask Eli for non-BSM booking sheets).
7. Walk payments + pending payments.
8. Walk guestlist sheets.
9. Walk crew sheets.
10. Riders + contracts: skip during import — these are file uploads, do them by
    hand or via AI parser later.

Each step is idempotent: matched on `(edition_id, slug)` for artists, on
`(person_id, scheduled_dt, flight_number)` for flights, etc.

The script must:
- Print a summary at the end (rows inserted, skipped, errors)
- Write any rows it couldn't parse to `data/2024-import-errors.json`
- Be re-runnable safely
