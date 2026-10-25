# STORY-015 — View customer interactions (questions and help requests)

As a business owner or operator, I want to see every question customers have
asked the assistant and every help request they've submitted, so that I know
what customers are asking and how it was handled, instead of that history
existing only in server logs nobody looks at.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-003 (assistant questions), STORY-009 (get-help issue handling), STORY-011 (trust spine this view is a customer-facing window onto)

## The requirement this satisfies

- **REQ-020** (Functional, must) — The system must let staff view every question asked through the assistant and every help request submitted, including its outcome.

## How to build it

Widen the existing `GET /api/audit-trail` route to accept an optional
`entityType` filter (it already only supported `entityId`), so a staff page
can ask for "every `ai_interaction`" and "every `customer_issue`" directly
instead of scanning the whole trail client-side. Build a "Customer
interactions" page with two sections:

- **Questions asked** — every `ai_interaction` audit entry (from "Ask a
  question"): who asked, the question, the answer, and whether the assistant
  understood it.
- **Help requests** — every `customer_issue` audit entry that carries the
  original submission (`customerServiceService` always includes an `issue`
  field; the *later* human-decision entry `escalationsService` writes for
  the same id does not, and must be excluded rather than shown as a second
  row for the same request). For requests that got escalated, join the
  entry's `escalationId` against `GET /api/escalations` (no status filter,
  so decided ones show up too, not just pending) to show its live outcome:
  resolved by AI, pending review, approved, or denied.

Same 5-second background-poll pattern as STORY-014's "All bookings" page,
plus a manual Refresh button.

## Failure paths you must handle

- The audit trail or escalations fail to load — show an error, not a blank page.
- Nothing has happened yet — show a clear empty state for each section, not a blank table.
- A background poll fails — the last-known-good lists stay on screen rather than being replaced by an error page.
- The human-decision audit entry for an already-escalated request is mistaken for a second, separate help request.
- An escalated request's escalation record can't be found (defensively falls back to "pending" rather than crashing or showing nothing).

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given at least one question has been asked, when staff open "Customer interactions", then they see who asked it, the question, the answer, and whether it was understood.
- [x] Given at least one help request has been submitted and resolved instantly by the AI, when staff open the page, then it appears with an outcome of "Resolved by AI".
- [x] Given a help request was escalated to a human, when staff open the page, then it appears exactly once, showing its current status (pending, approved, or denied) rather than being duplicated by the later decision record.
- [x] Given nothing has happened yet, when staff open the page, then they see a clear empty state for each section rather than a blank page.
- [x] Given the page fails to load, when staff open it, then they see an error message rather than a silent blank page.
- [x] Given a new question or help request is submitted elsewhere, when 5 seconds pass, then it appears without any manual action.
- [x] Trust: every row on this page comes from the existing audit trail and escalations accessors — no second, parallel record of customer interactions was created.

When every box above is ticked, stop and show the demo.
