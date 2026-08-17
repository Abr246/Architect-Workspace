---
name: directive-auditor
description: Use when the user asks to review, audit, validate, or sanity-check a directive/SOP file in /directives (e.g. "audit this directive", "is this SOP ready", "check directives/briefingService.md"). Verifies required sections are present, every referenced file/script path actually exists in the repo, markdown structure is intact, and the doc is clear enough for a junior developer. Do NOT use for writing a new directive from scratch (draft it directly instead) or for reviewing code/backend/frontend files — this only audits documents already inside /directives. Read-only: never edits the directive being audited.
allowed-tools: Read, Grep, Glob, Bash
---

# Directive Auditor

## Scope — when this skill applies

- **Triggers:** a request to review, audit, validate, or check readiness of a file under `/directives`.
- **Does not trigger for:** authoring a brand-new directive (just write it), or auditing code — this skill only reads Markdown SOPs, per CLAUDE.md's "Directive validation" rule: *"If behavior can be tested via code, do not validate it narratively."*
- **Read-only contract:** this skill reports findings. It never edits the directive file itself. If fixes are needed, report them and let the user or a follow-up edit apply them.

## 1. Locate the directive

- Confirm the path is under `/directives`. If the user names a directive that doesn't exist, list what's actually in `/directives` (via Glob) and ask which one they meant — do not guess.

## 2. Check required sections and clarity

- Read `reference/required-sections.md` for the full rubric before scoring — the short list below is not sufficient on its own.
- Required sections, at minimum: Goal, Inputs, Outputs, Edge Cases, Safety Constraints, Verification (how success is confirmed).
- Clarity check: could a junior developer follow this without asking a follow-up question? Flag any step that assumes undocumented context.

## 3. Verify every referenced path actually exists — by script, not by eye

CLAUDE.md is explicit that testable behavior must be tested via code, not prose. Run the reference-checker rather than visually scanning:

```
node .claude/skills/directive-auditor/scripts/check-references.js <path-to-directive>
```

This extracts every backticked file/script path in the directive and reports which ones resolve on disk. Do not hand-verify paths yourself if the script can do it — the script is deterministic, eyeballing isn't.

## 4. Report results

Return one table:

| Check | Evidence | Status |
|---|---|---|
| Required sections | which are present/missing | PASS / FAIL |
| Referenced paths | script output, path by path | PASS / FAIL |
| Markdown integrity | broken headers, unclosed code fences, etc. | PASS / FAIL |
| Junior-dev clarity | specific step(s) that would need a follow-up question | PASS / WARN |

End with a one-line verdict: **READY**, **NEEDS FIXES** (list them), or **BLOCKED** (e.g., referenced script doesn't exist).
