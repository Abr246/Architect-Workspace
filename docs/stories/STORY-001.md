# STORY-001 — Customer views available soccer fields

As a customer, I want to view available soccer fields, so that I can choose a suitable time for booking.

**Release:** r0 · Initial Setup and Basic Booking (weeks 1–2)
**Owner:** Frontend Team
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-001** (Functional, must) — The system must allow customers to view available soccer fields.
- **REQ-009** (Functional, must) — The system must detect available and unavailable soccer fields.

## How to build it

Implement field availability endpoint and integrate with frontend display.

## Failure paths you must handle

- Database connection failure
- Incorrect field status
- Frontend display error

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer, when they access the field availability page, then they see a list of available fields.
- [ ] Given a field is booked, when a customer views availability, then the field is not shown.
- [ ] Trust: All field availability views are logged with timestamps.

When every box above is ticked, stop and show the demo.
