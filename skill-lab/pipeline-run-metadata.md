# Pipeline Run Metadata — orders_pipeline

**Run ID:** `orders_pipeline_20260803_0200`
**Pipeline:** `orders-pipeline` (extract from `orders_saas_export` → transform/map → load into `warehouse.fact_orders`)
**Schedule:** daily @ 02:00 UTC
**Status:** FAILED (retry exhausted, dead-lettered)
**Log file:** `skill-lab/orders-pipeline-failure.log`

## Run summary

| Field | Value |
|---|---|
| Attempts made | 2 of 2 (max_attempts reached) |
| Attempt 1 | 2026-08-03T02:00:00Z – 02:00:05Z, failed at `transform.map_region_code_to_region_name` |
| Attempt 2 (retry) | 2026-08-03T02:07:05Z – 02:07:10Z, failed at same stage, same error |
| Retry strategy | fixed_delay, 420s, max_attempts=2 |
| Rows extracted (both attempts) | 11 |
| Rows loaded (both attempts) | 0 |
| Final outcome | `retry_exhausted` → dead-lettered to `warehouse.dead_letter.orders_pipeline_20260803_0200` |

## Source contract change

- `orders_saas_export` bumped its API contract to **v2** on **2026-08-02**.
- Column previously named `region` (full region names: `North America`, `EMEA`, `APAC`) was renamed to `region_code` and now emits short codes.
- As of v2, the source also introduced a 4th region code, `LATAM`, not previously seen.

## Schema comparison

| Expected column (pipeline contract) | Found in source (both attempts) | Match? |
|---|---|---|
| `order_id` | `order_id` | yes |
| `customer` | `customer` | yes |
| `region` | `region_code` | **no — renamed** |
| `product` | `product` | yes |
| `quantity` | `quantity` | yes |
| `revenue` | `revenue` | yes |
| `load_timestamp` | `load_timestamp` | yes |

## Reference table state at time of failure

`ref.region_lookup` (used by the `map_region_code_to_region_name` transform step):

| Key loaded? | Code | Maps to |
|---|---|---|
| yes | `NA` | North America |
| yes | `EMEA` | EMEA |
| yes | `APAC` | APAC |
| **no** | `LATAM` | *(no mapping row exists)* |

`ref.region_lookup` was last updated 2026-06-14 and has not been refreshed since the source's v2 rollout on 2026-08-02.

## Prior run history (last 5 runs before this failure)

| Run date | Status | Rows loaded | Notes |
|---|---|---|---|
| 2026-08-02 | success | 10 | last run on source v1 contract (`region` column, full names) |
| 2026-08-01 | success | 10 | — |
| 2026-07-31 | success | 9 | — |
| 2026-07-30 | success | 10 | — |
| 2026-07-29 | success | 10 | — |

This is the first failure since the source's v2 contract rollout; all prior runs on the v1 contract succeeded.

## Downstream impact

- `warehouse.fact_orders` was not updated by this run (0 rows loaded on both attempts).
- The executive revenue dashboard reads from `warehouse.fact_orders` and will show data as of the 2026-08-02 successful run until this is resolved.
