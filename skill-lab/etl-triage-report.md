# ETL Triage Report — orders-pipeline

**Run ID:** `orders_pipeline_20260803_0200`
**Status:** FAILED — retry exhausted, dead-lettered
**Triage performed:** 2026-08-03 (read-only; no pipeline code changed, no job rerun)

---

## 1. Incident Summary

The `orders-pipeline` daily run (scheduled 2026-08-03 02:00Z) failed on both its initial attempt and its single retry, at the `transform.map_region_code_to_region_name` step, with `error_class: MappingKeyError`. Zero rows were loaded into `warehouse.fact_orders` on either attempt; the run was dead-lettered after exhausting `max_attempts=2`. This is the first failure since the `orders_saas_export` source rolled its API contract to v2 on 2026-08-02.

## 2. Evidence

- **Extract succeeded both times, with a schema drift.** Line 3 / line 11: `extract_success`, `rows_extracted: 11`, `columns_found` includes `region_code` where `columns_expected` lists `region`.
- **Schema validation flagged the rename but did not hard-fail.** Line 4 / line 12: `schema_validation`, `outcome: "partial"`, `error_class: "SchemaMismatch"`, `missing_column: "region"`, `unexpected_column: "region_code"`. Note text: "source contract version bumped to v2 on 2026-08-02; column 'region' renamed to 'region_code' and values changed from full names to ISO-style codes." The pipeline proceeded using a `fallback_column: "region_code"` (line 5), so the rename alone did not break the run.
- **The hard failure is a lookup-table miss.** Line 6 / line 14: `transform_step_failed`, `error_class: "MappingKeyError"`, `offending_values: ["LATAM"]`, `offending_order_ids: ["ORD-1005"]`, message: `"KeyError: 'LATAM' not present in ref.region_lookup (3 keys loaded, expected 4 as of source v2)"`.
- **Run terminated with 0 rows loaded, exit code 1**, both attempts (line 7, line 15): `rows_loaded: 0`, `failed_stage: "transform.map_region_code_to_region_name"`, `exit_code: 1`.
- **Retry reproduced the identical failure with no intervening change.** Line 12 explicitly notes "same source contract version as attempt 1 (v2); no schema change between attempts." Lines 9–15 (attempt 2, 02:07:05–02:07:09Z) show the same `offending_values: ["LATAM"]`, same `offending_order_ids: ["ORD-1005"]`, same message text as attempt 1.
- **Retry exhausted → dead-lettered** (line 16): `attempts_made: 2`, `max_attempts: 2`, `status: "dead_lettered"`, target `warehouse.dead_letter.orders_pipeline_20260803_0200`.
- **Reference table is stale relative to the source contract change** (metadata lines 41–50): `ref.region_lookup` holds only `NA`, `EMEA`, `APAC`; no row for `LATAM`. It "was last updated 2026-06-14 and has not been refreshed since the source's v2 rollout on 2026-08-02."
- **Prior run history is clean** (metadata lines 52–62): the five runs before this one all succeeded, including 2026-08-02 (10 rows loaded, "last run on source v1 contract"). This confirms the failure correlates with the v2 contract rollout, not a pre-existing intermittent fault.
- **Downstream impact** (metadata lines 64–67): `warehouse.fact_orders` not updated; the executive revenue dashboard is now serving stale data as of the 2026-08-02 run.

## 3. Ranked Causes

**1. `ref.region_lookup` reference table is missing the `LATAM` key — primary/direct cause of the failure.**
Evidence: log line 6 (`KeyError: 'LATAM' not present in ref.region_lookup (3 keys loaded, expected 4 as of source v2)`, `lookup_table_known_keys: ["NA","EMEA","APAC"]`); metadata lines 41–50 (table shows no `LATAM` row, last updated 2026-06-14, not refreshed since the 2026-08-02 v2 rollout). This is the exact stage and exception that produced `exit_code: 1` on both attempts.

**2. Upstream source contract change (v2 rollout, 2026-08-02) — root/systemic cause that introduced the unmapped value.**
Evidence: log line 4 (`SchemaMismatch`, "source contract version bumped to v2 on 2026-08-02; column 'region' renamed to 'region_code'... values changed from full names to ISO-style codes"); metadata lines 21–25 (v2 introduced a 4th region code, `LATAM`, "not previously seen"). The column rename itself was tolerated via `fallback_column` (line 5), so it is upstream context, not the breaking fault — but it is the origin event that made the reference-table gap reachable.

**3. Retry did not and could not resolve the fault — confirms this is a deterministic data-state issue, not a transient blip.**
Evidence: log line 12 ("no schema change between attempts"); identical error content in line 6 vs. line 14; `retry_strategy: "fixed_delay"` with no reference-data refresh between attempts (line 8, line 16). This isn't an independent root cause but it rules out "just retry it" as a resolution path and confirms escalation is warranted rather than waiting for a future scheduled run to self-heal.

## 4. Next Tests

1. **For cause 1 (stale lookup table):** Read-only query against `ref.region_lookup` to confirm its current key set matches the log's `lookup_table_known_keys` (`NA`, `EMEA`, `APAC`) and that `LATAM` is indeed absent. Separately, check whoever/whatever owns refreshes of `ref.region_lookup` (manual process vs. scheduled job) to determine why it wasn't updated alongside the 2026-08-02 v2 rollout.
2. **For cause 2 (source contract change):** Pull the current `orders_saas_export` v2 API/schema documentation (or inspect a read-only sample of the existing extracted data, not a pipeline rerun) to get the authoritative, complete list of region codes v2 now emits — confirm `LATAM` is the only new code and that no other renamed/new fields (beyond `region`→`region_code`) are latent and not yet triggering failures because no offending rows have appeared for them.
3. **For cause 3 (retry-can't-fix):** Inspect the dead-lettered payload at `warehouse.dead_letter.orders_pipeline_20260803_0200` to confirm the full set of affected rows (log indicates only `ORD-1005`/`LATAM` out of 11 extracted rows) and verify the other 10 rows have no other latent mapping gaps that would surface once `LATAM` is added.

## 5. Escalation Recommendation

**Escalate now.** This is a data/reference-table gap caused by an external source contract change (v2 rollout) that was not accompanied by a corresponding reference-data update — the fix (adding a `LATAM` row to `ref.region_lookup`, and confirming there's a process to keep it in sync with the source's region-code enum) is a data-ownership action outside pipeline code, and `warehouse.fact_orders` plus the executive revenue dashboard are currently serving stale (2026-08-02) data. Per this repo's escalation protocol, this qualifies as a directive/reference-data conflict affecting downstream reporting and should be raised to the owner of `ref.region_lookup` / the `orders_saas_export` contract relationship rather than left for the next scheduled run, since the next run will fail identically until the reference table is updated.
