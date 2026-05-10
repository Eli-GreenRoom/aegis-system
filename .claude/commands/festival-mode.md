---
description: Verify a route works in both planning mode and festival mode.
argument-hint: <route-path>
---

Run the route through both surfaces:

1. Planning mode (default): festivalEditions.festivalModeActive = false.
2. Festival mode: festivalEditions.festivalModeActive = true.

Confirm the route doesn't crash in festival mode and (if it has a UI)
the festival-mode read surface still renders. If the route is read-only
data, festival mode should be a no-op.
