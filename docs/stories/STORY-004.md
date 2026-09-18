# STORY-004 — Human approval for refunds and complaints

As a system, I want to send important decisions to a human for approval, so that sensitive issues are handled appropriately.

**Release:** r0 · Initial Setup and Basic Booking (weeks 1–2)
**Owner:** Operations Team
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-008** (Functional, must) — The system must send important decisions such as refunds and complaints to a human for approval.
- **REQ-015** (Functional, must) — The system must identify when an issue needs to be sent to a human for approval.

## How to build it

Set up escalation workflow and human approval interface.

## Failure paths you must handle

- Escalation failure
- Approval interface error
- Incorrect flagging

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a refund request, when it is flagged as important, then it is sent to a human for approval.
- [ ] Given a complaint is received, when it is flagged as important, then it is sent to a human for approval.
- [ ] Trust: All escalations to humans are logged with timestamps and decision outcomes.

When every box above is ticked, stop and show the demo.
