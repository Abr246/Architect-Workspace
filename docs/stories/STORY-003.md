# STORY-003 — AI assistant answers customer questions

As a customer, I want an AI assistant to answer my questions, so that I can get quick responses.

**Release:** r2 · Advanced AI Assistance and Analytics (weeks 5–6)
**Owner:** AI System
**Blocked by:** STORY-008

## The requirement this satisfies

- **REQ-004** (Functional, must) — The system must provide an AI assistant to answer customer questions about pricing and availability.

## How to build it

Implement AI assistant using the existing AI framework to handle customer queries. Ensure logging of all interactions for audit purposes.

## Failure paths you must handle

- AI fails to understand the question
- AI provides an incorrect answer
- AI fails to log the interaction

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer asks a question, when the AI assistant processes it, then the customer receives a relevant answer.
- [ ] Given a customer asks a question outside the AI's knowledge, when the AI assistant processes it, then the customer is informed that the question cannot be answered.
- [ ] Trust: Given a customer interaction, when the AI assistant responds, then the interaction is logged in the audit trail.

When every box above is ticked, stop and show the demo.
