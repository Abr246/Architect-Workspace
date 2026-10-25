# STORY-017 — Facility manager dashboard

As a facility manager, I want an at-a-glance overview when I open the app, so
that I know what's happening today without clicking through six separate
pages.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-001 (fields), STORY-002 (bookings), STORY-004 (approvals), STORY-011 (audit trail), STORY-012 (scheduling issues), STORY-014 (all-bookings accessor), STORY-015 (audit-trail entityType filter)

## The requirement this satisfies

- **REQ-021** (Functional, must) — The system must give facility managers an at-a-glance overview of field availability, today's bookings, pending approvals, scheduling issues, and recent activity.

## How to build it

A new Dashboard page, built entirely on top of accessors that already exist —
`GET /api/fields`, `GET /api/bookings`, `GET /api/escalations` (both the
pending-only and unfiltered variants), `GET /api/scheduling-issues`, and
`GET /api/audit-trail` filtered to `booking`, `scheduling_issue`, and
`customer_issue`. No new backend endpoint, and no new data concept (no
"maintenance" status exists anywhere in this system yet — see the Notes
below). Four summary counts up top, then three real sections (today's
bookings, live field availability, a merged recent-activity feed built from
audit-trail entries) and a Quick Actions row that reuses the app's existing
tab-navigation.

## Failure paths you must handle

- Any of the underlying data fails to load — show one error for the whole page rather than a partially-broken dashboard.
- Nothing has happened yet — each section shows its own clear empty state, not a blank space.
- A human-decision audit entry (an approved/denied escalation) is mistaken for a second, separate activity event alongside the original request.
- A field's live "currently booked" status is computed wrong at the boundary of a booking's start/end time.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given real data exists, when a manager opens the Dashboard, then the four summary cards (Available Fields, Today's Bookings, Pending Approvals, Scheduling Issues) show accurate real counts.
- [x] Given at least one booking is scheduled for today, when the manager views the Today's Bookings section, then they see the customer, field, time, and status for each.
- [x] Given a field has a confirmed booking covering the current moment, when the manager views Field Availability, then that field shows "Booked" while every other field shows "Available".
- [x] Given bookings, scheduling issues, and escalation decisions have happened, when the manager views Recent Activity, then they see a merged, most-recent-first feed without any event appearing twice.
- [x] Given nothing has happened yet, when the manager opens the Dashboard, then each section shows a clear empty state rather than a blank page.
- [x] Given the manager clicks a Quick Action, when they click "Book a Field", "View Bookings", or "Manage Fields", then the app navigates to the corresponding existing page.
- [x] Trust: every number and row on this page is read from an existing accessor already used elsewhere in the app - no second, parallel data source was created for the dashboard.

When every box above is ticked, stop and show the demo.
