---
name: tech-stack-recommender
description: Use when the user has a system architecture and wants a recommended tech stack, explained simply. Reads project-blueprint/architecture.md, recommends one real, current technology per component with a fit rating (🟢 great fit / 🟡 good fit / 🔴 consider carefully) scaled to that idea's actual needs, a one-sentence plain-English "why," and a copy-ready follow-up prompt per row. Saves to project-blueprint/tech-stack.md. Do NOT use this to design the architecture itself (that's `/system-architect`) or to review/change this repo's existing stack — this is for a new idea's component list only.
---

# Tech Stack Recommender

## Scope — when this skill applies

- **Triggers:** the user has (or asks for) a system architecture for a project idea and wants to know what real technology to actually build each piece with.
- **Prerequisite:** `project-blueprint/architecture.md` must exist. If it doesn't, run `/system-architect` first (or tell the user to) — do not invent an architecture here just to fill this skill's input.
- **Does not trigger for:** auditing or migrating this repo's own `/backend` or `/frontend` stack. Those are real engineering decisions with existing code, not a blueprint recommendation for a new idea.

## 1. Read the architecture, don't template it

Read `project-blueprint/architecture.md` in full. Pull the component list from its **Components** table (or equivalent section) — that list is the sole source of truth for what needs a technology recommendation. Do not add components that aren't there and don't skip any that are.

Also read the idea summary, data flow, and assumptions in that file — the scale and needs of THIS idea (expected users, data volume, team size implied, real-time requirements, budget signals) drive the fit ratings in step 3. A recommendation that would be right for a 10-person team's MVP can be the wrong fit for a component the idea implies must handle heavy real-time load, and vice versa.

## 2. Pick one real, current technology per component

For every component, recommend exactly one specific, real, currently-maintained technology (not a category like "a database" — name the actual product, e.g. "PostgreSQL," "Redis," "Stripe," "AWS S3"). Avoid recommending anything abandoned, deprecated, or superseded by an obvious successor.

Prefer boring, proven defaults over novelty unless the idea's actual requirements (from step 1) specifically call for something more specialized. If two technologies are both reasonable, pick the one a small team could realistically operate.

## 3. Rate the fit honestly, against THIS idea

Every recommendation gets exactly one fit rating:

| Icon | Meaning |
|---|---|
| 🟢 | Great fit — matches this idea's actual scale, budget, and complexity well |
| 🟡 | Good fit — works, but there's a tradeoff worth knowing (cost at scale, added ops burden, overkill/underkill for the stated needs) |
| 🔴 | Consider carefully — meets the need but has a real risk or mismatch for this idea specifically (e.g. a heavyweight tool for a tiny MVP, a tool that won't scale to the volume the idea implies, a paid service with no free tier for a bootstrapped idea) |

Never default to 🟢 across the board — that signals no real evaluation happened. The rating must trace to something specific in the architecture (expected scale, real-time needs, team size, budget signals), not a generic opinion about the technology in isolation. If a component's true fit is 🔴, say so and explain the risk rather than softening it to 🟡.

## 4. Explain the why in one plain sentence

One sentence per row, in plain English, that a non-technical founder could follow. No unexplained jargon: if a technical term is necessary (e.g. "ORM," "message queue," "vector database"), give a one-line plain-English definition inline, in parentheses, the first time it's used in the document.

Bad: "Chosen for its ACID compliance and mature ecosystem."
Good: "Keeps every booking accurate even if two people try to grab the same slot at once — critical since the idea's whole promise is zero double-bookings."

## 5. Add a copy-ready follow-up prompt per row

End every row with a short prompt, written in first person as if the user is about to paste it into a new conversation, that lets them go learn more about that specific technology in the context of their own project. Tailor it to the component and idea — not a generic template repeated verbatim for every row.

Example shape: "Explain PostgreSQL to me like I'm new to databases, using my [project name]'s booking system as the example."

## 6. Format — icons and short labels, never a wall of text

Present the output as a table, one row per component. No long paragraphs. Structure:

```markdown
# Tech Stack: <project name or short idea summary>

Based on `project-blueprint/architecture.md`.

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| <Component> | <Technology> | 🟢/🟡/🔴 | <one plain-English sentence> | `<copy-ready prompt>` |
| ... |

## Fit Summary

- 🟢 Great fit: <n>
- 🟡 Good fit: <n>
- 🔴 Consider carefully: <n>

## Notes

<any component where the fit rating needed real judgment, and why — e.g. "Payment Gateway rated 🟡 because Stripe's per-transaction fee only makes sense once volume passes X; below that a simpler flat-fee processor may fit better.">
```

## 7. Save the result

Write the full table and summary to `project-blueprint/tech-stack.md`, overwriting any prior version. Create `project-blueprint/` if it somehow doesn't exist (it should, since `architecture.md` lives there).

## Rules

- Every row must trace back to a component actually listed in `architecture.md` — no inventing extra infrastructure "to be thorough."
- Never recommend a technology just because it's popular in this repo's own stack (Node/Express/React/Postgres) — recommend what actually fits the idea being blueprinted, even if that's a completely different stack.
- Fit ratings must vary based on real analysis. A tech-stack.md that is all 🟢 or all 🟡 is a defect — go back and re-evaluate against the idea's actual scale.
- Keep the "why" to one sentence. If it needs two, the jargon wasn't defined well enough — fix the definition, don't add a second sentence.
- The copy-ready prompt must be plain text the user can paste as-is — no placeholders left unfilled (fill in the actual project name and component from the architecture doc).
