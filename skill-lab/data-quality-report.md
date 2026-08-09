# Data Quality Report — Orders Dataset

**Dataset:** `skill-lab/orders.csv`
**Contract:** `skill-lab/quality-contract.md`
**Run date:** 2026-08-03

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | All required columns present: `order_id, customer, region, product, quantity, revenue, load_timestamp` | PASS | None |
| Expected volume | 12 data rows (11 distinct order_ids); contract minimum is 10 | PASS | None |
| Key uniqueness (`order_id`) | `ORD-1004` appears twice — row 5 (line 5) and row 12 (line 13), identical values | FAIL | Dedupe row 12 (line 13); keep the row-5 (line 5) instance |
| Full-row duplicates | Row 5 (line 5) and row 12 (line 13) are byte-for-byte identical (`ORD-1004, Derek Owusu, North America, Widget Pro, 3, 900.00, 2026-08-03T07:30:00Z`) | FAIL | Remove duplicate row 12 (line 13) at source before load |
| Required field (`region`) | `ORD-1005` (Elena Petrova, row 5 of data / line 6) has a blank `region` value | FAIL | Backfill region on `ORD-1005` before publish |
| Numeric rule (`revenue > 0`) | `ORD-1006` (Farid Haidari, line 7) has `revenue = -150.00` | FAIL | Investigate `ORD-1006`: likely a refund/return miscoded as an order — correct or exclude from revenue rollups |
| Freshness (`load_timestamp` < 24h old) | `ORD-1009` (Ines Duarte, line 10) has `load_timestamp = 2026-07-30T14:00:00Z`, ~4 days old as of 2026-08-03 — unambiguously stale under any current time-of-day | FAIL | Re-extract/refresh `ORD-1009` or exclude it until its load timestamp is current |
| Freshness (borderline rows) | Three rows dated `2026-08-02` (`ORD-1003` 22:47Z, `ORD-1006` 19:12Z, `ORD-1010` 23:58Z) fall within 24h of some but not all possible current times on 2026-08-03; exact current time-of-day was not available to this check | WARN | Confirm the actual "now" timestamp used for freshness gating and re-verify these three rows against it |

## Verdict

**Overall status: FAIL** (multiple hard failures: duplicate key, duplicate row, missing required field, negative revenue, stale record)

**Recommendation: BLOCK**

Do not publish to the executive revenue dashboard until:
1. The duplicate `ORD-1004` row is removed.
2. `ORD-1005`'s missing `region` is backfilled.
3. `ORD-1006`'s negative revenue is corrected or excluded.
4. `ORD-1009` is refreshed or excluded for staleness.
5. The three borderline `2026-08-02` rows are re-checked once the exact "now" reference time is known.

Source file `orders.csv` was read-only; no modifications were made to it.
