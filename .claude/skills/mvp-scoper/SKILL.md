---
name: mvp-scoper
description: Use when the user wants to know what to build first, see what their idea could look like, and get a short pitch for it (e.g. "what should I build in week one", "show me what this would actually look like", "give me something I can show people", "make me a one-pager for this idea"). Reads project-blueprint/architecture.md and project-blueprint/tech-stack.md and produces three real files in project-blueprint/: mvp-plan.md (a Week 1 build checklist), mockup.html (a self-contained visual mockup of the idea's main screen), and one-pager.pdf (a short marketing one-pager). Do NOT use this to design the architecture (that's /system-architect) or recommend technology (that's /tech-stack-recommender) — this is the step after both of those exist.
allowed-tools: Read, Write, Bash
---

# MVP Scoper

## Scope — when this skill applies

- **Triggers:** the user has a project idea already blueprinted and wants to know what to actually build first, wants to see/show what it could look like, or wants a short pitch for it.
- **Prerequisite:** `project-blueprint/architecture.md` must exist. `project-blueprint/tech-stack.md` should exist too — if it doesn't, proceed using architecture.md alone and note in mvp-plan.md that the tech stack wasn't yet chosen, rather than blocking. If architecture.md doesn't exist, tell the user to run `/system-architect` first instead of inventing components here.
- **Does not trigger for:** designing the architecture itself, choosing the tech stack, or building real application code. This skill produces a plan, a mockup, and a pitch document — not working software.

## 1. Read the inputs, don't template the idea

Read `project-blueprint/architecture.md` in full, and `project-blueprint/tech-stack.md` if it exists. Pull from them:

- The idea summary and the one thing it must do well on day one (architecture.md usually states this explicitly)
- The component list and the Build Order table, if present
- The recommended technology per component, and which ones tech-stack.md flagged 🔴 or 🟡 (those are exactly the components likely to blow up a Week 1 timeline — treat a 🔴 AI/ML or data-dependent component as a signal to defer it, not a challenge to include)

Every line of every output file must trace back to something in these two documents. Do not invent components, features, or copy that isn't grounded in them.

## 2. Find the smallest real slice — mvp-plan.md

The Week 1 slice is the smallest piece of the *real* system — not a demo, not a slide — that proves the idea's core promise actually works. Two failure modes to avoid:

- **Too big:** copying architecture.md's entire Phase 1 verbatim when part of it could itself wait a week.
- **Too small / fake:** a mockup-only "MVP" that doesn't touch the real booking logic, real data model, or whatever component the idea's core promise actually depends on. If the idea's must-work-on-day-one claim depends on a specific guarantee (e.g. zero double-bookings, exactly-once send, correct pricing), Week 1 must include the mechanism that guarantees it, not a stub.

Defer anything gated on data that doesn't exist yet (AI/ML models with no training data), anything tech-stack.md rated 🔴 for sequencing reasons, and any component the architecture's own Build Order already places in a later phase — unless that phase is small enough to also fit in a week.

Write the result to `project-blueprint/mvp-plan.md` using the structure in `template.md` in this skill's directory. Follow that structure exactly — it's what keeps every mvp-plan.md in this repo comparable. Overwrite any prior version.

## 3. Build a real mockup — mockup.html

Produce one self-contained HTML file at `project-blueprint/mockup.html`: a single static page showing the idea's main screen — whichever screen a user would actually look at first (a landing page if the idea is pre-launch/marketing-led, or the core app view if the idea is utility-led — pick based on what architecture.md's "must do well on day one" line implies).

Requirements:

- **Real content, not lorem ipsum.** Write actual sample copy for THIS idea: real-sounding names, real-sounding numbers, real labels pulled from the component list and data flow in architecture.md. If the idea is a booking app, show actual field names, actual time slots, an actual price — not "Item 1", "$XX.XX", "Lorem ipsum dolor."
- **Real layout, not a wireframe.** Actual visual hierarchy, spacing, a real color palette (pick 2-3 colors that fit the idea's tone — don't default to generic Bootstrap blue unless the idea is genuinely enterprise-neutral), and icons (inline SVG or a small unicode/emoji set — no external icon font or CDN, this file must be fully self-contained with zero network requests).
- **All CSS inline in a `<style>` block** in the same file. No external stylesheets, fonts, or scripts. The file must open correctly from disk with no server and no internet connection.
- **Visually appealing, not a component inventory.** This is meant to be shown to a person to get a reaction, not to enumerate UI elements. Favor one polished, complete screen over many half-built ones.

Overwrite any prior version.

## 4. Generate a real one-pager PDF — one-pager.pdf

Produce one page of marketing copy for the idea — what it does, who needs it, one sentence on why it matters — written the way a pitch is written, not the way an architecture doc is written:

- Short, punchy lines. No technical jargon, no component names, no technology names.
- A small number of icons or visual accents (emoji or simple inline shapes are fine).
- One clear headline, a short "who this is for" line, 3-5 short benefit lines (not feature lines — benefits, in the reader's terms), and a one-sentence close on why it matters now.

This must be generated as a **real PDF file**, not text saved with a `.pdf` extension and not an HTML/Markdown file renamed. Pick exactly one generation path based on what's actually available in this environment, and use it:

1. **Headless Chrome print-to-PDF** if a Chrome/Chromium/Edge binary is reachable on PATH — build a small standalone HTML file for the one-pager content (separate from mockup.html, since this is a different document with different content), then print it to PDF headlessly.
2. **Python + reportlab**, if Python is available — write a small script that lays out the headline, audience line, benefit lines, and close, and renders it to PDF directly.
3. **Node + puppeteer**, if Node is available and puppeteer can be installed/used — same approach as (1) but driven from Node.

Write whatever generator script or intermediate HTML the chosen path needs into the scratchpad directory (not into `project-blueprint/`) — the only files that belong in `project-blueprint/` are the three deliverables plus whatever already lived there. Then invoke **one** Bash command (a single chained invocation is fine, e.g. installing a missing dependency and immediately running the script, is fine as one call) that actually produces `project-blueprint/one-pager.pdf`. Do not use Bash to explore the environment, list installed packages speculatively, or run anything unrelated to producing this one file — check for tool availability by attempting the command itself, not by a separate probing call first, and fall through to the next path in the priority order above only if the attempt actually fails.

Overwrite any prior version.

## Rules

- Every checklist item in mvp-plan.md must trace to architecture.md or tech-stack.md — no invented scope, no generic "set up CI/CD" filler that isn't grounded in the idea.
- mockup.html and the one-pager must both be written *for this specific idea* — if the copy would work unchanged for a different project, it's too generic; go back and use the idea's actual nouns (facility names, field names, whatever the real domain objects are).
- Never write the PDF as a text file with a `.pdf` extension, and never skip PDF generation and hand back an HTML file instead — if no PDF generation path is actually available in the environment, say so explicitly to the user rather than silently substituting a different file type.
- Keep Bash usage to the single command (or single chained command) that generates the PDF. Everything else in this skill — reading inputs, writing mvp-plan.md, writing mockup.html — uses Read and Write only.
- Report back the exact paths of all three files, one line on what each contains, and which tool actually generated the PDF.
