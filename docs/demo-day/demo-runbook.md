# GoalKick — Demo Runbook

Exact steps for the live portion of the Final Showcase (slide "Live proof,"
0:50–3:20). Rehearse this sequence at least twice before Demo Day — know
which field and time you're using before you're standing in front of anyone.

This runbook describes using the app as it already exists. It does not ask
you to change any real data or configuration to make the demo work.

## Starting state

- Backend running locally (`cd backend && npm run dev`), port 4000.
- Frontend running locally (`cd frontend && npm start`), port 3000.
- Browser open to GoalKick at `localhost:3000`, on the **Book a Field** page.
- Confirm both are actually running and reachable *before* the audience is in
  the room — not something to discover live.

## Safe sample data

Use these two real, already-seeded fields — no setup required:

- **Riverside Pitch** (grass, North Park) — your primary demo field.
- **Downtown Turf** (artificial turf, Central Complex) — your backup field,
  only if something about Riverside Pitch is already in a state you don't
  expect when you check beforehand.

**Pick today's date, and a time slot a little later than right now** (for
example, if it's 2:00 PM when you rehearse or present, use 4:00 PM or later
today). Two reasons this matters:

1. A past time slot shows as "Past" and can't be booked — the slot picker
   will not let you select it.
2. Analytics' default view looks at the **last 7 days up to now** — a
   same-day booking shows up in it immediately; a booking dated several days
   in the future will not show up until that date arrives. Using today's
   date is what makes the Analytics step (demo action 5) actually show the
   number changing live.

Write down the exact field + date + time you're using before you present, so
step 2 below reuses the identical slot on purpose.

## The five actions

### 1. Book the field normally

**Say first:** "Here's a manager booking a field the normal way."

**Do:** On Book a Field, click **Book Now** on Riverside Pitch → pick today's
date → click your chosen time slot (shown "Available") → fill in a customer
name → **Confirm Booking**.

**Expect:** A confirmation, and the booking now listed under **All Bookings**.

### 2. Trigger the conflict

**Say first:** "Now watch what happens if someone else wants that exact slot."

**Do:** Click **Book Now** on Riverside Pitch again → pick the **same date**
and **same time slot** you just booked → try to confirm with a different
customer name.

**Expect:** The booking is rejected (not created), a clear conflict message
appears, and the system suggests alternative times automatically (shifted by
an hour or so from your original slot).

### 3. Show the conflict being tracked

**Say first:** "That conflict doesn't just disappear — it gets tracked."

**Do:** Open **Scheduling issues**.

**Expect:** An open issue card for Riverside Pitch, naming the original
booking's customer and the person who was just declined. Click **Resolve
Issue** to show both bookings side by side and the four resolution choices
(change time, move field, cancel, mark resolved) — you don't need to actually
resolve it live unless you want to; showing the modal is enough proof.

### 4. Ask GoalKick AI

**Say first:** "A manager can also just ask."

**Do:** Click the floating ⚽ toggle, bottom-right of any page → click the
suggested question **"Are there any scheduling conflicts?"**

**Expect:** It answers naming Riverside Pitch — the same conflict you just
created, proving it reads live data, not a script.

### 5. Show it in Analytics

**Say first:** "And all of it adds up into real numbers."

**Do:** Open **Analytics**.

**Expect:** Total Bookings and Revenue already reflect the booking from step
1 (this is why today's date matters — see "Safe sample data" above).

## Recovery path (if a step doesn't go as expected)

- **If step 2 doesn't produce a conflict:** stay calm, say "let me try that
  again" once. If it still doesn't trigger, move on — say what *should* have
  happened, continue to step 3 anyway using whatever open issues already
  exist in the system (there are likely some from earlier testing), and
  mention you'll follow up. Do not spend audience time debugging live.
- **If the app is unreachable at all** (server crashed, network issue):
  switch immediately to the backup recording — see below. Say "let me show
  you this running" and play it, rather than trying to restart servers in
  front of people.

## Backup plan

Before Demo Day, screen-record this exact five-step sequence succeeding once,
start to finish, using the steps above. Keep that recording ready to play
(not just saved somewhere you'd have to go find) during your actual
presentation. If any live step fails and a quick retry doesn't fix it, play
the recording instead of continuing to troubleshoot on stage.
