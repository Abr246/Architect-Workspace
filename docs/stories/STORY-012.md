# STORY-012 — Detect scheduling issues and notify users

As a scheduler, I want the system to detect scheduling issues, so that I can resolve them before they affect users.

**Release:** r1 · Conflict Detection and Scheduling (weeks 3–4)
**Owner:** Scheduler
**Blocked by:** STORY-005

## The requirement this satisfies

- **REQ-013** (Functional, must) — The system must detect scheduling issues.

## How to build it

Implement a scheduling conflict detection algorithm that checks for overlapping bookings and alerts the scheduler. Ensure all detected issues are logged.

## Failure paths you must handle

- Scheduling conflicts are not detected.
- Notifications are not sent to the scheduler.
- Detected issues are not logged in the audit trail.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a scheduling conflict exists, when the system detects it, then the scheduler is notified immediately.
- [ ] Given a scheduling issue is resolved, when the resolution is confirmed, then the system updates the schedule accordingly.
- [ ] Trust: Given a scheduling issue is detected, when the issue is logged, then it is recorded in the audit trail with details.

When every box above is ticked, stop and show the demo.
