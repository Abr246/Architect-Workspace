# data-quality-gate — Trigger Test Set

Manual test prompts for verifying the `data-quality-gate` skill triggers reliably on validation/publish-readiness requests and stays silent on ordinary SQL, dashboard-design, or metric-calculation requests.

## Should trigger the skill

1. "Before this data feeds the executive revenue dashboard, validate skill-lab/orders.csv against skill-lab/quality-contract.md. Tell me whether I should PUBLISH or BLOCK."
2. "Can you run a data-quality check on this ETL output CSV — I need to know about duplicates, missing required fields, and staleness before we load it into the warehouse."
3. "Is this query result ready to publish to the weekly ops report? Run it through the quality gate first."

## Should NOT trigger the skill

1. "Write a SQL query that returns total revenue by region for the orders table."
2. "Calculate the month-over-month growth rate for active users from this dataset."
3. "Design a dashboard layout for the executive revenue metrics — what charts and KPIs should we show?"

## Expected output requirements (when the skill does trigger)

- A single results table with exactly these columns: `Check | Evidence | Status | Recommended Action`.
- One row per check actually run (schema, freshness, expected volume, key uniqueness, duplicates, required fields, nulls, numeric rules — nulls may be omitted/marked N/A if the contract sets no null threshold).
- Evidence cites concrete values — row numbers, IDs, counts, actual timestamps — never a vague description.
- Status per row is exactly one of `PASS`, `WARN`, `FAIL`.
- A closing overall verdict: exactly one of `PASS`, `WARN`, `FAIL` (FAIL if any check failed; WARN if any warned and none failed; PASS only if all passed).
- A closing recommendation: exactly one of `PUBLISH` or `BLOCK`.
- Explicit confirmation that the source dataset file was not modified (read-only run).
- If no quality contract file was found, explicit note that default rules were used instead.
- If freshness cannot be conclusively judged (current time-of-day unknown), that ambiguity is stated in the evidence rather than silently resolved to PASS or FAIL.
