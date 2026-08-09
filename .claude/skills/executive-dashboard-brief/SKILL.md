---
name: executive-dashboard-brief
description: Use when the user asks to turn a data-quality result, failed refresh, pipeline incident, KPI variance, or technical investigation into an executive dashboard update. Produces a concise leadership brief containing status, business impact, verified evidence, decision needed, owner, and next update time.
---

# Executive Dashboard Brief

## Scope — when this skill applies

- **Triggers:** converting a data-quality report, ETL/pipeline failure triage, KPI variance finding, or other technical investigation into an update meant for the executive dashboard / leadership audience.
- **Does not trigger on its own for:** running the underlying investigation itself (use `data-quality-gate` or `etl-failure-triage` for that) or general engineering status updates that aren't dashboard/leadership-facing.

## 1. Require a source report

- Use the supplied quality report, triage report, or investigation output as the sole source of facts.
- This skill summarizes and translates an existing finding for leadership — it does not investigate, re-run checks, or gather new evidence.
- If no source report or finding is supplied, stop and ask for one; do not invent an incident to summarize.

## 2. Separate verified facts from unresolved questions

- Every statement placed under "What We Know" must trace directly to something explicitly stated in the source report (a check result, a ranked cause, a row/count, a verdict).
- Anything not directly evidenced in the source report — cause certainty, downstream effects, timing, ownership — belongs under "What We Do Not Know" unless the source report states it explicitly.

## 3. Never invent

- **Financial/business impact:** never invent a dollar figure or quantified impact. If the source report doesn't quantify impact, describe it qualitatively (e.g., "dashboard is serving stale data") or state plainly that impact has not been quantified.
- **Cause:** never state a cause with more certainty than the source report gave it. If the source report ranked causes rather than confirming one, say so.
- **Owner:** never assign a person or team who isn't named in the source report or supplied context. If none is named, write "Owner: not yet assigned."
- **Timing:** never invent a next-update time or ETA. If none is supplied, state that a next-update time is pending confirmation.

## 4. Keep it executive-level

- No raw logs, stack traces, JSON, correlation IDs, or line-number citations — leadership needs the conclusion, not the evidence trail.
- One to two sentences per section. This is a brief, not a report.

## 5. State the dashboard status explicitly

- Always state whether the dashboard should remain blocked/held or can proceed, based on the source report's own verdict (e.g., a data-quality gate's BLOCK/PUBLISH call, or a triage's escalation recommendation).
- Do not soften, hedge, or reverse the source report's verdict when restating it for leadership.

## 6. Use template.md for structure

- Before writing the brief, read `template.md` in this skill's folder and fill in its section structure exactly as written.
- Do not reorder, rename, merge, or drop any of its sections.

## Return

Exactly these sections, in this order, per `template.md`:

1. **Status**
2. **Business Impact**
3. **What We Know**
4. **What We Do Not Know**
5. **Decision or Action Needed**
6. **Owner**
7. **Next Update**
