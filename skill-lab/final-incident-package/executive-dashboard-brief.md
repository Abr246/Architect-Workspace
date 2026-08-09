# Executive Dashboard Brief

**Status:** BLOCKED

**Business Impact:** Impact has not been quantified. The orders dashboard will not receive today's refresh and continues serving data as of the last successful load (2026-08-02); the underlying dataset also failed data-quality checks (a duplicate order, a missing region, an invalid negative revenue value, and a stale record) and was independently found unsafe to publish.

**What We Know:**
- The data-quality gate on `orders.csv` returned an overall **FAIL** with a **BLOCK** recommendation: a duplicate order record (`ORD-1004`), a missing region on one order (`ORD-1005`), a negative revenue value on one order (`ORD-1006`), and one order with a stale load timestamp (`ORD-1009`).
- The scheduled pipeline run failed on both its initial attempt and its retry, at the region-mapping transform step, and was dead-lettered after retries were exhausted — zero rows were loaded to the warehouse table the dashboard reads from.
- The triage's leading (not confirmed-certain) explanation is that a reference lookup table used to map region codes was not updated to include a new region code introduced by an upstream source change on 2026-08-02.
- The triage explicitly notes the pipeline failure log only accounts for the missing-region issue; it does not establish a connection to the duplicate, negative-revenue, or stale-timestamp findings from the data-quality gate — those remain separate, unexplained data issues.

**What We Do Not Know:**
- Whether the reference lookup table gap was a missed step in a planned update or a fully unannounced upstream change.
- Root cause of the duplicate order, negative revenue, and stale-record findings — no evidence yet ties them to the pipeline failure.
- Estimated time to resolution.

**Decision or Action Needed:** Leadership sign-off to keep the orders dashboard publish held until both (a) the pipeline's region-mapping failure is resolved and successfully re-run, and (b) the four data-quality findings are corrected and revalidated.

**Owner:** Not yet assigned.

**Next Update:** Pending confirmation.
