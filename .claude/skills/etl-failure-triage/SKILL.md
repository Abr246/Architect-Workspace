---
name: etl-failure-triage
description: Use when the user asks why an ETL or ELT pipeline, scheduled load, SQL job, data refresh, or ingestion process failed or produced suspicious output. Reviews logs and run metadata, ranks likely causes, cites evidence, and recommends the next safe diagnostic steps.
---

# ETL Failure Triage

## Scope — when this skill applies

- **Triggers:** the user asks why a pipeline/scheduled load/SQL job/data refresh/ingestion run failed, errored, or produced suspicious output, and wants the failure diagnosed.
- **Does not trigger on its own for:** writing new pipeline code, designing a pipeline, or general SQL/data questions unrelated to a failure. Those are build/analysis tasks, not incident triage.

## 1. Require evidence

- Require a log file, run output, or a concrete failure description. Do not guess at a path — ask for one if not supplied.
- If no log, output, or description is available, stop and say so; do not fabricate a failure narrative.

## 2. Read run metadata when supplied

- If a run-metadata file (run ID, schedule, source/target config, row counts, prior run history) is supplied or sits alongside the log, read it. It provides the facts needed to distinguish a one-off blip from a recurring failure pattern.

## 3. Diagnose

**Before ranking causes, read `references/common-failures.md`** — it catalogs common ETL/ELT failure signatures (schema mismatch, type/conversion errors, retry-without-fix patterns, upstream unavailability, etc.) and the log evidence each one leaves behind. Do not skip it; matching a signature without it risks citing the wrong cause.

- Separate **facts** (directly observed in the log/metadata — timestamps, error strings, row counts, exit codes) from **hypotheses** (your inference about why those facts occurred).
- Every likely cause must cite the specific evidence (log line, timestamp, field name) that supports it. No cause without a citation.
- Rank causes most-likely to least-likely based on evidence strength and fit with the failure signature.
- For each ranked cause, give one concrete next diagnostic step (e.g., "inspect source schema for `region` as of the last successful run", "check upstream extract for null-region rows") — not a fix, a next test.

## 4. Hard constraints

- **Do not change pipeline code.** This is a read-only diagnostic pass.
- **Do not rerun jobs.** Triage from existing evidence only.
- **Do not claim a root cause without evidence.** If evidence is insufficient to rank causes confidently, say so explicitly rather than picking one.

## 5. Report results

Return exactly these sections, in order:

1. **Incident Summary** — what happened, when, in 2-3 sentences.
2. **Evidence** — the facts pulled from the log/metadata, cited concretely (line numbers, timestamps, error text).
3. **Ranked Causes** — ordered list, each with its supporting evidence citation.
4. **Next Tests** — one concrete diagnostic step per ranked cause.
5. **Escalation Recommendation** — whether this needs human/on-call escalation now, and why (or why not).
