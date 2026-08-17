---
name: progress-log-entry
description: Use immediately after finishing any code, prompt, or config change in this repo (backend, frontend, scripts, nginx, or directives) — before calling the work "done." Writes a compliant PROGRESS.md entry with session ID, verification evidence, and files touched, per the CLAUDE.md hard gate. Do NOT use for Mandrill sends, Basecamp tickets, ad-hoc data pulls, memory writes, or dry-run output that doesn't ship — those are explicitly excluded from PROGRESS.md. Do NOT use mid-task to log intent; only once the change is actually verified (test passed, tsc clean, or user confirmed).
---

# Progress Log Entry

## Scope — when this skill applies

- **Triggers:** a code/prompt/config change in `/backend`, `/frontend`, `/scripts`, `/nginx`, or `/directives` has just been completed and verified.
- **Does not trigger for:** emails sent, Basecamp tickets created, data pulls, memory file writes, or discovery scripts that don't ship code. See CLAUDE.md's "What does NOT go in PROGRESS.md" list.
- **Do not invoke before verification exists.** No test result, `tsc` pass, deploy confirmation, or user confirmation yet means this skill isn't ready to run — go get that evidence first.

## 1. Confirm a Session ID exists

- If this session hasn't minted one yet, generate `CC-<YYYYMMDD>-<4 random alphanumerics>` now, using today's date. Never reuse an ID already present in PROGRESS.md.

## 2. Re-read the tail of PROGRESS.md immediately before writing

- Other Claude instances may be writing to this file concurrently. Read the last ~20 lines fresh — do not rely on an earlier read from this session.
- Append after the current last line. Never anchor the edit on stale content.

## 3. Gather the required fields

- **Task name** — the checklist item this change belongs to (create one if none exists).
- **Date** — today, `YYYY-MM-DD`.
- **Session** — this session's ID.
- **What changed** — one line, plain language.
- **Verification** — a concrete artifact only: test name, deploy URL, `"user confirmed"`, or `"TypeScript passes"`. Never intent ("should work") or a plan to verify later.
- **Notes** — only if there's a blocker, deviation, or non-obvious decision. Omit otherwise.

## 4. Write the entry

```markdown
- [x] <task name>
  - Date: YYYY-MM-DD
  - Session: CC-<YYYYMMDD>-<id>
  - What changed: <one line>
  - Verification: <test name | deploy URL | "user confirmed" | "TypeScript passes">
  - Notes: <only if blocker, deviation, or non-obvious decision>
```

## 5. Commit scope check

- Confirm the same commit touching `/backend`, `/frontend`, `/scripts`, `/nginx`, or `/directives` also stages this PROGRESS.md edit. If it doesn't, the change is incomplete per CLAUDE.md's Definition of Done.
