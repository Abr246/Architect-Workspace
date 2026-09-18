# STORY-011 — Establish trust spine with audit trail for bookings

As a system auditor, I want an audit trail for bookings, so that all booking actions are traceable and verifiable.

**Release:** r0 · Initial Setup and Basic Booking (weeks 1–2)
**Owner:** System Auditor
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-002** (Functional, must) — The system must allow customers to choose a date and time for booking a field.
- **REQ-003** (Functional, must) — The system must allow customers to book a soccer field.

## How to build it

Create an audit logging mechanism that records all booking actions with timestamps and user details. Ensure the audit trail is accessible for verification.

## Failure paths you must handle

- Booking actions are not logged in the audit trail.
- Audit trail entries are missing timestamps.
- Audit trail is not accessible for verification.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a booking is made, when the booking is confirmed, then the booking details are recorded in the audit trail.
- [ ] Given a booking is cancelled, when the cancellation is processed, then the cancellation details are recorded in the audit trail.
- [ ] Trust: Given any booking action occurs, when the action is completed, then the action is logged with a timestamp in the audit trail.

When every box above is ticked, stop and show the demo.
