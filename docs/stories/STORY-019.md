# STORY-019 — Notifications and alerts

As a facility manager or customer, I want a notification bell that surfaces
booking and scheduling events as they happen, so that I don't have to go
looking for them across several pages.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-011 (audit trail), STORY-014 (all-bookings accessor), STORY-015 (audit-trail entityType filter), STORY-017 (the activity feed this reuses)

## The requirement this satisfies

- **REQ-023** (Functional, must) — The system must notify users of booking and scheduling events — new bookings, cancellations, scheduling conflicts, decided requests, and upcoming bookings — through a notification panel they can read, mark as read, and act on.

## How to build it

Asked the user first whether this was worth building given how much already
overlapped with the Dashboard's Recent Activity section (STORY-017) — agreed
scope: reuse that exact same categorization logic rather than building a
second copy, add a genuinely new "upcoming booking" reminder (nothing in the
app currently surfaces "this is about to start"), and drop "Field
maintenance reminder" entirely, since no maintenance concept exists anywhere
in the data model (the same honest call made twice already, for field
status and for field ratings).

Extracted `buildActivityFeed` out of `DashboardPage.tsx` into a shared
`frontend/src/utils/activityFeed.ts` (verified behavior-neutral - the
Dashboard's own existing tests needed zero changes), widened it with
notification-friendly fields (a short `title`, the `fieldName` and
`relevantTime` a notification is actually about, which for a booking event
is the booking's own start time, not when the admin action happened), and
added `buildUpcomingBookingNotifications` alongside it for bookings starting
within the next few hours - computed live from existing booking data, not
logged anywhere, since "this hasn't happened yet" isn't an audit event.
Built a `useNotifications` hook (polls the same existing endpoints every 30
seconds) and a `NotificationBell` component in the header: a bell with an
unread-count badge, a dropdown panel, and a "Mark all as read" action.
Read/unread state lives only in the browser's `localStorage` - no backend
change for this feature at all.

## Failure paths you must handle

- The user-named "Booking approved" category doesn't correspond to anything this system actually does (bookings auto-confirm; refund/complaint requests are what get approved or denied) - labeled honestly as "Request approved"/"Request denied" instead of fabricating a booking-approval step that doesn't exist.
- The underlying data fails to load - the panel must show a clear message, not crash or show nothing.
- `localStorage` is unavailable (private browsing, blocked) - notifications must still work, just without read state surviving a reload.
- The human-decision audit entry must not be double-counted as a second "approved/denied" notification alongside the AI-instant-resolution entry sharing the same entityType/action.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given real events have happened, when the user opens the notification panel, then each notification shows a short title and a "Field • time" or equivalent subtitle, matching the real underlying data.
- [x] Given a booking is starting soon, when the user opens the panel, then an "Upcoming booking" notification appears with a countdown ("In 2 hours"), not a calendar date.
- [x] Given unread notifications exist, when the user looks at the bell, then an unread-count badge is shown; given none exist, then no badge is shown.
- [x] Given the user clicks a notification, when it is a type routes to an existing page, then that notification is marked read, the panel closes, and the app navigates there.
- [x] Given the user clicks "Mark all as read", when there were unread notifications, then all of them become read and the button disables itself once none remain.
- [x] Given the user marks something as read and reloads, when the panel reopens, then that notification is still shown as read (persisted in `localStorage`, not just in-memory).
- [x] Trust: the notification feed and the Dashboard's Recent Activity feed are driven by the exact same shared categorization logic - no second, independently-written copy that could disagree with the first.

When every box above is ticked, stop and show the demo.
