# STORY-013 — Apply the enterprise design system across the app

As a customer and business owner, I want the booking app to look professional and
consistent, so that I trust it enough to use it for real bookings and payments.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-001, STORY-002, STORY-004, STORY-005, STORY-006, STORY-007, STORY-008, STORY-009, STORY-010, STORY-012 — every story that ships a page, since this story skins all of them

## The requirement this satisfies

- **REQ-018** (Non-functional, must) — The system must present a consistent, professional visual design across all customer- and operator-facing pages.

## How to build it

Use the `/frontend-design` skill (React + Bootstrap, the "Bloomberg meets Salesforce"
enterprise palette already defined for this project) to style the shared nav in
`frontend/src/App.tsx` and every page under `frontend/src/pages/`. This is a
presentation-layer-only pass: no business logic, API contracts, or routes change.
Run `/fixing-accessibility` afterward for a WCAG 2.1 AA audit and fix what it finds.

## Failure paths you must handle

- Redesign changes booking/approval/scheduling behavior or breaks an existing test.
- Some pages get styled and others are left plain, so the app looks inconsistent.
- Accessibility regressions: broken keyboard navigation, missing labels, insufficient contrast.
- Layout breaks or requires horizontal scrolling at mobile widths.
- Theme preference fails to persist (or fails to read back), leaving the user in the wrong theme after a reload.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given any page in the app, when a user loads it, then it renders using the GoalKick design system instead of unstyled browser defaults.
- [x] Given the booking flow, when a customer views fields and books one, then layout, spacing, and typography are visually consistent with the rest of the app.
- [x] Given a keyboard-only or screen-reader user, when they navigate any page, then all interactive elements are reachable, labeled, and meet WCAG 2.1 AA contrast.
- [ ] Given the app is viewed at a mobile-width viewport, when a user interacts with any page, then the layout is usable without horizontal scrolling. _(CSS written for this — flex-wrap nav, fluid widths, a 600px breakpoint, scrollable table — but not yet visually confirmed in an actual phone-width viewport. Check in browser devtools and tick when confirmed.)_
- [x] Trust: Given any page is redesigned, when `tsc --noEmit` and the existing test suites run, then they pass unchanged — visual changes never alter functional behavior.
- [x] Given a user on any page, when they click the theme toggle in the header, then the interface switches between light and dark themes and the choice is remembered on the next visit.

When every box above is ticked, stop and show the demo.
