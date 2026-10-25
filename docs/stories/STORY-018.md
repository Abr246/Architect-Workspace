# STORY-018 — Field details page

As a customer, I want to see full details about a field — a bigger picture,
its amenities, and what times are open — before I commit to booking it, so
that I'm not choosing blind off a small card.

**Release:** r4 · Optimization and Final Adjustments (weeks 9–10)
**Owner:** Frontend Team
**Blocked by:** STORY-001 (fields), STORY-002 (bookings), STORY-013 (design system), STORY-016 (persistence, for the schema migration this needed)

## The requirement this satisfies

- **REQ-022** (Functional, must) — The system must let a customer open a dedicated details page for a specific field, showing its full information, amenities, and availability, before booking it.

## How to build it

Before building, asked the user whether this was worth adding at all, since
much of it already overlapped with the existing field card and booking
modal — agreed scope: reuse the existing booking modal rather than building
a second time-slot picker, add real authored content for the fields that
don't exist in the data today (size, description, amenities), and drop
"rating" entirely rather than fabricate a number with nothing behind it (no
review/feedback system exists anywhere in this app).

Widened the `fields` table with 3 new columns (`size_format`, `description`,
`amenities` as JSON text) via an idempotent `ALTER TABLE ... ADD COLUMN`
migration in `backend/src/db/connection.ts` — `CREATE TABLE IF NOT EXISTS`
alone does nothing to a table that already exists from an earlier session.
A backfill function keeps the 3 seed fields' new columns in sync with the
authored content in source on every startup, so a pre-existing database file
doesn't end up stuck with empty defaults. Extracted the slot-availability
logic (`OPERATING_HOURS`, `slotStatus`, time formatting/conversion) that
previously lived only inside `BookingForm.tsx` into a shared
`frontend/src/utils/timeSlots.ts`, since the new details page needed the
exact same (genuinely tricky, timezone-sensitive) logic for its own
read-only availability preview — one implementation, not two that could
drift apart. `BookingForm` gained an optional `initialDate` prop so booking
from the details page opens already looking at whatever date the customer
was just previewing.

## Failure paths you must handle

- A database file from before this story has the 3 seed fields without size/description/amenities populated.
- The availability preview's booking-overlap check fails to load — the page must not block booking, only lose its "is this slot booked" preview.
- Clicking into details from a field card, then booking, must still go through the exact same conflict-checked booking flow as booking directly from the card.

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given a customer clicks a field's name or image on the main booking page, when the details page opens, then it shows the field's name, location, price, surface type, size, and description.
- [x] Given a field has amenities, when the customer views its details page, then each amenity is listed.
- [x] Given a date is selected on the details page, when the customer views Availability, then each operating hour shows Available, Booked, or Past, matching real existing bookings for that field and date.
- [x] Given the customer clicks "Book This Field" or an available time slot, when the booking modal opens, then it is the same existing booking modal, pre-filled with the date the customer was previewing.
- [x] Given the customer clicks "Back to all fields", when they return to the grid, then the existing "Book Now" button still works exactly as before.
- [x] Given a database file created before this story, when the backend starts, then the existing 3 fields gain the new descriptive content without losing any existing data (fields, bookings, or otherwise).
- [x] Trust: the availability preview and the booking modal's own slot grid use the exact same shared logic - no second, independently-written implementation that could disagree with the first.

When every box above is ticked, stop and show the demo.
