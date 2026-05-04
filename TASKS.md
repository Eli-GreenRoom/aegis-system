# Aegis System — Tasks

> Living task board. Move items Now → Done with the date when finished.
> Read in tandem with `HANDOFF.md` for the strategic phase view.

---

## Now

- [ ] Phase 0 setup — see `SETUP.md`
- [ ] Phase 1.1 — wire better-auth (email + password)
- [ ] Phase 1.2 — generate first migration, run against Neon
- [ ] Phase 1.3 — dashboard layout shell (left rail, top bar, brand tokens)

## Next

- [ ] Phase 2 CRUD modules — Artists, Crew, Stages/Slots/Sets, Flights, Hotels,
      Ground, Payments, Riders, Contracts, Guestlist, Documents
- [ ] Phase 3 import script `scripts/import-2024.ts`

## Later

- [ ] Phase 4 AI parsers
- [ ] Phase 5 festival-day mode
- [ ] Phase 6 Cmd+K agent
- [ ] Phase 7 polish + comms

---

## Done

(empty — log entries here as `- 2026-MM-DD — short description`)

---

## Decisions log

- 2026-05-04 — stack locked: Next.js 16 + Neon + Drizzle + better-auth + Vercel
  Blob + Resend + Anthropic. Mirrors greenroom for cross-pollination.
- 2026-05-04 — auth scope: owner + coordinator + viewer roles. Single tenant.
- 2026-05-04 — AI flow: upload-and-parse, not Gmail OAuth. Operator confirms
  every parse before write.
- 2026-05-04 — domain: `logistics.aegisfestival.com`.
- 2026-05-04 — region: Neon `eu-central-1` (Frankfurt) for proximity to Lebanon.
- 2026-05-04 — brand accent: `#E5B85A` (warm gold). No cyan, no neon green.
