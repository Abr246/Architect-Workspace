# STORY-016 — Persist data in a real database

As a system administrator, I want the system's data to survive a restart, so
that bookings, refund requests, and customer interactions aren't lost every
time the server restarts or redeploys.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** System Administrator
**Blocked by:** nothing — this replaces the storage underneath every existing story without changing any of their behavior

## The requirement this satisfies

- **REQ-016** (Constraint, must) — The system must connect to the booking database.
- **REQ-017** (Constraint, must) — The system must connect to the customer information database.

_Originally attributed to STORY-010, which never actually built this — see the note on that story._

## How to build it

Every service (`fieldsService`, `bookingsService`, `escalationsService`,
`schedulingIssuesService`, `auditTrailService`) held its data in a plain
in-memory array that vanished on every restart. Added `better-sqlite3` (a
single embedded database file, no separate server process to run or
configure) and a shared `backend/src/db/connection.ts` that creates the
tables once. Migrated each service's storage to real reads/writes against
that file, one service at a time, keeping every exported function's
signature and business logic (conflict detection, idempotency checks,
filtering) completely unchanged — this is a storage swap underneath, not a
behavior change. Tests get a fresh in-memory (`:memory:`) database per test
file instead of a real file, reproducing the exact "clean store per test
file" isolation the in-memory arrays already gave for free.

## Failure paths you must handle

- Data is lost when the server restarts (the defect this story exists to fix).
- IDs collide or restart from 1 after a restart, overwriting or duplicating existing records.
- The native database library fails to load on some platform, crashing the whole backend at startup.
- A test run touches the real database file instead of an isolated one, corrupting or depending on real persisted data.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given a booking, escalation, scheduling issue, or audit trail entry has been created, when the backend server process is fully stopped and restarted, then that data is still present.
- [x] Given the full existing test suite, when it runs against this new persistence layer, then every previously-passing test still passes unchanged.
- [x] Given the server has been running and creating records, when it restarts, then new records continue with the next available id rather than colliding with existing ones.
- [x] Trust: tests never touch the real database file — they run against an isolated, throwaway in-memory database per test file, so a test run can never corrupt or depend on real persisted data.

When every box above is ticked, stop and show the demo.
