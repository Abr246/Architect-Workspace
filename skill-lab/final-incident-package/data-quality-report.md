# Data Quality Gate Report — Orders Dataset

**Dataset:** `skill-lab/orders.csv`
**Contract:** `skill-lab/quality-contract.md`
**Mode:** Read-only validation — source data not modified.

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | All required columns present: `order_id, customer, region, product, quantity, revenue, load_timestamp` | PASS | None |
| Freshness | `ORD-1009` has `load_timestamp=2026-07-30T14:00:00Z` — 4 calendar days before today (2026-08-03), unambiguously exceeds the 24h max-age rule. Additionally, `ORD-1003` (2026-08-02T22:47:00Z), `ORD-1006` (2026-08-02T19:12:00Z), and `ORD-1010` (2026-08-02T23:58:00Z) sit within ~24h of the boundary; exact current time-of-day is not known, so these cannot be conclusively judged and are flagged WARN rather than PASS/FAIL. | FAIL | Investigate why `ORD-1009` was not refreshed by the last load; re-run or purge stale row before publish. Confirm exact "now" timestamp to resolve the 3 boundary rows. |
| Expected volume | 12 data rows present (row count ≥ 10 required by contract) | PASS | None |
| Key uniqueness | `order_id = ORD-1004` appears twice — row 6 (line 6, `Derek Owusu`) and row 13 (line 13, `Derek Owusu`) | FAIL | Dedupe `ORD-1004` — remove or reconcile the duplicate row (line 13) at the source system before re-ingest. |
| Duplicates | Rows 6 and 13 are fully identical across every column: `ORD-1004,Derek Owusu,North America,Widget Pro,3,900.00,2026-08-03T07:30:00Z` | FAIL | Same as above — one full duplicate pair to remove. |
| Required fields | `region` is blank on row 7, `ORD-1005` (`Elena Petrova`) | FAIL | Backfill `region` on `ORD-1005` from source system before publish. |
| Nulls | Contract defines no null-rate threshold beyond the `region` required-field rule (covered above) | N/A | Not applicable — no threshold in contract. |
| Numeric rules | `revenue` must be > 0; row 8, `ORD-1006` (`Farid Haidari`) has `revenue = -150.00` | FAIL | Investigate negative revenue on `ORD-1006` — likely a refund/return miscoded as a sale, or an upstream sign error. Correct or exclude before publish. |

## Overall Status: **FAIL**

## Recommendation: **BLOCK**

Five of seven applicable checks failed (freshness, key uniqueness, duplicates, required fields, numeric rules). The dataset is not safe to publish in its current state.

**Next step:** Investigate the pipeline itself (`skill-lab/orders-pipeline-failure.log`, `skill-lab/pipeline-run-metadata.md`) to determine whether these data defects trace back to a pipeline failure — per the incident workflow, this is an ETL triage question, not a further data-quality question.
