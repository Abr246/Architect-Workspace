# Enterprise Prompt Library

## What is this?

An **Enterprise Prompt Library** is a shared, organized collection of AI prompts that a company's teams can reuse instead of writing new ones from scratch every time. Think of it like a company's "recipe book" for working with AI: instead of every employee guessing how to phrase a request to get good results, they pull a tested, approved "recipe" (a prompt) that's known to work.

The goal is consistency, quality, and speed — teams don't reinvent the wheel, and the results AI produces are more predictable and trustworthy.

This document describes the standard structure every entry in the library should follow, and explains why each part matters.

---

## Structure of a Prompt Library Entry

Every prompt in the library is documented using five sections: **Name, Version, Description, Usage Example, and Quality Gates.** Below is what each one is and why it exists.

### 1. Prompt Name

**What it is:** A short, unique, human-readable title for the prompt, e.g. `customer-email-summarizer` or `quarterly-report-outline-generator`.

**Why it matters (in plain terms):** Just like files need clear names so people can find them later, prompts need names so employees can search for the right one instead of digging through a pile of text. A good name tells you what the prompt does before you even open it.

**Guidelines:**
- Use plain, descriptive language (avoid internal jargon or codenames).
- Follow a consistent naming pattern, e.g. `[team]-[purpose]-[format]` (example: `sales-outreach-followup-email`).
- Avoid duplicate names — each prompt name should be unique across the library.

---

### 2. Versioning

**What it is:** A tracking number attached to each prompt that changes whenever the prompt's wording or instructions are updated, e.g. `v1.0`, `v1.1`, `v2.0`.

**Why it matters (in plain terms):** Prompts get improved over time — someone tweaks the wording to get better results, or fixes a mistake. Versioning is like keeping a history of drafts of an important document: if a new version suddenly produces worse results, teams can see exactly what changed and roll back to the version that worked. Without versioning, "the prompt" becomes a moving target and nobody can explain why results changed last week.

**Guidelines:**
- Use a simple numbering scheme: increase the number after the decimal point (`v1.0 → v1.1`) for small wording tweaks, and increase the whole number (`v1.1 → v2.0`) for major changes in purpose or behavior.
- Keep a short changelog note with each version (what changed and why).
- Never silently overwrite an existing version — always create a new one so past results stay explainable.

---

### 3. Description

**What it is:** A short paragraph explaining what the prompt is for, when to use it, and what kind of output it produces.

**Why it matters (in plain terms):** This is the "back of the recipe box" summary. A busy employee should be able to read two or three sentences and know immediately: "Yes, this is the prompt I need," or "No, this isn't right for my situation." Without a clear description, people either misuse prompts for the wrong purpose or waste time testing prompts that don't fit their need.

**A good description answers:**
- **Purpose:** What problem does this prompt solve?
- **Audience:** Who is this prompt meant for (e.g., sales, HR, marketing)?
- **Output:** What does the result look like (an email draft, a summary, a list, a report outline)?
- **Limitations:** What this prompt is *not* good for, if relevant.

---

### 4. Usage Examples

**What it is:** A concrete, realistic sample showing the prompt being used — the input someone would provide, and the kind of output it produces.

**Why it matters (in plain terms):** Reading a description tells you *what* a prompt does; seeing an example tells you *how* to actually use it correctly. This is the difference between a recipe that just lists ingredients versus one that shows a photo of the finished dish. Examples reduce trial-and-error, help new employees onboard faster, and make it obvious what "good output" looks like so people can judge if the AI's response seems right.

**A good usage example includes:**
- A sample input (e.g., the raw customer email, meeting notes, or data provided to the prompt).
- The resulting output (e.g., the summary, draft, or answer the prompt generated).
- Any notes on when this example might need adjustment (e.g., "swap the product name for your own product").

---

### 5. Quality Gates

**What it is:** A checklist of conditions the prompt's output must meet before it can be trusted or used in real work — like a quality inspection before a product ships.

**Why it matters (in plain terms):** AI output isn't automatically correct or safe to use. Quality gates are the guardrails that catch mistakes, bias, missing information, or inappropriate content *before* it reaches a customer, a report, or a decision-maker. This is similar to a proofreading or fact-checking step before publishing — it's what turns "AI wrote something" into "this is safe and ready to use."

**Typical quality gates include:**
- **Accuracy check:** Does the output match the facts/data it was given, with nothing invented?
- **Tone and brand check:** Does it sound professional and match company voice?
- **Completeness check:** Does it address everything the request asked for?
- **Sensitive content check:** No confidential, biased, or inappropriate content included.
- **Human review required:** Does this output need a person to approve it before use, or is it safe to use as-is?
- **Failure handling:** What should the employee do if the output fails a check (e.g., retry with more detail, escalate to a specialist, or discard)?

---

## Why This Structure Matters, Overall

Without a shared structure, prompts end up scattered across emails, chat messages, and individual employees' notes — impossible to find, impossible to trust, and impossible to improve. By requiring every prompt to have a **Name**, **Version**, **Description**, **Usage Example**, and **Quality Gates**, the library becomes:

- **Searchable** — people can find the right prompt quickly.
- **Trustworthy** — results are reviewed and quality-checked, not just assumed to be correct.
- **Improvable over time** — versioning lets the company learn what works and refine it, without losing history.
- **Easy to onboard new employees** — examples and descriptions mean less hand-holding and fewer mistakes.

In short: this structure turns ad-hoc AI usage into a reliable, auditable company resource — the same way a shared style guide or a template library brings consistency to written documents.
