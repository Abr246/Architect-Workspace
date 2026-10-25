# STORY-022 — GoalKick AI chat assistant upgrade

As a facility manager, I want "Ask a question" to feel like a real assistant
for running the facility, so that I can quickly check on bookings, fields,
and schedules without hunting across pages.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-003 (the original assistant endpoint this still falls back to), STORY-008 (its complex-query handling), STORY-012 (scheduling issue detection), STORY-014 (all-bookings accessor)

## The requirement this satisfies

- **REQ-026** (Functional, must) — The system must present the assistant as a chat interface ("GoalKick AI") that answers questions about fields, bookings, scheduling issues, and customers using real application data, with suggested questions and a clear fallback for anything outside its known topics.

## How to build it

User asked for a modern chat UI named "GoalKick AI" — avatar, message bubbles on alternating sides, timestamps, a typing indicator, 6 clickable suggested questions, and broader topic coverage (fields, availability, bookings, booking times, scheduling issues, customers, analytics) — explicitly: no external AI API or key unless one already exists (none does), don't pretend to have a real AI backend, and don't break the existing assistant functionality.

The existing backend (`backend/src/services/assistantService.ts`, STORY-003/008) is a deterministic, rules-based stand-in for an AI, scoped to pricing/availability/busy-slow trends only. Six of the newly requested topics (today's bookings, upcoming bookings, scheduling conflicts, the most-booked field, busiest times, customers) have no backend support and are outside that scope. Rather than widen the backend to match an external AI API's shape it doesn't have, or invent a fake one, every new topic is answered entirely in the frontend from data the app already fetches (fields, bookings, scheduling issues) — the same honest-substitution approach already used for the backend's own "AI", just one layer up. A new `frontend/src/utils/assistantIntents.ts` matches a question against the 6 suggested-question patterns (plus a seventh for "customers," which generalizes naturally from the same real booking data) and computes a real answer; anything that doesn't match falls through to the existing `/api/assistant/ask` endpoint unchanged, so the original pricing/availability/trends behavior (and its audit logging) is completely preserved, not replaced.

Since the backend requires a `customerName` for its audit log and the new design has no name field (every suggested question is about running the facility, not something a named customer is asking), chat interactions use a fixed `ASSISTANT_ACTOR = 'Facility Manager'` string for any question that still reaches the backend — an honest, disclosed simplification rather than inventing a fake per-session identity.

The chat typing indicator uses a small fixed delay (450ms) alongside the real computation/fetch, since a real backend round trip or a synchronous local calculation both resolve faster than a person can perceive — this is UI pacing, not a claim that GoalKick AI is "thinking." Both the suggestions and the input are disabled until the initial fields/bookings/scheduling-issues fetch completes, so an early question can't be answered from empty, not-yet-loaded data.

**Follow-up (same day):** the user asked for GoalKick AI to be a floating toggle in the bottom-right corner — exactly like the header's notification bell and theme toggle — instead of its own nav tab and full page. Moved the entire chat UI into a new `frontend/src/components/GoalKickAIWidget.tsx`, deleted `AssistantPage.tsx` (no longer a page), removed the "GoalKick AI" nav tab, and mounted the widget once at the app root so it's reachable from every screen. It mirrors `NotificationBell.tsx`'s exact toggle pattern: closed by default, opens on click, closes on an explicit × button, a click outside the panel, or Escape. Facility data (fields/bookings/scheduling issues) is still fetched once on mount regardless of whether the panel is open, the same way `useNotifications` already polls in the background — so by the time someone opens it, the data is usually already there.

## Failure paths you must handle

- The initial facility-data fetch fails — the assistant must still work for backend-routed questions (pricing/availability/trends), with a visible warning that local-data answers may be out of date, rather than crashing.
- A question matches none of the known local intents and isn't recognized by the backend either — the existing "I'm not able to answer that yet" decline must still surface, not a blank or broken response.
- The backend fallback request fails outright (network error, 500) — show a clear error without losing the rest of the conversation.
- A locally-answered question (e.g. "which field is booked the most") has no booking history yet — answer honestly that there isn't enough history, not a fabricated ranking.
- Clicking a suggestion or sending text while the assistant is already "typing" must not fire a second overlapping request.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given the manager opens GoalKick AI from its bottom-right toggle, when the panel renders, then it shows "GoalKick AI", "Your soccer facility assistant", the description line, and all 6 suggested questions.
- [x] Given the manager clicks a suggested question, when it is processed, then the question appears in the chat and a real, data-grounded answer follows, with a typing indicator shown while it's being computed.
- [x] Given a question about fields, bookings, booking times, scheduling issues, or customers, when it matches a known local intent, then the answer is computed from real application data, not invented.
- [x] Given a question outside the local intents (e.g. pricing), when it is asked, then it is answered by the existing backend assistant exactly as before, preserving STORY-003/008's behavior and audit logging.
- [x] Given multiple exchanges happen, when the conversation continues, then every message shows on the correct side (user vs. GoalKick AI) with an avatar and a timestamp, and earlier messages are never replaced.
- [x] Given the underlying data or the backend fails, when that happens, then the page shows a clear error rather than crashing or silently failing.
- [x] Trust: no external AI API or API key was added, and the original backend assistant endpoint and its scope are unchanged, not removed.

When every box above is ticked, stop and show the demo.
