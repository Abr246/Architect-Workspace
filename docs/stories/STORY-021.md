# STORY-021 — Analytics dashboard upgrade

As a facility manager, I want a visual breakdown of how my fields and
bookings are performing, so that I can see trends, revenue, and busy times
at a glance instead of reading a single day-of-week table.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-007 (the existing analytics report this builds alongside), STORY-014 (all-bookings accessor)

## The requirement this satisfies

- **REQ-025** (Functional, must) — The system must give facility managers a visual breakdown of booking volume, revenue, field performance, and peak times, over a selectable look-back window, using only real booking and field data.

## How to build it

User asked for 4 summary cards (Total Bookings, Total Revenue, Average
Booking Value, Field Utilization), a Booking Trends chart, a Revenue
chart, a Field Performance table, a Peak Booking Times chart, and a
7/30/90-day range selector — explicitly: no new or complicated backend,
use existing booking and field data, and show clean empty states instead
of fabricated numbers wherever there isn't enough data.

No "revenue" or "utilization" field exists anywhere in the data model.
Both are real numbers derived from data that already exists: revenue is a
booking's actual duration multiplied by its field's actual hourly price;
utilization is booked hours divided by the field's real operating window
(the same `OPERATING_HOURS` constant already used by the booking slot
grid) over the selected range. Neither is invented — they're honest
arithmetic on real bookings and real field prices, computed entirely in
the frontend, so this shipped with zero backend changes (confirmed via
`git status --short backend`).

Extracted every calculation into a new, independently unit-tested
`frontend/src/utils/analyticsMetrics.ts` rather than inlining it in the
page component — the date-range filtering, revenue math, and bucketing
logic needed to be verified in isolation before trusting any chart built
on top of them. Reused `OPERATING_HOURS` and `formatHourLabel` from the
existing `timeSlots.ts` rather than redefining the operating window a
second time.

Booking Trends and Revenue bucket by day for the 7-day range, but by week
for 30 and 90 days — 30 or 90 individual daily bars would be unreadable
clutter ("make the charts readable and not overly complicated"), so wider
ranges roll up into roughly 5–13 weekly bars instead. Peak Booking Times
buckets by the viewer's own local hour (matching the existing booking
slot grid's local-time convention, not the UTC bucketing the backend's
day-of-week report uses for machine-independence), and only lists hours
that actually have a booking, matching the user's own example.

The existing `/api/analytics/report` endpoint and its busy/slow
day-of-week `summary` sentence (STORY-007) is still fetched and displayed
as a caption under Booking Trends — that existing functionality wasn't
removed, just given a new, smaller place in a page that now does more.

Every chart section checks its own real data and swaps to a plain
empty-state sentence ("No bookings in the last N days yet.") instead of
rendering a chart made of zero-height bars when the selected range
genuinely has no confirmed bookings in it.

## Failure paths you must handle

- The selected date range has zero confirmed bookings — Booking Trends, Revenue, and Peak Booking Times must show a clean empty-state sentence, not an empty-looking chart or invented numbers.
- A booking references a field that no longer exists — its revenue contribution is treated as $0 rather than throwing or crashing the page.
- There are no fields at all — Field Performance shows a simple "no fields" message instead of an empty table.
- Switching the date range must actually change every figure that depends on it (summary cards, both charts, field performance, peak times), not just the ones that happen to re-render first.
- Loading bookings, fields, or the analytics report fails — the page shows a clear error state, not a crash or a silently empty dashboard.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given real bookings and fields, when the manager opens Analytics, then the 4 summary cards (Total Bookings, Total Revenue, Average Booking Value, Field Utilization) show real, honestly-derived numbers for the selected range.
- [x] Given bookings exist in the selected range, when the page renders, then Booking Trends and Revenue show a readable chart of real values over time, not a day-of-week table.
- [x] Given no bookings exist in the selected range, when the page renders, then Booking Trends, Revenue, and Peak Booking Times show a clean empty-state message instead of fabricated numbers.
- [x] Given real fields and bookings, when Field Performance renders, then every field is listed with its real booking count, revenue, and utilization percentage, including an honest zero for a field with no bookings in range.
- [x] Given bookings at specific times, when Peak Booking Times renders, then it shows which hours are busiest using real booking start times.
- [x] Given the manager switches between 7 / 30 / 90 Days, when the range changes, then every figure on the page updates to reflect that range.
- [x] Trust: no new backend functionality was added - revenue and utilization are computed in the frontend from the existing bookings and fields endpoints, and the existing busy/slow analytics report (STORY-007) is still displayed, not replaced.

When every box above is ticked, stop and show the demo.
