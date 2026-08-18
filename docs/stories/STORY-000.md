# STORY-000 — Build the GoalKick Command Center

**Release:** Foundation (before r0)
**Owner:** Claude Code (this repo's build agent)
**Status:** Submitted — awaiting platform confirmation

## Narrative

As the project owner, I want a Command Center built before any other part of GoalKick, so that I always have one page showing what is being built, what it is meant to move, and how far along it is — and can demo from it for the whole programme.

## What it is

A static site at the repo root (`index.html` + `assets/`) with nine tabs — Overview, Outcomes, Users & use case, Guardrails, Systems, Project management, AI agents, Knowledge base, Data model — reading `.colaberry/plan.json`, `.colaberry/progress.json`, and `.colaberry/manifest.json` at runtime. No content is hard-coded; a sample/real toggle shows fabricated demo data (always visibly labelled) versus the project's actual, currently mostly-empty, real data.

## Acceptance criteria

- Given the Command Center, when it is opened, then every tab is reachable and every card drills down one level.
- Given sample mode, when any tab is shown, then the sample data is visibly labelled as sample.
- Given the data files, when any tab renders, then its content comes from .colaberry/plan.json and .colaberry/progress.json read at runtime rather than from hard-coded values.
- Given .colaberry/manifest.json, when any tab is shown, then it displays how old the data is and warns when that age exceeds a week.
- Trust — no tab shows a number, a connection or a result the project has not actually produced.

## Verification

Built and reviewed via headless-Chrome screenshots of all 9 tabs and their drill-downs in both Real and Sample mode (see `PROGRESS.md`, session `CC-20260817-q3mv`). All 5 criteria above are recorded as `passed: true` in `.colaberry/progress.json`. Commit `1702952` ("STORY-000: build the GoalKick Command Center") is the commit that made them true.
