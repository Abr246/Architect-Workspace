# GoalKick — Speaker Notes

Slide-by-slide script for the Final Showcase (8 min speaking, 5 min Q&A held
separately). This file is for the presenter only — never shown on screen.
Open `presentation.html`, and read this alongside it.

No unusual pronunciation in this deck — "GoalKick" is said exactly as written.

---

## Slide 1 — Title

Say the project name and one sentence of context while the audience settles.

> "This is GoalKick — a soccer field booking and management platform. I'm going
> to walk through the problem it solves, show it running live, and be honest
> about where it stops."

Transition: click Next or press the right arrow key.

---

## Slide 2 — The problem (0:00–0:50)

> "Meet a facility manager running a few soccer fields. Bookings come in by
> phone, text, and walk-in, so someone has to check a shared calendar by hand,
> every time.
>
> When two people book the same field at the same time — and that happens
> most weekends — nobody finds out until someone shows up and there's no field
> for them. That's a refund, an upset customer, and real staff time cleaning
> it up. Every time it happens."

Timing check: you should be at roughly 0:50 when you finish this line. If
you're running long here, this is the one beat you can trim without losing
the rubric's "named role and specific cost" requirement — keep the role and
the cost, cut any extra color.

Transition: "Let me show you." → move to the live demo. This is where you
switch away from the deck to the actual running app — see `demo-runbook.md`
for the exact steps.

---

## Slide 3 — Live proof (0:50–3:20)

This slide is a cue card, not something to read aloud — the actual proof
happens in the real app. Narrate *before* each click, not during.

> "First, a normal booking." [book a field]
> "Now watch what happens if someone else wants that exact slot." [try to
> double-book it] "See that? It stops the double-booking right away and
> offers other times on its own."
> "That conflict doesn't just disappear — it shows up here, with both
> people's names, ready to fix in one click." [Scheduling Issues]
> "You can also just ask." [GoalKick AI → "Are there any scheduling
> conflicts?"] "And it answers using the real data we just created, live."
> "All of it adds up into real numbers." [Analytics]

Return to the deck (or keep the app open and narrate the next beat over it —
your choice) once this is done.

---

## Slide 4 — AI and human roles (3:20–4:40)

> "GoalKick draws one clear line. The system decides on its own whether a
> time slot is free, whether a new booking conflicts with one that exists,
> and what else is open — that's all read-only or straightforward logic,
> nothing that touches money or cancels anything a customer already has.
>
> The moment a decision could cost someone money — a refund, a complaint — it
> goes to a human, full stop. The system never approves or denies one on its
> own.
>
> And when there's a scheduling conflict, GoalKick flags it and shows both
> bookings side by side — but a person chooses what happens next: cancel it,
> move it, or mark it resolved. It never acts on a customer's booking by
> itself.
>
> Every one of those handoffs, and every decision a person makes afterward,
> is timestamped in an audit trail — so nothing here is untraceable, even
> when a human made the final call."

This is the beat the rubric wants stated "as a rule, not implied by example"
— the rule banner on the slide ("The system flags. A person acts.") is your
anchor line if you lose your place.

---

## Slide 5 — Results (4:40–6:00)

Read each number, and say its label out loud — "measured" or "estimated" —
don't just point at the tag on the slide.

> "163 backend tests passing, and 143 on the front end — I counted those, I
> didn't estimate them.
>
> 23 user stories built, and 16 of them independently verified against their
> own written acceptance criteria — 107 out of 108 individual criteria
> passed. Also measured, not a guess.
>
> Three of my biggest features — the conflict center, the analytics
> dashboard, and the AI assistant — needed zero new backend code. I reused
> what already existed.
>
> One estimate, clearly labeled as one: this would save a manager real time
> every week. I believe that, but I haven't measured it on a real manager
> yet."

---

## Slide 6 — Limits (6:00–7:00)

Say these plainly. No apologizing, no softening language before or after.

> "Three honest limits.
>
> One — the AI assistant is not a language model. It's deterministic rules
> plus real data, no external API, no key. Outside what it recognizes, it
> says so instead of guessing.
>
> Two — the numbers you just saw are correct math, but on a small amount of
> test data. I can't tell you real-world patterns yet, only that the
> arithmetic is right.
>
> Three — it catches one kind of conflict: one field double-booked. It
> doesn't know about staff schedules or multiple locations. Extending that
> means redesigning the data model, not adding a button."

---

## Slide 7 — Next step (7:00–8:00)

> "The next thing worth building is real logins, so each manager only sees
> their own fields. I'm not building that yet, though — there's exactly one
> facility manager using this today, so that problem doesn't exist yet. The
> day there's a second one, that's my signal to build it."

You should land at almost exactly 8:00 here. Stop talking — do not keep
going into Q&A territory even if you have ten seconds left on the clock.

---

## Slide 8 — Questions

> "Thank you — happy to take questions."

Hold here. Q&A is a separate 5 minutes; this slide is just the handoff.
See `rehearsal-checklist.md` for the five questions you should already have
answers to.
