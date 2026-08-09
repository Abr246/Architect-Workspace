---
name: data-quality-gate
description: Use when the user explicitly asks to validate a dataset, CSV, or ETL output; run data-quality checks; or confirm publish-readiness of data feeding a dashboard or report (e.g. "validate this CSV", "is this data ready to publish", "run the quality gate before we load this"). Checks the data against a quality contract and returns PASS, WARN, or FAIL with evidence and a PUBLISH or BLOCK recommendation. Do NOT use for ordinary requests to write/run SQL, calculate a metric, or design/build a dashboard — those alone are not validation requests. Only invoke if the user is asking to check, validate, or gate the data itself, not merely to query, compute, or visualize it.
---

# Data Quality Gate

## Scope — when this skill applies

- **Triggers:** validating a dataset/CSV/ETL output, running data-quality checks, or confirming publish-readiness of data before it feeds a dashboard or report.
- **Does not trigger on its own for:** writing or running SQL, calculating a metric, or designing/building a dashboard. Those are normal analysis/build tasks — do not invoke this skill for them unless the user is also explicitly asking to validate the underlying data or gate its publish-readiness.

## 1. Require a dataset path

- Ask for (or use the supplied) path to the dataset file. Do not guess a path.
- If the path does not exist or cannot be read, stop and report FAIL / BLOCK with that as the evidence — do not proceed to checks.

## 2. Load the quality contract

- Look for a supplied quality contract (a path given by the user, or a `quality-contract.md` / `quality-contract.json` file alongside the dataset).
- If a contract is found, use its rules as-is.
- If no contract is found, fall back to these defaults and note the fallback in the output: a primary/key column must be unique, no column may be entirely empty, no negative values in columns that represent money or counts, and rows must be present (row count > 0).

## 3. Run the checks

Evaluate the dataset read-only. Never write to, overwrite, or reformat the source file.

Checks: schema, freshness, expected volume, key uniqueness, duplicates, required fields, nulls, numeric rules.

**Before running the checks, read `references/quality-checks.md`** — it has the full definition, edge-case handling, and evidence requirement for each check. Do not skip it; the short names above are not sufficient to run the checks correctly (e.g. freshness ambiguity handling, duplicates vs. key-uniqueness distinction).

## 4. Report results

Return one table with these columns:

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|

- **Evidence** must cite concrete values (row numbers, IDs, counts) — not a vague description.
- **Status** is PASS, WARN, or FAIL per row.
- **Recommended Action** is a specific next step (e.g., "dedupe row 12", "backfill region on ORD-1005").

## 5. Finish with a verdict

- End with one overall status: **PASS**, **WARN**, or **FAIL** (FAIL if any check fails; WARN if any check warns and none fail; PASS only if every check passes).
- End with one recommendation: **PUBLISH** or **BLOCK** (BLOCK on any FAIL; BLOCK or PUBLISH-with-caveats on WARN, at the caller's judgment; PUBLISH only on overall PASS).

## Rules

- Never modify, sort, dedupe, or otherwise alter the source data file. This is a read-only gate.
- Stay procedural and concise — run the checks, fill the table, state the verdict. No narrative padding.
