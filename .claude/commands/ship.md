---
description: Test, format, and draft a PR for the current change
argument-hint: [pr-title]
allowed-tools: Bash(npm --prefix backend test:*), Bash(npm --prefix frontend test:*), Bash(git status:*), Bash(git add:*), Bash(git diff:*)
---

1. Run the test command for whichever side(s) of the repo changed:
   - Backend: `npm --prefix backend test`
   - Frontend: `npm --prefix frontend test -- --watchAll=false`
   If anything fails, STOP and report the failures. Do not continue.
   <!-- WHY: verification is step one, and step one is allowed to say no. -->

2. On green, run `git status` to see exactly which files changed, then
   `git add` those specific files (never `git add -A`).
   <!-- No formatter exists in this repo today: no format script in either
        package.json, no .eslintrc, no prettier config. Nothing invented
        here — this step only stages what step 1 verified. -->

3. Run `git diff --staged`, read it, and draft a PR description titled
   "$ARGUMENTS" with:
   - **Summary** — what changed and why, in 1-3 bullets
   - **Test Evidence** — the actual passing output line(s) from step 1, quoted verbatim
   - **Risk** — blast radius and anything not covered by the tests that just ran
   <!-- WHY: $ARGUMENTS is whatever you type after /ship — the title travels into the body. -->

   This command stops here. It never runs `git commit` or `git push` —
   neither is in allowed-tools, so it is structurally unable to ship
   anything. Shipping is a separate, human-triggered step.
