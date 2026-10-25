# GoalKick — Rehearsal Checklist

## Before you say it's ready

- [ ] Every number on a slide is marked measured, estimated, or target.
- [ ] I state at least one real limit without apologising for it.
- [ ] My live proof uses safe data and I have a backup recording.
- [ ] I can say what the system never decides on its own.
- [ ] I finish speaking inside eight minutes, leaving questions untouched.
- [ ] I have answers ready for five likely questions, grounded in what I
      actually built.

Rehearse out loud, against a clock, at least twice before Demo Day. The
first time you say this script and the first time you say it from memory are
different experiences — don't let Demo Day be the first time you do the
second one.

## Five likely questions, with answers

All five answers below are grounded in verified project material (automated
test results, architecture decisions already made, and the data model as it
exists today). None require additional input from you beyond saying them
clearly.

**1. "What happens if two people try to book the same slot at the exact same
time?"**
> The check happens on the server the moment a booking is created. Whichever
> request gets there first wins and is confirmed. The second one is rejected
> immediately with a clear message, and the system automatically suggests
> nearby alternative times.

**2. "Is GoalKick AI a real AI model, like ChatGPT?"**
> No, and I want to be upfront about that. It's deterministic — it recognizes
> specific question patterns and answers from the app's real data. There's no
> external AI API or key. If it doesn't recognize a question, it says so
> honestly instead of guessing.

**3. "What happens if the server or database goes down?"**
> Data is saved to a real file, not held in memory — I tested this directly:
> created a booking, fully restarted the server, and confirmed it was still
> there. But if the server itself is down, the app doesn't work until it's
> back up — there's no offline mode built yet.

**4. "How would this handle multiple facilities, not just one?"**
> Right now the data model assumes a single facility — a field has no concept
> of which facility it belongs to. Supporting more than one would mean adding
> that boundary to the data model itself, not just a dropdown in the UI.

**5. "What haven't you tested?"**
> Functional correctness is well covered — 163 backend tests and 143
> frontend tests, happy paths and failure paths both. What I have no evidence
> on is performance under real load — many people booking at once. I haven't
> tested that, and I won't claim it works until I have.

## Shortened run order (if time is cut)

If you're told to cut the talk short — say, down to 4 minutes — keep these,
in this priority order, and drop the rest:

1. **The problem** (keep in full, ~40s) — without this, nothing else has
   context.
2. **Live proof, shortened to just two actions** (~60s): book the field, then
   trigger the conflict. Skip the Scheduling Issues, GoalKick AI, and
   Analytics steps — say "and that conflict is then tracked, answerable by
   the AI assistant, and reflected in the analytics dashboard — happy to show
   any of those in Q&A" instead of demoing all three.
3. **The AI/human rule, as one sentence** (~15s): "The system flags
   conflicts and answers questions from real data. A person always decides
   anything involving money or an existing booking."
4. **One limit** (~20s) — the AI-is-not-a-language-model one; it's the most
   likely follow-up question anyway.
5. **The next step, as one sentence** (~15s).

Cut first: the Results section and two of the three limits. They're
valuable, but the story survives losing them; it doesn't survive losing the
problem statement or the live proof.

## Reflection to end on

*Which limit were you most tempted to leave out, and why does that make it
the important one?*

This one is yours to answer — it's about your own experience preparing this
talk, not something that can be answered from the project files. Write a
real answer before Demo Day, not during it. A likely shape for the answer:
the limit you were most tempted to cut is usually the one that most directly
undercuts the headline claim of the project — which is exactly why cutting
it would have been dishonest, and keeping it is what makes the rest of the
talk credible.
