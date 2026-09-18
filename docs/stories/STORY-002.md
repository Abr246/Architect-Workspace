# STORY-002 — Customer books a soccer field

As a customer, I want to book a soccer field, so that I can reserve it for my use.

**Release:** r0 · Initial Setup and Basic Booking (weeks 1–2)
**Owner:** Booking Team
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-002** (Functional, must) — The system must allow customers to choose a date and time for booking a field.
- **REQ-003** (Functional, must) — The system must allow customers to book a soccer field.

## How to build it

Develop booking API and ensure transaction integrity with database.

## Failure paths you must handle

- Double booking
- Database write failure
- Invalid time selection

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer selects a field and time, when they confirm booking, then the booking is recorded.
- [ ] Given a field is already booked, when a customer tries to book it, then they receive a conflict message.
- [ ] Trust: All bookings are logged with customer details and timestamps.

When every box above is ticked, stop and show the demo.
