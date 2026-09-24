# How to Build a Skill — Fill-In Template

This document is a form. Copy the blank template near the bottom, replace everything in `[brackets]`, and save it as a file named `SKILL.md` inside its own folder. No coding experience is required — you're mostly writing plain sentences in specific boxes.

**What a Skill actually is, in one sentence:** a short instruction sheet that Claude reads only when the current task matches it — like keeping a labeled binder on a shelf that only gets pulled down when its label matches the job at hand.

---

## Before you fill anything out, answer three questions on paper

Don't open the template yet. Answer these first — everything else falls out of your answers:

1. **What's the recurring task?** Not "help with reports" (too vague) — something specific and repeatable, like "check a spreadsheet for missing columns before it's published."
2. **What should trigger it?** What would someone actually type or ask when they need this? Write down 2-3 example phrases a real person would use.
3. **What should NOT trigger it?** What's a similar-sounding request that this Skill should stay out of? (This is the step people skip, and it's the one that prevents Claude from grabbing the wrong instructions later.)

If you can't answer all three clearly, the task may be too broad for one Skill — consider splitting it.

---

## Section-by-section explanation

### 1. The Frontmatter (the label on the folder)

"Frontmatter" is just a short block of facts at the very top of the file, sandwiched between two lines that each say `---`. Think of it as the label on the spine of a binder — it's the only part read before deciding whether to open the whole thing.

| Field | Plain-English meaning | Rules of thumb |
|---|---|---|
| `name` | The short nickname for this Skill. | All lowercase, words separated by hyphens (e.g. `expense-report-check`). This becomes the typed shortcut, so keep it short and don't rename it later — other documents may refer to it by this exact name. |
| `description` | The single most important sentence(s) you'll write. Explains *when* to use this Skill and *when not to*. | See the deep-dive below — this field alone decides whether the Skill gets used correctly. |
| `allowed-tools` | A plain list of what capabilities this Skill is permitted to use (e.g. reading files, writing files, running a check). Optional — only include it if you want to limit what the Skill can do. | If the task is "look something up and report back," don't grant permission to change or delete anything. Only hand out the capabilities the task actually needs — the same way you wouldn't give a visitor a master key just to let them read the lobby noticeboard. |

### 2. The Description — deep dive (this is the field that does the real work)

Claude is shown *only* this sentence (not the rest of your document) when deciding whether a task matches. If it's vague, the Skill gets missed or misused. Use this formula:

> **Use when** [the specific situation, with 2-3 example phrases a real person would say]. **Do this:** [what the Skill actually produces or checks]. **Do NOT use for** [the nearest similar-but-different situation, and where that belongs instead].

Two worked examples, so you can see the shape:

> *Use when someone asks to validate a dataset, CSV, or spreadsheet before it's published — e.g. "check this file," "is this ready to load," "run the quality check." Confirms the data is complete and consistent, and returns a clear pass/fail with reasons. Do NOT use for simply calculating a number or building a chart from the data — that's a different, more common request and doesn't need this check.*

> *Use immediately after finishing a task that needs to be logged, before calling it "done." Writes a dated entry with a short description of what happened and how it was confirmed correct. Do NOT use for routine chats or questions that didn't produce a finished, verified result.*

**Why the "Do NOT use for" half matters just as much as the "Use when" half:** without it, two similar-sounding Skills will constantly get confused for each other, the same way two consultants who both say "I help with strategy" leave you unsure who to call. Naming the boundary is what lets the right one get picked automatically, every time.

### 3. The Instruction Body (what happens once the Skill is opened)

This is everything below the frontmatter. Unlike the description, this part is only read *after* the Skill has already been selected — so it doesn't need to re-explain when to use it. It should read like a checklist a careful person could follow without having to ask you questions.

- **Scope reminder (optional but recommended):** a one-line restatement of when this applies and doesn't, as a sanity check for whoever (or whatever) is following the steps.
- **Numbered steps:** the actual procedure, in order. Each step should be something a new employee could execute without guessing. Prefer "check X, then do Y" over "handle this appropriately."
- **What "done" looks like:** a clear description of the final output — a table, a written report, a specific file — so there's no ambiguity about whether the task is finished.
- **(Optional) Extra reference material:** if the full rules are long (a detailed checklist, a big table of edge cases), it's fine — and often better — to keep that in a *separate* file next to this one, and simply point to it from a step ("see the detailed checklist in the reference file before scoring"). This keeps the main instructions short and skimmable, with the fine print available only when actually needed.

---

## The blank template — copy this part

```markdown
---
name: [short-name-with-hyphens]
description: Use when [specific situation + 2-3 example phrases someone would actually say]. [What this Skill produces or checks, in one sentence]. Do NOT use for [the nearest similar situation this should stay out of, and where that belongs instead].
allowed-tools: [list only what's needed — e.g. Read, Write — or delete this line entirely if you don't need to restrict anything]
---

# [Skill Title, in plain words]

## When this applies

- **Use this for:** [restate the trigger in one line]
- **Don't use this for:** [restate the boundary in one line]

## Steps

1. [First thing to check or gather]
2. [Second step]
3. [Third step — add as many as needed, but if you're past 6-7, consider whether this should be two Skills instead of one]

## What "done" looks like

[Describe the finished output exactly — a table with these columns, a written summary with these parts, a file saved to this location, etc. Be concrete enough that two different people would agree on whether the task was completed correctly.]
```

---

## Final checklist before you save it

- [ ] The `name` is short, lowercase, hyphenated, and something you're comfortable never renaming.
- [ ] The `description` says both when to use it AND when not to.
- [ ] You tested the description against your 2-3 example phrases from the "before you start" step — would each one clearly match?
- [ ] Every step in the body is specific enough that a new person wouldn't need to ask a follow-up question.
- [ ] You've stated what the finished output looks like, concretely.
- [ ] If you added `allowed-tools`, it only grants what the task genuinely needs — nothing extra "just in case."

Save the finished file as `SKILL.md` inside its own folder, named to match your `name` field (e.g. a Skill named `expense-report-check` lives in a folder called `expense-report-check/`, at `SKILL.md` inside it).
