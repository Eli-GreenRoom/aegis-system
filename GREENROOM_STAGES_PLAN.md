# GreenRoom Stages — Master Plan

> **Supersedes** `GREENROOM_STAGES_REBRAND.md`. The old plan covered cosmetic rebrand only (tokens, strings, package metadata). The audit on 2026-05-10 found the codebase is single-tenant, hardcoded to one festival, with no team UI and no scoping. This plan restructures the foundation first, then does the rebrand last.
>
> Drop this file at the root of `~/Desktop/aegis-system/` (rename target: `~/Desktop/greenroom-stages/`). Open Claude Code there and tell it: _"Read GREENROOM_STAGES_PLAN.md and AGENT.md. Propose Phase 0. Wait for approval. Execute one phase per PR."_
>
> If anything in chat conflicts with this file, this file wins until updated.

**Decisions locked 2026-05-10** (Eli):

1. Hierarchy: **Account → Workspace → Festivals**.
2. Roles: **Owner / Admin / Member / Viewer** (4-tier, granular perms).
3. Onboarding: **forced festival creation** on signup (no empty dashboard).
4. **Per-festival member scope** (festivalScope column, mirrors HQ's artistScope).
5. **Topbar dropdown** for workspace + festival switcher.
6. **Per-stage active dates** (Main runs full festival, Alternative only Sat–Sun, etc.).
7. Repo rename `aegis-system → greenroom-stages` happens AFTER all phases land (was Phase A.5, now Phase 8).
8. Tenant theming chrome-only — Aegis brand book lives in customer-facing exports only.
9. **No Resend in Phase 3.** Invites are copy-link only (HQ already supports this — email send is best-effort, non-blocking). Resend stays in `package.json` for later.

---

## 1. Mission

The `aegis-system` codebase is being repositioned as **GreenRoom Stages** — a multi-tenant festival & live-event operations product, sold under the **GreenRoom HQ** brand family alongside `~/Desktop/greenroom`.

**This is now a foundational restructure + brand pivot. Not a rewrite, but more than a rename.**

What changes structurally:

- Single-tenant → multi-tenant (workspaces, scoped data).
- One hardcoded festival per database → multiple festivals per workspace.
- Hardcoded T-date and stages → all driven by the active festival's data.
- No team UI → full team + invites + permissions, ported from HQ.
- 16-item nav, no Home page → simpler nav with a real Home, mirrors HQ density.
- Cosmetic rebrand → still happens, but last, and most of it is already done (tokens.css already mirrors HQ).

What stays the same:

- Architecture (Next.js 16, Tailwind v4, shadcn/ui, Drizzle, Postgres, better-auth).
- Domain vocabulary (artist / set / stage / lineup / advance / rider / promoter).
- Festival-Day mode (the live-ops UI). Will become per-festival, not global.
- AI features (rider parsing, flight parsing).
- No code, no DB, no auth shared with `~/Desktop/greenroom`.

Aegis Festival remains the **anchor customer / first tenant**, not the product name. Existing seed data stays — it gets migrated into the first workspace's first festival.

---

## 2. Naming model — read carefully

Four levels now. Don't conflate them.

| Level                  | Old                             | New                          | Where it appears                                                                                                                               |
| ---------------------- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**            | "Aegis System"                  | **GreenRoom Stages**         | Marketing copy, login, app header, package.json `description`, README, AGENT.md, all docs                                                      |
| **Codebase / repo**    | `aegis-system`                  | `greenroom-stages` (Phase 8) | Folder name, `package.json` `name`, GitHub repo, Vercel project                                                                                |
| **Workspace**          | (didn't exist)                  | user-named on signup         | A team's container — owns 1+ festivals. Aegis Festival's workspace will be seeded as **"Aegis Productions"** (Eli to confirm name in Phase 0). |
| **Festival** (project) | "Aegis Festival 2026" hardcoded | user-created per festival    | The actual editions a workspace runs. Aegis Festival's existing data becomes the first festival in the Aegis workspace.                        |

Casing: **`GreenRoom`** — one word, capital G, capital R. Never `Greenroom`, `greenroom`, `Green Room`.

Replacements (case-sensitive, surgical):

```
Aegis System         → GreenRoom Stages
aegis-system         → greenroom-stages
the Aegis ops        → the GreenRoom Stages
```

Do NOT replace:

```
Aegis Festival       (the customer's festival name — stays as data)
booking@aegisfestival.com  (until Phase 0 wipes hardcoded OWNER_EMAIL)
aegisfestival.com    (their domain — keep where it refers to them)
```

---

## 3. Data model deltas

The current schema is in `src/db/schema.ts`. These are the deltas. Drizzle migrations are committed under `drizzle/` — every schema change ships with a generated migration.

### 3.1 New tables

```ts
// Identity & containers ----------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g. "Aegis Productions"
  slug: text("slug").notNull().unique(), // url-safe handle
  ownerUserId: text("owner_user_id").notNull(), // primary owner; cannot be removed
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// Stages-per-festival (replaces global stages table) ----------------------

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    festivalId: uuid("festival_id")
      .notNull()
      .references(() => festivals.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "Main Stage"
    slug: text("slug").notNull(), // unique per festival, not global
    color: text("color"), // hex
    capacity: integer("capacity"),
    // Days this stage is active. Stored as date[] in the festival's range.
    // Slot creation is constrained to these dates.
    activeDates: jsonb("active_dates").notNull().default([]), // string[] (YYYY-MM-DD)
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [unique().on(t.festivalId, t.slug)],
);
```

### 3.2 Renames + restructure

**`festival_editions` → `festivals`.** Drop `year` unique constraint. Add workspace + slug + description + tenantBrand JSONB.

```ts
export const festivals = pgTable(
  "festivals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // url-safe, unique per workspace
    name: text("name").notNull(), // "Aegis Festival 2026"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    location: text("location"),
    description: text("description"),
    // Tenant brand (logos, palette, contact) used on customer-facing exports
    // only. App chrome stays GreenRoom emerald. See §6.
    tenantBrand: jsonb("tenant_brand"),
    festivalModeActive: boolean("festival_mode_active")
      .notNull()
      .default(false),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.workspaceId, t.slug)],
);
```

**`slots`** loses `day` enum, gains `date`:

```ts
// Was: day: stageDayEnum("day").notNull()  // friday/saturday/sunday
// Now:
date: date("date").notNull(),                  // YYYY-MM-DD within festival range
```

Drop `stageDayEnum` once migration completes.

### 3.3 Scope every tenant table

Add `workspaceId` (nullable during migration, then NOT NULL after backfill) to:

- `artists`, `crew`, `slots`, `sets`, `flights`, `vendors`, `ground_transport_pickups`, `hotels`, `hotel_room_blocks`, `hotel_bookings`, `invoices`, `payments`, `contracts`, `riders`, `documents`, `guestlist_entries`, `audit_events`.

Tables that already reference a `festival_id` (renamed from `edition_id`) only need to _follow_ the festival's workspace transitively — they do NOT need their own `workspaceId`. Confirm in Phase 0: which tables get direct vs. transitive scoping. Default rule: if the table's parent has `workspaceId`, don't duplicate; if a row can exist without a festival (e.g. workspace-level vendors, hotels, contract templates), put `workspaceId` on it directly.

`hotels` and `vendors` are workspace-scoped (a hotel doesn't belong to a single festival — you reuse it year over year).

`stages` are festival-scoped (per §3.1).

### 3.4 Team members — port HQ model + add festival scope

Current `team_members` is unused. Replace its enum and add fields:

```ts
export const teamRoleEnum = pgEnum("team_role", [
  "owner", // co-owner; full access; cannot remove primary
  "admin", // settings + team invites; no billing/destructive ops
  "member", // edit operational data; no money/settings/team
  "viewer", // read-only across allowed scope
]);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id"), // null until invite accepted
    email: text("email").notNull(),
    name: text("name"),
    role: teamRoleEnum("role").notNull(),
    status: teamMemberStatusEnum("status").notNull().default("pending"),
    permissions: jsonb("permissions").notNull().default({}), // sparse override map
    // null = all festivals in the workspace; otherwise a string[] of festival UUIDs.
    // Mirrors HQ's artistScope pattern.
    festivalScope: jsonb("festival_scope"),
    inviteToken: text("invite_token").unique(),
    invitedAt: timestamp("invited_at").notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.workspaceId, t.email)],
);
```

### 3.5 Permissions library

Port HQ's `src/lib/permissions.ts` pattern. Keys are domain-shaped for festivals:

```
lineup.view         lineup.edit         lineup.publish
artists.view        artists.edit        artists.delete
crew.view           crew.edit           crew.delete
flights.view        flights.edit
hotels.view         hotels.edit
ground.view         ground.edit
riders.view         riders.edit
contracts.view      contracts.edit      contracts.send
payments.view       payments.edit
guestlist.view      guestlist.edit
documents.view      documents.upload
festival.settings   festival.create     festival.delete
workspace.settings  workspace.team
```

Note: no `workspace.billing` key. Beta is free; billing isn't wired this year (decision §9.1). Add the key later if/when a paid tier exists.

Role defaults:

- **Owner**: every key true.
- **Admin**: every key true except `festival.delete`.
- **Member**: `*.view` + `*.edit` on operational data. False on `payments.*`, `contracts.send`, `festival.*`, `workspace.*`.
- **Viewer**: `*.view` only. False on every `*.edit` / `*.send` / etc.

Override map per member follows HQ's GitHub-style toggle pattern. UI groups permissions for legibility (see HQ `PERMISSION_GROUPS`).

---

## 4. Phase order — restated

Old plan was Phase A → D, all cosmetic. New plan is Phase 0 → 8, with the rebrand at the back.

**One phase per PR. `npm run check` green before each commit. Single PR per phase.**

Commit format: `feat(stages): phase-N-<slug>` (e.g. `feat(stages): phase-0-workspaces`).

### Phase 0 — Workspace foundation + multi-tenant scoping

**Goal:** stop assuming one owner per database.

| File                               | Change                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`                 | Add `workspaces` table. Add `workspaceId` (nullable) to all tenant tables per §3.3. Generate Drizzle migration.                                                                                                                     |
| `src/db/seed.ts` (new or existing) | Seed one workspace **"Aegis Productions"** owned by the existing OWNER_EMAIL user. Backfill `workspaceId` on every existing row to that workspace's id. After backfill, generate a second migration that flips columns to NOT NULL. |
| `src/lib/session.ts`               | Drop `OWNER_EMAIL` shortcut. Resolve session → workspace via team membership. Replace `ownerId` with `workspaceId` on `AppSession`.                                                                                                 |
| `src/lib/auth.ts`                  | No change — better-auth stays.                                                                                                                                                                                                      |
| `src/lib/permissions.ts` (new)     | Port HQ's pattern. Define `ALL_PERMISSIONS`, `ROLE_DEFAULTS`, `resolvePermissions`, `PERMISSION_GROUPS`. Domain keys per §3.5.                                                                                                      |
| API routes                         | Sweep — every route that read `session.ownerId` now reads `session.workspaceId`. Add `requirePermission()` calls at the top of mutating routes.                                                                                     |

**DoD:** New user signs up → no workspace → 403 on any data API. The existing Aegis user logs in → resolved into Aegis Productions workspace, sees all existing data.

### Phase 1 — Festivals as projects

**Goal:** support multiple festivals per workspace; kill the hardcoded edition.

| File                         | Change                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`           | Rename `festival_editions → festivals`. Drop `year` unique. Add `workspaceId`, `slug`, `description`, `tenantBrand`. Drop `stageDayEnum`. Add `slots.date`. Make `stages` festival-scoped + add `activeDates`. |
| Migrations                   | Two migrations: (a) rename + add columns nullable + backfill from existing edition data; (b) drop legacy columns + flip new ones to NOT NULL.                                                                  |
| `src/lib/edition.ts`         | Delete. Replaced by `src/lib/festivals.ts` which exports `getActiveFestival(session)` reading the festival selector cookie + falling back to first festival in scope.                                          |
| `src/lib/festivals.ts` (new) | `getActiveFestival(session)`, `setActiveFestival(festivalId)`, `listFestivals(session)`. All respect `festivalScope`.                                                                                          |
| API routes                   | Every route currently calling `getCurrentEdition()` switches to `getActiveFestival(session)`. Routes get a `festivalId` from the request or fall back to active.                                               |
| `src/db/seed.ts`             | The migrated Aegis Productions workspace gets one festival "Aegis Festival 2026" with the existing dates (Aug 14–16). The 4 stages move under it with `activeDates` covering the full window.                  |

**DoD:** Two festivals can coexist in the same database. Switching the cookie changes which festival the dashboard is bound to. The existing data is unchanged in terms of what the app shows.

### Phase 2 — Onboarding + festival creation

**Goal:** sign up → create workspace → create festival → land in the app.

| File                                          | Change                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/sign-up/page.tsx`                    | After `signUp.email()`, redirect to `/onboarding/workspace` instead of `/lineup`.                                                                       |
| `src/app/onboarding/workspace/page.tsx` (new) | Form: workspace name. Submit → POST `/api/workspaces` → redirect to `/onboarding/festival`.                                                             |
| `src/app/onboarding/festival/page.tsx` (new)  | Form: festival name, start date, end date, location (optional). Submit → POST `/api/festivals` → set active festival cookie → redirect to `/dashboard`. |
| `src/app/api/workspaces/route.ts` (new)       | POST creates workspace, makes user owner, creates a default `team_members` row for them.                                                                |
| `src/app/api/festivals/route.ts` (new)        | POST creates festival in the user's workspace. GET lists festivals in scope. PATCH updates. DELETE soft-archives (only if `festival.delete` perm).      |
| `src/app/(dashboard)/layout.tsx`              | If session has no workspace → redirect to `/onboarding/workspace`. If workspace has no festivals → redirect to `/onboarding/festival`.                  |
| Empty states                                  | Pages that depend on the active festival render an empty state when `getActiveFestival()` returns null. Today they'd 500.                               |

**DoD:** A brand-new email creates an account, names a workspace, names a festival with start+end dates, and arrives at a populated dashboard. No 500s, no hardcoded data.

### Phase 3 — Team page + invites (no Resend)

**Goal:** Owner/Admin can invite team members and see + manage them.

| File                                             | Change                                                                                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/team/route.ts` (new)                | GET lists members in workspace. POST creates pending invite (returns `inviteUrl`). Email send is **omitted** — no Resend call in this route. The UI surfaces the invite URL via copy-link, like HQ already does. |
| `src/app/api/team/[id]/route.ts` (new)           | PATCH updates role / permissions / festivalScope. DELETE removes member.                                                                                                                                         |
| `src/app/api/team/invite/[token]/route.ts` (new) | Accepts the invite for the current logged-in user. Sets `userId`, `acceptedAt`, status=`active`.                                                                                                                 |
| `src/app/invite/[token]/page.tsx` (new)          | Shows invite details (workspace name, role). If signed in → "Accept" button → POST. If not → sign-up flow that prefills email and continues to accept.                                                           |
| `src/app/(dashboard)/settings/page.tsx`          | Tabbed Settings (Workspace / Festival / Team). Port HQ's `MemberCard`, `InviteForm`, permission group editor. Workspace-level settings (name, logo). Festival-level settings (name, dates, stages — Phase 4).    |
| `src/lib/email.ts`                               | New file as a _placeholder_: exports `sendInviteEmail()` as a no-op. Wire-up exists for when Resend is enabled later, but Phase 3 does not call it.                                                              |
| `src/components/ui/permission-gate.tsx` (new)    | Port HQ's gate component for hiding UI based on perm keys.                                                                                                                                                       |

**DoD:** Owner clicks "Invite member", picks role + scope, gets a copy-link in the UI. Pasting the link in a new browser → sign up flow → land in the workspace as that role. Removing a member revokes immediately.

### Phase 4 — Festival settings page (customizable like HQ Agency Settings)

**Goal:** festival is a real, editable project — not a row of hardcoded constants.

| File                                           | Change                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/(dashboard)/settings/page.tsx`        | "Festival" tab: name, dates (start/end), location, description. Save updates `festivals` row.                                                                      |
| Stages section in the Festival tab             | Add/edit/delete stages per festival. Per stage: name, color (hex picker + presets), capacity, **active dates** (multi-select chips of dates in festival window).   |
| `src/app/api/stages/route.ts`, `[id]/route.ts` | CRUD scoped to `festivalId`. PATCH supports `activeDates`.                                                                                                         |
| `src/app/api/festivals/[id]/route.ts`          | Already from Phase 2. Make sure date changes ripple — if start date moves, surface a warning if any slot dates fall outside the new range.                         |
| `src/lib/branding/aegis-festival.ts`           | Stays — but now the data lives on `festivals.tenantBrand` JSONB, and this file becomes a fallback for the seeded Aegis row only. New tenants don't read this file. |
| Slot creation guards                           | Slot creation blocked if its date is not in the chosen stage's `activeDates`.                                                                                      |

**DoD:** Eli can rename "Aegis Festival 2026" to anything, change dates, add a 5th stage that runs only on Day 2. Nothing in the codebase still hardcodes a stage list, a date, or a festival name.

### Phase 5 — T-date fix + topbar switcher

**Goal:** the top of the page reflects the selected festival, not a literal.

| File                                                   | Change                                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/dashboard/Topbar.tsx`                  | Take `festival` (or null) as a prop. T-date is `differenceInCalendarDays(festival.startDate, today)`. Hide the chip if `!festival`.                                                               |
| `src/components/dashboard/FestivalSwitcher.tsx` (new)  | Dropdown next to T-date in topbar. Lists festivals in scope, current one checked. Switch sets the active-festival cookie + reloads. Includes "+ New festival" item if user has `festival.create`. |
| `src/components/dashboard/WorkspaceSwitcher.tsx` (new) | Sibling dropdown left of the festival switcher, only rendered when the user belongs to >1 workspace.                                                                                              |
| `src/app/(dashboard)/layout.tsx`                       | Reads active festival once on the server, passes to topbar.                                                                                                                                       |
| `src/lib/festivals.ts`                                 | `setActiveFestival()` writes a cookie scoped to the workspace.                                                                                                                                    |

**DoD:** Topbar shows "T-N days" for the current festival. Clicking the switcher swaps to a different festival; T-date and all data update. With no festival selected, the chip disappears (graceful, not crashy).

### Phase 6 — UI simplicity sweep

**Goal:** match HQ's density. Today: 16 nav items, no Home page. Target: ~7 nav items, real Home.

| File                                                   | Change                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/dashboard/Sidebar.tsx`                 | Collapse 11 planning items + 5 festival items into a leaner set: **Home / Lineup / People / Travel / Money / Library / Settings** (7). Festival-mode toggles a different sub-rail (or replaces the planning items as today). People = Artists + Crew. Travel = Flights + Hotels + Ground. Money = Payments + Invoices + Contracts. Library = Documents + Riders + Guestlist. |
| `src/app/(dashboard)/(home)/page.tsx` (new)            | Real Home: festival summary (T-date, stage count, artist count), upcoming flights, payments due, recent activity, AI-generated daily brief. Mirror HQ's `dashboard/page.tsx` shape, festival vocabulary.                                                                                                                                                                     |
| `src/app/(dashboard)/people/page.tsx` (new index)      | Tabbed: Artists / Crew. Existing `/artists` and `/crew` redirect under here.                                                                                                                                                                                                                                                                                                 |
| `src/app/(dashboard)/travel/page.tsx` (new index)      | Tabbed: Flights / Hotels / Ground. Existing routes nest.                                                                                                                                                                                                                                                                                                                     |
| `src/app/(dashboard)/money/page.tsx` (new index)       | Tabbed: Payments / Invoices / Contracts.                                                                                                                                                                                                                                                                                                                                     |
| `src/app/(dashboard)/library/page.tsx` (new index)     | Tabbed: Documents / Riders / Guestlist.                                                                                                                                                                                                                                                                                                                                      |
| Empty states                                           | Re-audit. Less prose. One-line state + single CTA. Match HQ.                                                                                                                                                                                                                                                                                                                 |
| `src/components/layout/{Page,Section,Stack}.tsx` (new) | Port HQ's layout primitives so every page has the same gutter/section spacing.                                                                                                                                                                                                                                                                                               |

**DoD:** Sidebar has 7 items. Home shows real numbers. Empty states aren't paragraphs. A user who's seen HQ recognizes the density.

### Phase 7 — Brand + copy sweep (was Phase A–D)

**Goal:** the cosmetic rebrand. Smaller now because tokens.css is already aligned.

| Subphase              | Files                                                                                                                                               | Change                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7A — package metadata | `package.json`, `vercel.json`, `.env.example`                                                                                                       | `"name": "aegis-system"` → `"greenroom-stages"`. Description: "GreenRoom Stages — festival & live-event operations. Part of the GreenRoom HQ family."                                                                                            |
| 7B — agent docs       | `AGENT.md`, `CLAUDE.md`, `HANDOFF.md`, `SETUP.md`, `TASKS.md`, `docs/BRAND.md`, `docs/DATA-MODEL.md`, `docs/FESTIVAL-DAY.md`, `docs/AI-FEATURES.md` | Title + intros. Reframe sister-project as "sister product in the same brand family." `docs/BRAND.md` already references HQ tokens — verify and re-lock. `docs/DATA-MODEL.md` rewritten to match the new schema (workspaces, festivals, scoping). |
| 7C — UI strings       | `src/app/layout.tsx`, sign-in, sign-up, app header, `public/` favicons                                                                              | `<title>`, default metadata, header wordmark, favicon. Replace any leftover Aegis-branded strings outside customer-facing exports.                                                                                                               |
| 7D — copy review      | Sweep src/ + docs/                                                                                                                                  | "the festival's ops backend" → "the operations layer for live events." "Aegis Festival staff" → "operators." Don't sweep tenant data.                                                                                                            |

`grep -rn "Aegis " src/ docs/ *.md *.json | grep -v "Aegis Festival"` returns nothing at the end of Phase 7.

### Phase 8 — Repo + folder rename (out-of-band, Eli does this manually)

After Phase 0–7 land on `main` and CI is green:

```bash
# 1. GitHub: Settings → Repository name → rename `aegis-system` → `greenroom-stages`.
#    GitHub auto-redirects the old URL.

# 2. Update local remote
cd ~/Desktop/aegis-system
git remote set-url origin git@github.com:Eli-GreenRoom/greenroom-stages.git
git remote -v

# 3. Rename local folder
cd ~/Desktop
mv aegis-system greenroom-stages
cd greenroom-stages
git status

# 4. Vercel: rename project `aegis-system` → `greenroom-stages` (Settings → General).
#    Re-link if needed: vercel link
```

Then update `~/Desktop/greenroom/AGENTS.md` and `~/Desktop/greenroom/CLAUDE.md` to reference `~/Desktop/greenroom-stages`.

---

## 5. Brand swap status

`src/styles/tokens.css` was already updated to the GreenRoom HQ palette (emerald `#34d399` on near-black `#0a0a0b`, Geist, rounded-md). That work is **done** and shipped. Phase 7 is mostly metadata + strings + docs, not a token rewrite.

Audit during Phase 7C — grep for stragglers:

```bash
grep -rn "#e5b85a\|#e73e54\|#16d060\|#1b0e5c\|#150a48\|#0e0e10\|#15151a\|#ececee" src/ \
  | grep -v "src/lib/branding/aegis-festival.ts" \
  | grep -v "docs/BRAND.md"
```

Aegis brand colors are legitimate ONLY inside `src/lib/branding/aegis-festival.ts` (tenant brand data) and `docs/BRAND.md` (reference). Any other hit gets replaced with `var(--color-...)` tokens.

The 4 stage colors currently in `src/lib/edition.ts` (`#E5B85A`, `#7C9EFF`, `#A78BFA`, `#F472B6`) move into seed data on the migrated Aegis stages. New stages get colors picked by the operator in Phase 4's stage editor.

---

## 6. Tenant brand scope (locked)

Same as old plan §3. App chrome is GreenRoom Stages emerald for everyone. Aegis brand book is **only** for customer-facing exports (PDFs, itinerary links, contracts, marketing collateral the festival sends out). No in-app theme switcher.

What changes in this plan: the per-festival tenant brand now lives on `festivals.tenantBrand` JSONB (logos, hex codes, signature line, contact). Templates that render exports look up the active festival's tenantBrand. The Aegis seed data populates this field from `src/lib/branding/aegis-festival.ts` once during migration.

---

## 7. Type system + tone — same as HQ

Unchanged from old plan §4 + §7:

- Next.js 16 App Router. Tailwind v4 + shadcn/ui. Geist Sans + Geist Mono.
- `rounded-md` (8px) only. No `rounded-xl` / `rounded-2xl`.
- Dark-first. No emoji. No exclamation marks in UI copy.
- Money in cents. Display dates DD/MM/YYYY. Tabular numerals on time/money/IDs.
- Error messages explain what failed and what to do, in 1–2 sentences.

Vocabulary: keep festival vocab (artist / set / stage / lineup / advance / rider / promoter). Add **workspace** and **festival** at the structural level. Don't import HQ's "gig / booking" — wrong domain.

---

## 8. Definition of done — per phase

| Phase | DoD                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | New user signup gets a 403 from data APIs until they have a workspace. Aegis user, after migration, sees all existing data unchanged. `npm run check` green. Migration is idempotent. |
| 1     | Two festivals can coexist; switching them swaps what the dashboard shows. The Aegis seed festival has all 4 stages with correct `activeDates`.                                        |
| 2     | A brand-new email becomes a populated dashboard in three forms: account → workspace name → festival name + dates. No 500s anywhere when no festival exists.                           |
| 3     | Owner can invite, role-pick, and copy-link. Accepting on a fresh browser drops the user into the workspace. Permission gates prevent unauthorized actions in both UI and API.         |
| 4     | Eli renames "Aegis Festival 2026" to "Aegis Festival 2027", changes dates, adds a 5th stage that's only active on Day 2. Slot creation respects per-stage active dates.               |
| 5     | Topbar T-date matches the active festival's start. Festival switcher works. With no festival, the chip is hidden, not broken.                                                         |
| 6     | Sidebar at 7 items. Real Home page with KPIs. Empty states one-line + CTA. Density mirrors HQ.                                                                                        |
| 7     | `grep -rn "Aegis " src/ docs/ *.md *.json \| grep -v "Aegis Festival"` returns nothing. App header reads "GreenRoom Stages." Email From-name updated.                                 |
| 8     | Repo, folder, Vercel project all renamed. HQ docs reference the new path.                                                                                                             |

---

## 9. Decisions on previously-open questions

Resolved 2026-05-10:

1. **Workspace billing.** Beta is **free**. No billing this year. `workspace.billing` perm is **dropped** from v1 (see §3.5). Revisit when a paid tier ships.
2. **SSO / shared identity with HQ.** Stays no. Separate accounts, separate `better-auth` instances. Reopen only if a customer asks.
3. **Marketing site.** Deferred. No `/marketing` route in this app. Revisit after Phase 7 lands.
4. **Stage colors palette.** Phase 4 stage editor needs a default color list. Use Aegis's 4 (`#E5B85A`, `#7C9EFF`, `#A78BFA`, `#F472B6`) as presets, plus GreenRoom emerald `#34d399`, plus 2–3 more (likely amber `#fbbf24`, red `#f87171`, slate `#64748b`). Lock the final list when Phase 4 ships.
5. **Domain strategy.** `logistics.aegisfestival.com` stays as the Aegis tenant URL. Marketing domain (`greenroomstages.com` vs `stages.greenroomhq.net`) deferred — picked before Phase 7 launches public, not before then.

Net effect on the plan: Phase 0 ships without `workspace.billing` in the perm list. Phase 4 stage editor can hardcode the proposed 8-color preset list and call it locked. No `/marketing` route in any phase.

---

## 10. Hard separation from `~/Desktop/greenroom`

Same as old plan §10. Reproduced verbatim:

- **No shared code.** Don't extract a "shared UI kit" repo. If a button looks the same in both, they're independently identical — that's fine.
- **No shared database.** Different Neon projects, different schemas. The two products do not know each other exist at runtime.
- **No shared auth.** Each product has its own `better-auth` instance and its own user table. No SSO yet.
- **Same brand.** Tokens copied, not imported. If HQ changes its emerald hex tomorrow, Stages is not auto-updated — it's a manual sync.
- The only legitimate cross-repo activity right now is: looking at `~/Desktop/greenroom` for _patterns_ when stuck. Don't modify it from this repo's session.

If a future need (SSO, shared billing, customer-account linking) makes the strict separation untenable, **stop and raise it with Eli before crossing the line.**

---

## 11. How to run this with Claude Code

```bash
cd ~/Desktop/aegis-system
git status   # clean

claude
```

In the Claude Code session:

> Read GREENROOM_STAGES_PLAN.md and AGENT.md. Propose the diff for Phase 0 only (workspace foundation + multi-tenant scoping). Wait for my approval before editing.

Phase 0 → review diff → approve → migration runs locally → `npm run check` → commit → push.
Then Phase 1 → 2 → 3 → 4 → 5 → 6 → 7. One phase per PR.

When all eight phases land, archive this file to `docs/PLAN-COMPLETE.md` so it's preserved as project history without cluttering the root.

---

## Changelog vs. old plan

- Old plan was 4 cosmetic phases (A–D). New plan has 8 phases; cosmetic work is now Phase 7 (smaller, since tokens are already aligned).
- Added Phase 0 (workspaces), 1 (festivals), 2 (onboarding), 3 (team), 4 (festival settings), 5 (T-date + switcher), 6 (UI sweep).
- Moved repo rename to Phase 8 (was Phase A.5).
- Decisions added 2026-05-10: workspace hierarchy, 4 roles, forced onboarding, per-festival scope, topbar switcher, per-stage active dates, no Resend in Phase 3.
- Old `GREENROOM_STAGES_REBRAND.md` is superseded — keep until Phase 7 is merged, then delete.
