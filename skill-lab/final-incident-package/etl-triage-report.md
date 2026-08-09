# ETL Failure Triage — orders-pipeline

**Run ID:** `orders_pipeline_20260803_0200`
**Log:** `skill-lab/orders-pipeline-failure.log`
**Metadata:** `skill-lab/pipeline-run-metadata.md`
**Mode:** Read-only diagnostic pass. No pipeline code changed, no job rerun.

## 1. Incident Summary

The `orders-pipeline` daily run (`orders_pipeline_20260803_0200`, scheduled 02:00 UTC on 2026-08-03) failed on both its initial attempt and its single retry, at the `transform.map_region_code_to_region_name` step, with `MappingKeyError`. Zero rows were loaded into `warehouse.fact_orders` on either attempt; the run was dead-lettered after retry exhaustion. This is the first failure since the upstream source (`orders_saas_export`) rolled out a v2 API contract on 2026-08-02.

## 2. Evidence

- **Schema change, both attempts:** extract succeeded (`extract_success`, 11 rows) but returned `region_code` where the pipeline contract expects `region` — log lines 3 and 11; flagged `SchemaMismatch` (warn) at lines 4 and 12, with note: *"source contract version bumped to v2 on 2026-08-02; column 'region' renamed to 'region_code' and values changed from full names to ISO-style codes."*
- **Transform failure, attempt 1:** log line 6 — `MappingKeyError: KeyError: 'LATAM' not present in ref.region_lookup (3 keys loaded, expected 4 as of source v2)`, `offending_order_ids: ["ORD-1005"]`.
- **Transform failure, attempt 2 (retry):** log line 14 — identical error, same offending value (`LATAM`) and same offending order (`ORD-1005`), 7 minutes after attempt 1 (02:07:09Z vs 02:00:04Z). Run metadata line 12 confirms "no schema change between attempts."
- **Retry exhaustion:** log line 16 — `retry_exhausted`, `attempts_made: 2`, `max_attempts: 2`, `status: dead_lettered`.
- **Reference table staleness:** `pipeline-run-metadata.md` — `ref.region_lookup` holds only `NA`, `EMEA`, `APAC` and was "last updated 2026-06-14," not refreshed since the v2 rollout on 2026-08-02. `LATAM` has no mapping row.
- **Prior run history:** metadata shows 5/5 prior daily runs (2026-07-29 through 2026-08-02) succeeded on the v1 contract; 2026-08-02 was the last success. This is the first failure, immediately following the v2 rollout.
- **Downstream impact:** metadata states `warehouse.fact_orders` was not updated (0 rows loaded either attempt); the executive revenue dashboard will continue showing data as of the 2026-08-02 run.

**Scope note:** This log/metadata pair only explains the `region`/`LATAM` mapping failure for `ORD-1005`. The other defects found in the separate data-quality-gate check on `skill-lab/orders.csv` — the `ORD-1004` duplicate row, the negative `revenue` on `ORD-1006`, and the stale `load_timestamp` on `ORD-1009` — are **not** referenced anywhere in this log or metadata. There is no evidence here connecting them to this pipeline failure; they should be treated as separate, uncorroborated data-quality findings, not as consequences of this incident.

## 3. Ranked Causes

1. **Stale reference/lookup table (`ref.region_lookup`) not updated for the new `LATAM` code — most likely root cause.** The lookup table was last refreshed 2026-06-14, predating the source's v2 rollout (2026-08-02) that introduced `LATAM` as a 4th region code (metadata, "Reference table state at time of failure" and "Source contract change" sections). This is the earliest actionable gap in the pipeline chain: even though the schema rename (`region` → `region_code`) is a real upstream change, the transform step already had a `fallback_column: region_code` path to handle it (log line 5) — it only broke because the lookup table lacked the `LATAM` key.
2. **Upstream source contract change (v2 rollout) not fully propagated — contributing/upstream cause.** The source renamed `region` to `region_code` and changed value format from full names to ISO-style codes as of 2026-08-02 (log lines 4, 12; metadata "Source contract change" section). This is the event that exposed the stale lookup table; without the v2 rollout, the missing `LATAM` key would not yet have surfaced.
3. **Retry strategy did not (and could not) resolve the fault.** Both attempts hit the identical error on the identical offending value with no configuration or data change between them (log lines 6 and 14, metadata line "Attempt 2 (retry)... failed at same stage, same error"), confirming this is a deterministic data/config gap, not a transient blip. This isn't an independent root cause but confirms causes 1–2 are systemic, not transient.

## 4. Next Tests

1. For the lookup-table cause: inspect `ref.region_lookup` for any pending/queued update tied to the v2 rollout (e.g., a migration ticket or scheduled refresh job) to confirm whether a `LATAM` mapping was planned but not yet applied, versus never planned at all.
2. For the source contract-change cause: check whether the source team published a full v2 field/value changelog (region code list) prior to 2026-08-02, and whether the pipeline's contract/schema definitions were updated to match — to determine if this was a missed-communication gap or a genuine unannounced change.
3. For the retry-strategy observation: confirm no automatic remediation (e.g., auto-refresh of `ref.region_lookup`) exists between attempts, and whether `max_attempts=2` / `420s` fixed delay is adequate policy for schema/mapping-class errors versus transient network errors (a config review, not a fix to apply now).

## 5. Escalation Recommendation

**Escalate now.** This meets the incident's own criteria for escalation: the run is dead-lettered (not self-healing), `warehouse.fact_orders` has 0 new rows and is serving stale (2026-08-02) data to the executive revenue dashboard, and the fix requires an out-of-band data change (adding `LATAM` to `ref.region_lookup`) that this triage pass is not authorized to make. Recommend routing to the data engineering owner of `ref.region_lookup` / the `orders-pipeline` for a manual lookup-table update and re-run, since retries alone will not clear this error.
