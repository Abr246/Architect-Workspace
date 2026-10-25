# STORY-014 — View all bookings

As a business owner or operator, I want to see every booking that has been made,
so that I know who has booked what without relying on the one-time confirmation
message a customer sees at the moment they book.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-002 (bookings must exist to list), STORY-011 (trust spine this list is a customer-facing view onto)

## The requirement this satisfies

- **REQ-019** (Functional, must) — The system must let staff view every booking that has been made, including who made it, which field, and its status.

## How to build it

Expose the booking domain's existing `listBookings()` accessor (already used
internally by analytics) over a new `GET /api/bookings` route, and add an "All
bookings" page that fetches it, joins each booking's `fieldId` against
`/api/fields` for a readable field name, and renders a sortable-by-recency
table. No real-time push (websockets, SSE) exists in this system, so this
page polls every 5 seconds in the background for "did anything change,"
plus a manual Refresh button for an immediate, explicit check.

## Failure paths you must handle

- The bookings list fails to load (network/server error) — show an error, not a blank page.
- No bookings exist yet — show a clear empty state, not a blank table.
- The list goes stale between refreshes and nobody notices — mitigated by a 5-second background poll plus an explicit, always-visible Refresh button.
- A background poll fails (transient network blip) and wipes out an already-good list with an error page instead of just trying again next tick.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given at least one booking has been made, when staff open the "All bookings" page, then they see each booking's field, customer name, start/end time, and status.
- [x] Given no bookings have been made yet, when staff open the page, then they see a clear empty state rather than a blank page.
- [x] Given the bookings list fails to load, when staff open the page, then they see an error message rather than a silent blank page.
- [x] Given a new booking is made elsewhere in the app, when staff click Refresh on this page, then the new booking appears in the list.
- [x] Trust: every booking shown on this page comes from the same `listBookings()` accessor already used by analytics — one source of truth, not a second copy that could drift.
- [x] Given a booking is made elsewhere while staff have this page open, when 5 seconds pass, then the new booking appears in the list without any manual action.
- [x] Given a background refresh fails, when staff are looking at the page, then the last-known-good list stays visible rather than being replaced by an error page.

When every box above is ticked, stop and show the demo.
