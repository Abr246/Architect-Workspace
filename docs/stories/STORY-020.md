# STORY-020 — Scheduling issues conflict center

As a facility manager, I want the Scheduling Issues page to actually show and
let me resolve conflicts, so that "Scheduling issues" in the nav leads
somewhere useful instead of a single static sentence.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-012 (scheduling issue detection), STORY-014 (all-bookings accessor)

## The requirement this satisfies

- **REQ-024** (Functional, must) — The system must let managers see and resolve scheduling conflicts from a dedicated conflict-center page, using only existing booking and field data.

## How to build it

User asked for a dashboard-style conflict center: 4 summary cards, issue
cards with a resolve action, a resolve modal showing both conflicting
bookings with 4 resolution choices, a status filter, and a proper empty
state — explicitly no new backend functionality and no regressions to
existing behavior.

Confirmed both backend capabilities already existed and were already
tested before writing any frontend code: `GET /api/scheduling-issues`
already returns every issue when called with no `status` query param
(`listSchedulingIssues(statusParam as SchedulingIssueStatus | undefined)`),
and `POST /api/bookings/:id/cancel` already existed from STORY-002, just
unused by any frontend code until now. This meant the entire feature
shipped as frontend-only — confirmed afterward via `git status --short
backend` showing zero new backend changes.

Discovered, while building the resolve modal, that the "second" booking in
a conflict was never actually real: `bookingsService.createBooking()`
throws `BookingConflictError` and does not insert a row when a conflict is
detected, so only the original (`details.conflictingBookingId`) booking
exists in the database. The modal shows the requester's name/time
honestly labeled "(requested, never created)," sourced from the issue's
own `details`, and all four resolution actions operate on the one real
booking.

Built "Change booking time" and "Move to another field" as cancel-then-
recreate using the two already-existing, already-tested endpoints
(`cancelBooking` + `createBooking`) rather than a new "reschedule"
endpoint — reusing the exact slot-grid component logic
(`frontend/src/utils/timeSlots.ts`) already proven in `BookingForm.tsx`
and `FieldDetailsPage.tsx`. Handles partial failure honestly: if the
cancel succeeds but the recreate fails (e.g. the new slot is itself
conflicted), the modal reports exactly that and does not call
`resolveIssue`, leaving the issue open rather than silently losing the
original booking.

Made "Field Conflicts" an honest, genuinely different metric from "Double
Bookings" rather than a duplicate of the same count: since this system
only detects one real conflict type, "Double Bookings" counts open issues
and "Field Conflicts" (labeled "Fields Affected" in the UI) counts
distinct field IDs among them — the same real data, viewed two true ways,
instead of two cards showing the same number. "Maintenance Conflicts" is
shown as a real, honest 0 and its filter always returns an empty list,
since no maintenance concept exists anywhere in the data model — the same
call made for field status (STORY-017) and field ratings (STORY-018).

Deleted `SchedulingIssueCard.tsx`, fully superseded by the new issue-card
markup and `ResolveIssueModal.tsx`.

## Failure paths you must handle

- No open issues exist — the page must show the celebratory empty state ("All schedules look good"), not a blank page or the literal old sentence.
- Issues exist but none match the active filter — a simpler "No issues match this filter" message, distinct from the full empty state.
- The conflicting booking looked up by `conflictingBookingId` cannot be found (already cancelled, data inconsistency) — the mutating actions (cancel/reschedule/move) must disable themselves and explain why, while "Mark as resolved" still works.
- Cancelling the real booking fails (already gone, invalid state) — stop there; do not attempt to create a replacement booking or call resolve.
- The booking is cancelled but recreating it at the new time/field fails (e.g. a new conflict) — report the partial failure honestly ("cancelled, but rebooking failed... please rebook manually") instead of silently resolving the issue or losing the original booking.
- Resolving the issue itself fails server-side — show the error and keep the issue open and the modal visible, not a false success.
- Loading issues/bookings/fields fails — show a clear error state, not a crash or an empty conflict center that looks like "no issues."

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given no scheduling issues exist, when the manager opens the page, then a celebratory empty state is shown ("All schedules look good" / "No scheduling conflicts require your attention right now." / "All fields are currently scheduled without conflicts."), not the old static sentence.
- [x] Given open and/or resolved issues exist, when the manager opens the page, then the 4 summary cards (Active Issues, Double Bookings, Field Conflicts, Maintenance Conflicts) show real, honestly-derived counts.
- [x] Given an open issue, when it is shown as a card, then it displays the issue type, field name, date/time, the cause, current status, and "View Bookings" / "Resolve Issue" actions.
- [x] Given the manager clicks "View Bookings", when the click registers, then the app navigates to the All Bookings page.
- [x] Given the manager clicks "Resolve Issue", when the modal opens, then it shows both the real conflicting booking and the declined request, and offers change-time, move-field, cancel, and mark-as-resolved actions.
- [x] Given the manager resolves an issue by any action, when it succeeds, then the issue leaves the open list and the modal closes.
- [x] Given the manager filters by All / Double Bookings / Field Conflicts / Maintenance / Resolved, when a filter is selected, then only the matching issues are shown, with Maintenance always empty and Resolved showing only resolved issues.
- [x] Trust: no new backend functionality was added — both the fetch-all-issues and cancel-booking capabilities already existed and were already tested before this story.

When every box above is ticked, stop and show the demo.
