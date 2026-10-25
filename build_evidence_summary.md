# My Build Evidence — CCA-Foundations Readiness

This document summarizes real work I've built, as evidence for my gap analysis
(no numeric knowledge-check scores were available — course platform only shows
"completed," not a score).

---

## 1. Custom Claude Code Subagents (`.claude/agents/`)
Maps to: **Agentic Architecture & Orchestration**, **Claude Code Configuration & Workflows**

I designed 5 custom subagents with distinct roles, tool restrictions, and
required output formats — not just used defaults:

- **data-analyst** — read-only data profiling/analysis agent, restricted to
  Read/Grep/Glob/Bash, forbidden from touching production data, must report
  in a fixed structure (Dataset, Method, Findings, Data quality, Confidence).
- **editor** — implements one scoped, pre-approved change only. No scope
  expansion, must run typecheck after every edit, must stop (not guess) if
  the plan doesn't match the real code.
- **explorer** — read-only codebase mapping agent, searches broadly (Glob/Grep)
  before reading, traces data flow across defined architecture layers, never
  speculates on things it can't confirm from what it read.
- **reviewer** — read-only risk/correctness reviewer with 4 mandatory checks:
  idempotency, contract validation, failure-path handling, sensitive-data
  exposure. Returns a scored verdict (PASS/CHANGES_REQUESTED/BLOCK).
- **tester** — independent verification agent. Runs named test commands,
  classifies failures, never edits code/tests to force a pass, caps retries
  at 2.

This is direct, hands-on evidence of designing an orchestrated multi-agent
setup with explicit role separation (explore → review → edit → test), not
just following a single-agent tutorial.

---

## 2. Two MCP Servers Built From Scratch
Maps to: **Tool Design & MCP Integration**

**order-status-mcp/** — a working, tested Python MCP server (`server.py`,
14KB) with its own Python environment (`pyproject.toml`, `uv.lock`, `.venv`).

**mcp-server/** — a second MCP server, deliberately reusing the same Python
toolchain as `order-status-mcp` rather than introducing a second stack. Verified
using the MCP Inspector CLI:

```
npx --yes @modelcontextprotocol/inspector --cli <python> mcp-server/src/server.py --method tools/list
```

confirmed a clean `{"tools": []}` response — proof the server starts and
speaks MCP correctly before any tools were added.

This is real, tested MCP integration work — building the server, not just
connecting to someone else's.

---

## 3. Structured-Output Prompt Engineering (`prompts/score-noshow-risk/`)
Maps to: **Prompt Engineering & Structured Output**

A versioned prompt (v1.0.0 → v1.1.0) for scoring no-show risk on facility
bookings, with:
- Strict output contract: JSON only, no markdown fence, exactly 2 fields,
  `risk_category` constrained to 3 exact string values.
- Explicit handling of 3 edge cases: missing data, ambiguous/conflicting
  signals, and the "nothing to report" case (must never return empty).
- A real correction between versions: v1.0.0 mis-classified a severe-weather
  case as High risk; v1.1.0 fixed it by splitting "customer-behavior extreme"
  (can justify High alone) from "conditions-based extreme" (capped at Medium).
- An `eval.jsonl` file for testing prompt behavior against cases.

This shows structured-output design plus iteration based on a real evaluation
failure — not just a one-shot exercise.

---

## 4. Data Quality Gate + ETL Failure Triage (`skill-lab/`)
Maps to: **Context Management & Reliability** (partial — data reliability, not
long-context/agent-memory management)

- **Data Quality Report** — validated an orders dataset against a written
  quality contract, found 5 hard failures (duplicate key, duplicate row,
  missing required field, negative revenue, stale record), verdict: BLOCK,
  with a specific remediation list.
- **ETL Triage Report** — root-caused a real pipeline failure (`MappingKeyError`
  on `LATAM` region code) back through 3 ranked causes: stale reference table
  → upstream API contract change → confirmed retry couldn't self-heal it.
  Ends with an explicit escalation recommendation per repo policy.

This is evidence of reliability/failure-analysis thinking, but notably NOT
evidence of context-window management, long-running agent memory, or
multi-turn context strategies — which is the specific gap in the
**Context Management & Reliability** domain (self-rated 1-2, and this
evidence doesn't contradict that rating).

---

## Summary: what this evidence suggests

| Domain | Self-rating | What the evidence shows |
|---|---|---|
| Tool Design & MCP Integration | 4 | Confirmed — 2 real, tested MCP servers |
| Agentic Architecture & Orchestration | 2 | Possibly underrated — 5 custom agents with real role/tool separation exist, though they follow a known explore/review/edit/test pattern rather than a novel design |
| Claude Code Configuration & Workflows | 2 | Some real custom config exists (agents, likely hooks/skills too) — worth re-checking this rating |
| Prompt Engineering & Structured Output | 2-3 | Confirmed — real structured-output prompt with versioned iteration |
| Context Management & Reliability | 1-2 | Confirmed — no evidence of context-window/agent-memory work; reliability evidence here is about data pipelines, not Claude context management specifically |
