# Aegis System — Data Model

> Source-of-truth schema spec. Drives `src/db/schema.ts`. Update both together.

All tables use:
- `id uuid PK default gen_random_uuid()`
- `created_at timestamp not null default now()`
- `updated_at timestamp` (touched on update via app code)
- `archived_at timestamp` (soft-delete; never hard-delete by default)

Money: `amount_cents integer` + `currency varchar(3)` — `USD` or `EUR`.
Dates: `timestamp` in UTC; convert in UI with `date-fns-tz` (Beirut tz).

---

## Identity & access

### `user` (better-auth)
Standard better-auth columns (`id`, `email`, `name`, `emailVerified`, `image`,
`createdAt`, `updatedAt`).

### `team_members`
| col | type | notes |
|---|---|---|
| owner_id | text | FK to `user.id` of the primary owner (Eli) |
| user_id | text | FK to `user.id` once accepted; null until then |
| email | text | invited email |
| name | text | |
| role | enum | `owner` / `coordinator` / `viewer` |
| status | enum | `pending` / `active` / `suspended` |
| permissions | jsonb | per-key overrides on top of role defaults |
| invite_token | text unique | |

---

## Lineup

### `stages`
| col | type | notes |
|---|---|---|
| name | text | "Main Stage", "Alternative Stage", "Select Pool", "Collectives" |
| slug | text unique | |
| color | text | hex token from brand palette |
| sort_order | integer | |

### `festival_editions`
| col | type | notes |
|---|---|---|
| year | integer unique | e.g. 2024, 2026 |
| name | text | "Aegis Festival 2026" |
| start_date | date | |
| end_date | date | |
| location | text | "Adma / Byblos, Lebanon" |
| festival_mode_active | boolean | flips the UI to live-ops view |

### `slots`
A time block on a stage on a day.
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| stage_id | uuid FK | |
| day | enum | `friday` / `saturday` / `sunday` |
| start_time | time | `20:00` |
| end_time | time | `22:00` |
| sort_order | integer | |

### `sets`
A specific artist's performance.
| col | type | notes |
|---|---|---|
| slot_id | uuid FK | |
| artist_id | uuid FK | |
| status | enum | `confirmed` / `option` / `not_available` |
| announce_batch | text | "Batch 1", "Chapter 2", null |
| fee_amount_cents | integer | |
| fee_currency | varchar(3) | `USD` / `EUR` |
| agency | text | booking agency name |
| comments | text | |

---

## People

### `artists`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | tie to year so an artist can return |
| slug | text unique | |
| name | text | display name; can be a B2B like "Tia B2B Romax" |
| legal_name | text | |
| nationality | text | |
| passport_number | text | encrypted at rest in Phase 7 |
| email | text | |
| phone | text | |
| agency | text | |
| agent_email | text | |
| instagram | text | |
| soundcloud | text | |
| color | text | hex; auto if null |
| local | boolean | local Lebanese artist (different fee/payment rules) |
| comments | text | |
| visa_status | enum | `not_needed` / `pending` / `approved` / `rejected` |
| press_kit_url | text | optional. external URL (Dropbox/Drive/site) OR a Blob proxy URL after upload. opaque URL to the app. |
| passport_file_url | text | optional. private Blob proxy URL. Upload goes through the documents API with `entityType='artist' + tags=['passport']` for audit; this column denormalises the latest URL for quick display. |

### `crew`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| name | text | |
| role | enum | `stage_manager` / `volunteer` / `photo` / `video` / `sound` / `ops` / `other` |
| email | text | |
| phone | text | |
| stages | jsonb | array of stage_ids the crew member covers |
| days | jsonb | array of `friday` / `saturday` / `sunday` |
| daily_rate_cents | integer | |
| comments | text | |

For tables that reference "person" generically (flights, hotels, ground), use a
polymorphic FK pattern:
- `person_kind` enum: `artist` / `crew`
- `person_id` uuid (FK depends on kind, validated at the route layer)

---

## Travel

### `flights`
One row per **leg**. Arrivals and departures are separate rows so a return
flight is two rows.
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| person_kind | enum | `artist` / `crew` |
| person_id | uuid | |
| direction | enum | `inbound` / `outbound` |
| from_airport | text | IATA code preferred; free-text fallback |
| to_airport | text | |
| airline | text | |
| flight_number | text | "TK826" |
| scheduled_dt | timestamptz | full datetime |
| actual_dt | timestamptz | filled day-of |
| status | enum | `scheduled` / `landed` / `delayed` / `cancelled` / `boarded` |
| pnr | text | |
| ticket_url | text | Vercel Blob proxy URL |
| confirmation_email_url | text | parsed source file |
| seat | text | |
| comments | text | |

### `ground_transport_pickups`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| person_kind | enum | |
| person_id | uuid | |
| route_from | enum | `airport` / `hotel` / `stage` / `other` |
| route_from_detail | text | hotel name, airport code, etc |
| route_to | enum | same |
| route_to_detail | text | |
| linked_flight_id | uuid | FK if pickup is for a flight |
| pickup_dt | timestamptz | scheduled |
| vehicle_type | text | "Sedan", "Van", "Bus" |
| vendor_id | uuid FK | |
| driver_name | text | |
| driver_phone | text | |
| cost_amount_cents | integer | |
| cost_currency | varchar(3) | |
| status | enum | `scheduled` / `dispatched` / `completed` / `cancelled` |
| comments | text | |

### `vendors`
| col | type | notes |
|---|---|---|
| name | text | "BYBLOS TAXI", "LuxCars", "Aqua" |
| service | enum | `ground` / `hotel` / `equipment` / `catering` / `other` |
| contact_name | text | |
| contact_email | text | |
| contact_phone | text | |
| notes | text | |

---

## Hotels

### `hotels`
| col | type | notes |
|---|---|---|
| name | text | "Regency Palace", "Byblos Sur Mer" |
| location | text | "Adma" / "Byblos" |
| address | text | |
| contact_name | text | |
| contact_email | text | |
| contact_phone | text | |
| notes | text | |

### `hotel_room_blocks`
A reserved set of rooms at a hotel for an edition.
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| hotel_id | uuid FK | |
| room_type | text | "Junior Suite", "Delux Sea View" |
| nights | integer | |
| rooms_reserved | integer | |
| rooms_used | integer | computed |
| price_per_night_amount_cents | integer | |
| price_per_night_currency | varchar(3) | |
| breakfast_note | text | "$20/person/night", "included" |

### `hotel_bookings`
One row per person × hotel × stay.
| col | type | notes |
|---|---|---|
| room_block_id | uuid FK | nullable if outside a block |
| person_kind | enum | |
| person_id | uuid | |
| hotel_id | uuid FK | |
| room_type | text | denormalised at booking time |
| checkin | date | |
| checkout | date | |
| nights | integer | derived |
| booking_number | text | |
| credits_amount_cents | integer | |
| credits_currency | varchar(3) | |
| status | enum | `tentative` / `booked` / `checked_in` / `checked_out` / `cancelled` |
| confirmation_url | text | Blob proxy |
| comments | text | |

---

## Money

### `payments`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| artist_id | uuid FK | nullable (could be vendor payment) |
| vendor_id | uuid FK | nullable |
| description | text | "BF" (booking fee), "AF+BF", "Hotel", etc |
| due_date | date | |
| amount_cents | integer | |
| currency | varchar(3) | |
| invoice_id | uuid FK | nullable |
| pop_url | text | proof of payment file in Blob |
| status | enum | `pending` / `due` / `paid` / `overdue` / `void` |
| paid_at | timestamp | |
| paid_via | enum | `bank` / `cash` / `wise` / `crypto` / `other` |
| comments | text | |

### `invoices`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| number | text | sequential per edition |
| issuer_kind | enum | `artist` / `vendor` / `agency` |
| issuer_id | uuid | |
| issue_date | date | |
| due_date | date | |
| amount_cents | integer | |
| currency | varchar(3) | |
| file_url | text | Blob proxy |
| status | enum | `received` / `disputed` / `paid` |
| comments | text | |

---

## Documents

### `contracts`
| col | type | notes |
|---|---|---|
| artist_id | uuid FK | |
| edition_id | uuid FK | |
| status | enum | `draft` / `sent` / `signed` / `void` |
| sent_at | timestamp | |
| signed_at | timestamp | |
| file_url | text | uploaded PDF |
| signed_file_url | text | counter-signed PDF |
| notes | text | |

### `riders`
| col | type | notes |
|---|---|---|
| artist_id | uuid FK | |
| kind | enum | `hospitality` / `technical` |
| file_url | text | |
| parsed_items | jsonb | AI-extracted bullet list (Phase 4) |
| received_at | timestamp | |
| confirmed | boolean | "Rec?" flag from sheet |

### `documents`
Generic Vercel Blob archive.
| col | type | notes |
|---|---|---|
| owner_id | text | |
| entity_type | text | "artist" / "crew" / "flight" / "payment" / "invoice" / "contract" / "rider" / "passport" / "marketing" |
| entity_id | uuid | |
| filename | text | |
| mime_type | text | |
| size_bytes | bigint | |
| url | text | Blob path (private) |
| uploaded_by | text | |
| tags | jsonb | string[] |

---

## Guests

### `guestlist_entries`
| col | type | notes |
|---|---|---|
| edition_id | uuid FK | |
| category | enum | `dj_guest` / `competition_winner` / `free_list` / `international` / `general_admission` |
| host_artist_id | uuid FK | nullable; the artist whose list this guest is on |
| name | text | |
| email | text | |
| phone | text | |
| day | enum | `friday` / `saturday` / `sunday` / `all` |
| invite_sent | boolean | |
| checked_in | boolean | filled day-of |
| comments | text | |

---

## Communication (Phase 2)

### `email_threads`
| col | type | notes |
|---|---|---|
| subject | text | |
| participants | jsonb | string[] of emails |
| linked_artist_id | uuid FK | nullable |
| last_message_at | timestamp | |
| status | enum | `open` / `archived` |

### `email_messages`
| col | type | notes |
|---|---|---|
| thread_id | uuid FK | |
| from_email | text | |
| to_emails | jsonb | string[] |
| sent_at | timestamp | |
| body_html | text | |
| body_text | text | |
| ai_summary | text | Phase 2 |
| attachments | jsonb | array of `{filename, url}` |

---

## Audit log

### `audit_events`
| col | type | notes |
|---|---|---|
| actor_id | text | user.id |
| action | text | "create" / "update" / "delete" / "ai_parse" |
| entity_type | text | |
| entity_id | uuid | |
| diff | jsonb | before/after |
| created_at | timestamp | |

---

## Indexes

Add early — these are the hot paths:
- `flights (edition_id, scheduled_dt)`
- `ground_transport_pickups (edition_id, pickup_dt)`
- `payments (edition_id, status, due_date)`
- `sets (slot_id)` and `slots (edition_id, day, stage_id, sort_order)`
- `documents (entity_type, entity_id)`
- `guestlist_entries (edition_id, category, day)`

---

## Migration policy

- Always `npm run db:generate` first, review the generated SQL, commit.
- Then `npm run db:migrate` against Neon.
- **Never** run `db:push` against production — it skips the migration trail.
- Migrations live in `/drizzle`.
