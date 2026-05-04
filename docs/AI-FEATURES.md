# AI Features — Spec

> Anthropic-powered extraction + agent. Owns the wedge: drop a confirmation,
> get a row.

Model: `claude-sonnet-4-6` for both parsing and chat.

---

## 1. The pattern

Every parser endpoint follows the same shape:

```
POST /api/ai/parse-<thing>
   body: { fileId?: string, text?: string, hint?: string }
   → 200 { extracted: <T>, confidence: 0..1, raw_excerpt: string }
```

The route:
1. Auth check (`getAppSession()`).
2. Load file from Vercel Blob (if `fileId`) — text/PDF/image accepted.
3. Build a system prompt with the target Zod schema as JSON Schema.
4. Call Anthropic with `tool_use` forcing the model to return `<T>`.
5. Validate the response against the same Zod schema. On failure: 422.
6. Return extracted + confidence + a short raw excerpt for the user to verify.

The UI then shows a confirmation form pre-filled with `extracted`. User can
edit any field. On save, the form posts to the **regular** CRUD endpoint
(`/api/flights`, `/api/hotels`, etc.) — AI is only ever a pre-filler.

This pattern is important: **AI never writes to the DB directly**. Operator
review every time. Phase 6's agent loosens this for low-stakes writes only
(`mark_paid`, `update_set_status`).

---

## 2. Parsers (Phase 4)

### `parse_flight_confirmation`
Inputs accepted: PDF (Wizz / Turkish / Lufthansa / EK / FlyDubai confirmations),
HTML email export, plain text paste.

Output schema:
```ts
{
  passenger_name: string,
  airline: string,
  flight_number: string,        // "TK826"
  from_airport: string,         // IATA preferred, free-text fallback
  to_airport: string,
  scheduled_depart_dt: string,  // ISO 8601 with TZ
  scheduled_arrive_dt: string,
  pnr?: string,
  cabin?: "Economy" | "Business" | "First",
  seat?: string,
  ticket_total?: { amount: number, currency: "USD"|"EUR"|"AED"|"GBP" }
}
```

Edge cases the parser must handle:
- Multi-leg confirmations → return one item per leg (array)
- Multi-passenger confirmations → return one item per passenger × leg
- Names in non-Latin scripts (rare) → keep original + transliterated
- Local times without timezone — assume the airport's local TZ

### `parse_hotel_confirmation`
```ts
{
  guest_name: string,
  hotel: string,
  room_type?: string,
  checkin: string,    // YYYY-MM-DD
  checkout: string,
  booking_number?: string,
  rate_per_night?: { amount: number, currency: string },
  total?: { amount: number, currency: string },
  breakfast?: "included" | "not_included" | "extra"
}
```

### `parse_invoice`
```ts
{
  vendor: string,
  vendor_address?: string,
  invoice_number?: string,
  issue_date?: string,
  due_date?: string,
  currency: string,
  subtotal?: number,
  tax?: number,
  total: number,
  line_items?: { description: string, qty?: number, unit?: number, total: number }[]
}
```

### `parse_rider`
```ts
{
  artist_name?: string,
  hospitality: string[],          // bullet list
  technical: string[],            // bullet list
  dietary?: string[],
  green_room?: string[],
  arrival_window?: string,
  notes?: string
}
```

---

## 3. Confirmation UI

Standard component: `<AiParseDialog>`.

Layout:
- Top: "Extracted from: filename.pdf" + a small confidence badge
- Middle: form fields, pre-filled, with a small ✦ icon next to AI-filled values
- Right column on desktop (or below on mobile): collapsible "raw excerpt" panel
- Bottom: `Cancel` / `Save & continue editing` / `Save and create another`

Accessibility:
- Every AI-filled field is still a normal input — no special widgets
- Tab order goes through every editable field
- ESC closes; ENTER on the primary CTA saves

---

## 4. Bulk import

For when Eli has 30 flight confirmations to log:

`POST /api/ai/parse-batch` accepts `multipart/form-data` of N files.
- Server parses each serially (concurrency = 1 to keep prompt costs predictable)
- Returns a job id; frontend polls `/api/ai/jobs/[id]` for status
- Result is a list of extracted records the user reviews + commits per row
  or "Approve all" if confidence is uniformly high

---

## 5. Agentic Cmd+K (Phase 6)

Same pattern as greenroom's `/api/ai/agency`:

- SSE streaming
- Tool-use loop with `claude-sonnet-4-6`
- System prompt: operator voice, no hedging, festival vocabulary
- Read tools (always safe):
  - `get_overview` — counts of artists, sets, today's pickups, unpaid total
  - `get_artists` — list with filters
  - `get_flights_today` — direction, status
  - `get_pickups_in_window` — start/end ISO
  - `get_unpaid` — by artist, vendor
  - `get_riders_missing` — artists with confirmed set + no rider
- Write tools (require explicit prompt naming the entity):
  - `create_pickup` — with all required fields
  - `mark_paid` — by payment id
  - `update_set_status` — confirmed/option/not_available
  - `update_flight_status` — landed/delayed
- The loop runs until model says "done" or hits 8 iterations.

Cmd+K UI lifted from greenroom: floating badge bottom-right when closed,
overlay when open, quick prompts in empty state, follow-up chips after answer.

---

## 6. Cost guardrails

- Per-org daily token budget (default 1M tokens/day) → degrade to "AI parsing
  paused, please retry tomorrow" with link to bump budget.
- Cache parser results by file hash for 24h — re-parsing same file returns
  cached result.
- Long PDFs (>50 pages) → reject up front with "split this file first".

---

## 7. What we DON'T do (yet)

- **No Gmail OAuth** — explicit decision. Eli forwards or uploads.
- **No auto-write** from parsing — always operator-confirmed.
- **No background email scraping** — too much PII risk for v1.
- **No voice transcription** — could be Phase 7 stretch (festival-day notes).

---

## 8. Files

- `src/lib/ai/client.ts` — single Anthropic client init
- `src/lib/ai/prompts.ts` — system prompts + tool defs per parser
- `src/lib/ai/schemas.ts` — Zod schemas, also used to derive JSON Schema for
  tool definitions
- `src/lib/ai/parse.ts` — generic parse() wrapper used by all parser routes
- `src/lib/ai/agency-tools.ts` — agentic Cmd+K (Phase 6)
- `src/app/api/ai/parse-flight/route.ts` — etc per parser
- `src/components/ai/AiParseDialog.tsx` — confirmation UI
- `src/components/ai/CommandPalette.tsx` — Cmd+K (Phase 6)
