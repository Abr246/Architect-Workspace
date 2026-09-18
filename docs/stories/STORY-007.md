# STORY-007 — AI provides business analytics

As a business owner, I want AI to provide analytics, so that I can understand booking trends.

**Release:** r2 · Advanced AI Assistance and Analytics (weeks 5–6)
**Owner:** Analytics Team
**Blocked by:** STORY-006

## The requirement this satisfies

- **REQ-007** (Functional, must) — The system must use AI agents for basic business analytics.
- **REQ-014** (Functional, must) — The system must detect busy and slow booking periods.

## How to build it

Implement analytics dashboard and integrate AI analysis results.

## Failure paths you must handle

- Data analysis error
- Dashboard display error
- Incorrect trend identification

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given booking data, when AI analyzes, then trends are displayed on the dashboard.
- [ ] Given a slow period, when AI analyzes, then it identifies the period.
- [ ] Trust: All analytics reports are logged with data sources and timestamps.

When every box above is ticked, stop and show the demo.
