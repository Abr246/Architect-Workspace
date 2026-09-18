# STORY-005 — Detect booking conflicts

As a system, I want to detect booking conflicts, so that double bookings are prevented.

**Release:** r1 · Conflict Detection and Scheduling (weeks 3–4)
**Owner:** Conflict Detection Team
**Blocked by:** STORY-002

## The requirement this satisfies

- **REQ-010** (Functional, must) — The system must detect booking conflicts.

## How to build it

Implement conflict detection logic in booking service.

## Failure paths you must handle

- Missed conflict
- False positive conflict
- Logging failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a new booking overlaps an existing one, when the system checks, then it identifies a conflict.
- [ ] Given no overlap exists, when the system checks, then it confirms no conflict.
- [ ] Trust: All conflict checks are logged with booking details.

When every box above is ticked, stop and show the demo.
