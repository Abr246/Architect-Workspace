# Common ETL/ELT Failure Signatures Reference

Read this before ranking causes in step 3 of `SKILL.md`. Each entry lists the failure pattern, the log/metadata evidence it typically leaves, and what distinguishes it from adjacent causes.

## Schema mismatch

Source schema no longer matches the pipeline's expected schema (column added/removed/renamed, nullability changed, an upstream system started sending blanks in a previously populated field).

Evidence signature: errors mentioning a specific column name near a load/validate step; row counts that drop sharply at a mapping or validation stage while extract counts stay normal; a field that was previously always populated now showing nulls/blanks in the metadata row-count breakdown.

Distinguish from type/conversion errors: schema mismatch is about a column's presence, name, or nullability; conversion errors are about a column's value failing to cast into the expected type.

## Type or conversion / mapping failure

A transform or load step fails to cast, map, or coerce a value into the target type or enum (e.g., a string that doesn't match an expected code list, a numeric field receiving non-numeric input).

Evidence signature: explicit cast/parse/convert error in the log referencing a field and an offending value; failure occurs at a "transform" or "map" stage rather than "extract" or "load."

## Retry that did not resolve the problem

The job automatically retried (fixed delay, backoff, or manual re-trigger) and failed again with the same or a related error, proving the fault is not transient.

Evidence signature: two or more attempt blocks in the log with the same run window or same upstream data, same or related error signature on each attempt, no configuration or data change between attempts. This rules out "just a network blip" — a genuine transient failure would normally clear on retry.

## Upstream source unavailable / timeout

The extract step cannot reach the source system at all (connection refused, timeout, auth failure to the source).

Evidence signature: connection-level errors (timeout, connection reset, DNS failure, 5xx from a source API) at the extract stage, before any row processing begins. Distinguish from schema/conversion failures, which require the extract to have succeeded first.

## Downstream/target unavailable

The load step cannot write to the target (warehouse connection failure, permission denied, disk/quota exceeded, target table locked).

Evidence signature: errors at the load stage after extract and transform completed successfully; permission or resource-limit language in the error text.

## Partial success / silent data quality issue

The job reports success (exit code 0) but row counts, null rates, or value ranges in the metadata are inconsistent with prior runs — no hard error, but the output is suspect.

Evidence signature: no error in the log, but run metadata shows a row-count or null-rate anomaly versus historical runs. This is a "suspicious output" case, not a hard failure — flag it as such rather than treating it like an exception-driven failure.

## Evidence-citation discipline

For every cause selected from this list, cite the specific log line(s) or metadata field(s) that support it. If a failure doesn't cleanly match one signature (e.g., a schema mismatch that also triggered a conversion error downstream), report both, ranked by which fact appears first / is most upstream in the pipeline — the earliest failure in the pipeline order is usually the root cause; anything after it is often a downstream symptom.
