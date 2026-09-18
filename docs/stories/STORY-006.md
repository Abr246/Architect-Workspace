# STORY-006 — AI-assisted scheduling

As a system, I want to use AI for scheduling, so that optimal booking times are suggested.

**Release:** r1 · Conflict Detection and Scheduling (weeks 3–4)
**Owner:** AI Team
**Blocked by:** STORY-002

## The requirement this satisfies

- **REQ-006** (Functional, must) — The system must use AI agents for scheduling.

## How to build it

Develop AI scheduling model and integrate with booking interface.

## Failure paths you must handle

- Incorrect time suggestion
- AI model failure
- Integration error

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer requests a booking, when AI suggests times, then optimal times are presented.
- [ ] Given a busy period, when AI analyzes, then it suggests alternative times.
- [ ] Trust: All AI scheduling suggestions are logged with rationale.

When every box above is ticked, stop and show the demo.
