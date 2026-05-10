---
description: Independent code review of the current diff.
---

Use the `reviewer` subagent. Don't propose fixes — produce a punch
list of issues ranked by severity (blocker / nit / nice-to-have).
Pass it the output of `git diff main...HEAD`.
