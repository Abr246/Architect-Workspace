# Quality Checks Reference — data-quality-gate

Read this before running step 3 (Run the checks) in `SKILL.md`. It defines each check, how to handle edge cases, and what evidence is required.

## Schema

Required columns present; data type per column matches the contract (or a reasonable inference if the contract doesn't specify types).

Evidence: name every missing or unexpected column, or state "all required columns present" with the full column list.

## Freshness

Compare the most recent value in the load/timestamp column against the contract's max-age rule.

- If the exact current time-of-day is not known, do not guess. A row dated the same calendar day as "now" but without a known time cannot be conclusively judged — flag it **WARN**, not PASS or FAIL, and state the ambiguity explicitly in the evidence.
- A row whose timestamp is unambiguously outside the max-age window (e.g. days old against a 24h rule) is a clear **FAIL** regardless of time-of-day.

Evidence: cite the actual timestamp, the contract's max-age rule, and the row/ID it belongs to.

## Expected volume

Row count against the contract's minimum (and maximum, if specified).

Evidence: state the actual row count and the contract threshold(s).

## Key uniqueness

No duplicate values in the designated key column(s).

Evidence: cite every duplicated key value and every row number/ID involved in the collision.

## Duplicates

No fully duplicate rows (every column identical between two or more rows). This is distinct from key uniqueness: a full-row duplicate always implies a key collision, but a key collision does not require the rest of the row to match. Report both checks separately even when a single pair of rows triggers both.

Evidence: cite the row numbers/IDs of each duplicate pair or group.

## Required fields

No missing/blank values in fields the contract marks required.

Evidence: cite the row number/ID and the specific column name for each violation.

## Nulls

Null/blank rate per column, flagged if it breaches a contract-specified threshold. Skip this check (or note it as not applicable) if the contract defines no null-rate threshold.

Evidence: state the observed null count/rate per flagged column and the contract threshold it breaches.

## Numeric rules

Range, sign, and comparison rules from the contract (e.g. "must be > 0", "must be <= 100").

Evidence: cite the row number/ID and the offending value against the specific rule violated.

## General evidence standard (applies to every check)

Evidence must cite concrete values — row numbers, IDs, counts, actual timestamps — never a vague description like "some rows look off" or "a few duplicates exist." If a check cannot be conclusively resolved (see Freshness above for the canonical example), say so explicitly and mark it WARN rather than picking PASS or FAIL by default.
