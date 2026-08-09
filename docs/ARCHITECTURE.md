# Folder-Tree Architecture

Established: 2026-07-30, session `CC-20260730-x4qz`. Approved by user ("APPROVE FOUNDATION").

This document is the persisted record of the folder-tree proposal reviewed and approved in that session. It exists so future sessions (and other Claude instances) don't have to re-derive the reasoning from chat history.

## Status legend

| Status | Meaning |
|---|---|
| NOW | Created in this foundation pass |
| LATER | Supported by a CLAUDE.md rule but intentionally not created yet — no current requirement |
| LEGACY | Only created if/when legacy code is actually imported |
| GENERATED | Owned and written by an external system (the portal), never by Claude |
| DO-NOT-TOUCH | Explicitly off-limits for manual edits per CLAUDE.md |

## Assumptions this architecture was built on

1. This repo was a fresh scaffold as of 2026-07-30 — only `CLAUDE.md` existed. Nothing here is "existing work" being reorganized.
2. The first Week 3 component is a **backend service/route**, not agent orchestration, frontend, a script, or a directive-only deliverable.
3. `backend/src/models/` was scaffolded ahead of confirmed need, on the assumption the first service is DB-backed per the Contract Enforcement Layer's default. If it turns out to be DB-free, this folder is safe to leave empty or remove.
4. No CI system exists yet. Rules in CLAUDE.md that say "CI must reject..." are targets, not currently enforced; this doc's Verification column reflects that.
5. `.claude/skills/` (telemetry-emission, openclaw-outreach, screenshot-review) are referenced by CLAUDE.md but not present in this repo instance. Not created in this pass — marked LATER as a known gap, not fabricated as existing.
6. `scripts/generateSessionChangelog.js` does not exist. The per-session HTML report gate in CLAUDE.md cannot be satisfied yet. Logged as a gap in `PROGRESS.md`, not silently skipped.
7. This directory is not a git repository. Rules assuming commits, PRs, or `.gitignore`-based exclusion (e.g. for `tmp/`) are not enforceable until git is initialized — that decision was out of scope for this approval and was not made unilaterally.
8. CLAUDE.md doesn't name a folder for unit tests outside Playwright, or for Zod validation schemas. Both are resolved by convention here (colocated `*.test.ts`; validation colocated in route files) rather than inventing unlisted top-level folders.

## Folder tree (as scaffolded)

```
/
├── CLAUDE.md                  EXISTING
├── PROGRESS.md                NOW
├── backend/                   NOW
│   └── src/
│       ├── routes/            NOW
│       ├── services/          NOW
│       ├── models/            NOW*  (conditional — see assumption 3)
│       ├── config/            NOW
│       ├── middleware/        NOW
│       ├── seeds/             LATER
│       ├── scripts/           LATER
│       ├── services/agents/   LATER
│       └── intelligence/      LATER
├── frontend/                  LATER
├── directives/                NOW
├── tests/                     NOW
├── docs/                      NOW
│   ├── ARCHITECTURE.md        NOW (this file)
│   └── sessions/              NOW
├── scripts/                   NOW
├── tmp/                       NOW
├── .claude/                   LATER (gap)
├── execution/                 LEGACY
├── intelligence/               LATER (top-level, distinct from backend/src/intelligence)
├── preview-db-init/           LATER
├── nginx/                     LATER
└── system/                    DO-NOT-TOUCH / GENERATED
```

## Traceability table

| Folder | Purpose | Belongs there | Never goes there | CLAUDE.md rule | Status | Verification |
|---|---|---|---|---|---|---|
| `backend/` | Node+Express+TS execution layer | services, routes, models, config, middleware | Frontend code, directives, raw SQL without a typed call site | Architecture table; Folder Responsibilities | NOW | `tsc --noEmit` passes in `backend/` (once code lands) |
| `backend/src/routes/` | Express route definitions | admin/portal/public route files | Business logic | Folder Responsibilities | NOW | Route validates input with Zod before reaching services |
| `backend/src/services/` | Business logic | Pure logic, DB calls via models | Route wiring, email formatting for dashboards | Folder Responsibilities; Modular Composition | NOW | Colocated `*.test.ts` covers happy path |
| `backend/src/models/` | Sequelize models — DB contract | Model definitions | Raw untyped SQL | Contract Enforcement Layer | NOW* | Model compiles under `tsc --noEmit` |
| `backend/src/config/` | Env/config wiring | Env var loading, no hardcoded secrets | Hostnames/credentials in source | 12-Factor Adapted | NOW | Grep for hardcoded values in `config/` returns none |
| `backend/src/middleware/` | Auth, validation, cross-cutting handling | Session/role checks | Business logic | Security Enforcement Layer | NOW | Every protected route exercises this middleware |
| `directives/` | SOPs defining intent | Goal/input/output/edge-case docs | Executable code | Architecture table | NOW | Directive exists per non-trivial service |
| `tests/` | E2E/Playwright verification | `systemV2/` browser flows (once frontend exists), API contract tests | Unit tests for services (colocated instead) | Folder Responsibilities; Testing & Validation | NOW | Empty until first E2E flow is needed — that's expected |
| `docs/` | In-repo docs shipped with codebase | Architecture notes, session changelogs, setup docs | Portal-generated state (`/system`) | Folder Responsibilities | NOW | `ARCHITECTURE.md` present (this file) |
| `docs/sessions/` | Per-session HTML changelogs | `SESSION_<id>.html` | Anything else | Logging section | NOW | Currently empty — generator script doesn't exist yet (see gap) |
| `scripts/` | Repo-root operational scripts | Deploy helpers, session-changelog generator, ad-hoc pulls | Business logic | Folder Responsibilities; Logging | NOW | `generateSessionChangelog.js` not yet present — known gap |
| `tmp/` | Scratch space | `escalation.json`, `autonomy_log.json` | Anything committed | Folder Responsibilities; Escalation; Logging | NOW | Never committed (once git exists) |
| `frontend/` | React+CRA+TS UI layer | pages, components, routes, API clients | Business logic, DB access | Folder Responsibilities | LATER | N/A until first UI need |
| `.claude/` | Skills, settings, hooks | `settings.json`, project skills | Anything unrelated to Claude Code config | Configuration Ownership | LATER (gap) | Not present — needed before first `/telemetry-emission` invocation |
| `execution/` | Legacy pre-Node Python reference | Nothing new — read-only | Any new work | Folder Responsibilities | LEGACY | Created only if legacy Python assets are actually migrated in |
| `intelligence/` (top-level) | Reserved in-flight intelligence subsystem | TBD per future directive | Duplicating `backend/src/intelligence/` | Folder Responsibilities | LATER | Check before adding — collision risk noted in CLAUDE.md itself |
| `preview-db-init/` | Postgres init scripts for preview-stack Docker | `.sql` init scripts | Production migrations (`backend/src/seeds/`) | Folder Responsibilities | LATER | Needed only once a preview Docker compose exists |
| `nginx/` | Production nginx config | nginx conf files | App code | Folder Responsibilities | LATER | Needed at first deploy |
| `system/` | Portal-owned auto-generated state maps | Nothing manual | Any manual edit | Folder Responsibilities | DO-NOT-TOUCH / GENERATED | Any manual edit here is a governance violation to flag, not fix silently |

## Recommended home for the first Week 3 component (backend service/route)

```
backend/src/routes/<admin|portal|public>/<domain>Routes.ts   ← route + Zod validation at the boundary
backend/src/services/<domain>Service.ts                       ← business logic
backend/src/services/<domain>Service.test.ts                  ← colocated happy-path unit test
backend/src/models/<Domain>.ts                                ← only if persistence is needed
directives/<domain>.md                                        ← SOP, written before or alongside the PR
```

## Known gaps carried forward (not fixed in this pass — out of scope for "foundation")

1. No git repository — commit-based audit trail, `.gitignore`, and PR-based contract enforcement are unenforceable until initialized. Not done unilaterally; needs a decision.
2. `scripts/generateSessionChangelog.js` doesn't exist — per-session HTML report gate can't run.
3. `/tmp/autonomy_log.json` writer doesn't exist — same-session workaround is documenting assumptions directly in `PROGRESS.md` notes.
4. `.claude/skills/` (telemetry-emission, openclaw-outreach, screenshot-review) referenced by CLAUDE.md but not present.
