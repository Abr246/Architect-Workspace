# Required Sections Rubric

A directive in `/directives` is a runbook, not a design doc. It must let someone who did not write it execute the process correctly on the first try. Score each section as present, present-but-thin, or missing.

## Required sections

1. **Goal** — one or two sentences: what outcome this directive produces and why it exists. A missing Goal section means the reader can't tell if they're even looking at the right doc.

2. **Inputs** — every piece of information, credential reference (by name, never by value), or upstream state the process needs before it can start. If an input is "the current admin_notification_emails setting," name where that setting lives.

3. **Outputs** — what changes as a result of running this: rows written, emails sent, files created. Vague outputs ("updates the system") are a FAIL — outputs must be concrete enough to verify against.

4. **Edge Cases** — what happens on empty input, duplicate runs, partial failure, or an upstream dependency being down. A directive with zero edge cases listed is almost certainly incomplete, since CLAUDE.md's Idempotency & Failure-First Design rules require every side-effecting process to have a defined failure/retry story.

5. **Safety Constraints** — anything that must NOT happen: no production writes without an env check, no duplicate sends, no destructive operations without confirmation. If the directive touches money, identity, or external communications, this section is mandatory, not optional.

6. **Verification** — how a human or script confirms the directive worked: a specific log line, a row count, a test name, a dashboard. "It should work" is not verification. This section is the one CLAUDE.md cares about most — directives without a verification method cannot be validated at all.

## Clarity check for junior developers

Read the directive as if you have never touched this codebase. For each step, ask:

- Does this step reference a file, script, or setting by name, with enough path detail to find it?
- Does this step assume a prior step's output without naming what that output is?
- Would a reasonable junior developer need to ping someone on Slack to proceed? If yes, that's the gap to flag.

## Markdown integrity checklist

- Headers form a sane hierarchy (no jumping from `#` to `###`).
- Every code fence opened is closed.
- Every internal link or path reference (backticked or in markdown link syntax) points to something real — checked by `scripts/check-references.js`, not by eye.
