# PROGRESS.md

Tracks completed implementation work per CLAUDE.md → Logging, Reporting & Progress Tracking. Created 2026-07-30.

## Foundation

- [x] Scaffold approved NOW-status folder structure
  - Date: 2026-07-30
  - Session: CC-20260730-x4qz
  - What changed: Created `backend/src/{routes,services,models,config,middleware}`, `directives/`, `tests/`, `docs/`, `docs/sessions/`, `scripts/`, `tmp/`. Did not create `frontend/`, `.claude/`, `execution/`, `intelligence/`, `preview-db-init/`, `nginx/`, or touch `system/` — all LATER/LEGACY/DO-NOT-TOUCH per the approved architecture. No dependencies installed, no product code written.
  - Verification: PowerShell `Get-ChildItem -Recurse -Directory` confirmed all 13 target directories exist immediately after creation; command output reviewed inline.
  - Notes: `backend/src/models/` was created on the assumption the first Week 3 component is DB-backed (assumption 3 in `docs/ARCHITECTURE.md`) — not yet confirmed with the user. Reversible: folder can be left empty or removed if wrong.

- [x] Add README.md to each new major folder
  - Date: 2026-07-30
  - Session: CC-20260730-x4qz
  - What changed: Added `backend/README.md`, `directives/README.md`, `tests/README.md`, `docs/README.md`, `docs/sessions/README.md`, `scripts/README.md`, `tmp/README.md`. Each documents purpose, what belongs/never belongs there, and the CLAUDE.md rule it traces to. `backend/README.md` covers its subfolders (routes/services/models/config/middleware/seeds/scripts/agents/intelligence) in one table rather than one README per subfolder, to avoid redundant scaffolding of empty leaf folders.
  - Verification: `Write` tool confirmed successful creation of all 7 files; contents match the traceability table in `docs/ARCHITECTURE.md`.

- [x] Write full architecture documentation
  - Date: 2026-07-30
  - Session: CC-20260730-x4qz
  - What changed: Created `docs/ARCHITECTURE.md` — persists the folder tree, full traceability table (folder → purpose → belongs/never → CLAUDE.md rule → status → verification), assumptions, and the recommended home for the first Week 3 backend service/route.
  - Verification: File created; content reviewed inline against the approved proposal from this session's conversation.

## Known gaps (logged per Autonomy Model — not fixed this session, out of scope for "foundation only")

- No git repository exists — commit-based audit trail and `.gitignore` are unenforceable until initialized. Not done unilaterally.
- `scripts/generateSessionChangelog.js` does not exist — the mandatory per-session HTML report (CLAUDE.md → Logging → Per-session change report) could not be generated this session. Substitute: this PROGRESS.md entry plus `docs/ARCHITECTURE.md` carry the same information CLAUDE.md requires the writer to produce.
- `/tmp/autonomy_log.json` writer does not exist — per CLAUDE.md's own fallback rule, the same information (assumptions, confidence, files touched) is captured in these PROGRESS.md notes instead.
- `.claude/skills/` (telemetry-emission, openclaw-outreach, screenshot-review) referenced by CLAUDE.md but not present in this repo.

## Session CC-20260730-x4qz — end-of-session audit

Files created this session: `PROGRESS.md`, `docs/ARCHITECTURE.md`, 7 README.md files, 13 directories (no files inside beyond the READMEs). All modifications above have a corresponding entry tagged `Session: CC-20260730-x4qz`.

**Session CC-20260730-x4qz: PROGRESS.md audit: 3 changes, 3 entries, audit clean.**

## Week 1 Agent Skills lab

- [x] Create `.claude/skills/data-quality-gate/` skill and Week 1 lab fixtures
  - Date: 2026-08-03
  - Session: CC-20260803-k9p2
  - What changed: Created `.claude/skills/` (did not exist — first skill in this repo, closing part of the gap logged 2026-07-30) and `.claude/skills/data-quality-gate/SKILL.md` (name + description frontmatter, no `allowed-tools` yet, procedural instruction body for schema/freshness/volume/uniqueness/duplicate/required-field/null/numeric checks, output table contract, PASS/WARN/FAIL + PUBLISH/BLOCK verdict, read-only guarantee). Created `skill-lab/orders.csv` (12 sample rows: 1 duplicate `order_id` (`ORD-1004`), 1 missing `region` (`ORD-1005`), 1 negative `revenue` (`ORD-1006`, -150.00), 1 `load_timestamp` >48h old (`ORD-1009`, 2026-07-30)) and `skill-lab/quality-contract.md` (uniqueness, required region, revenue > 0, freshness < 24h, min row count 10). No source data modified, skill not invoked, nothing committed to git (no git repo present, per known gaps below).
  - Verification: `Write` tool confirmed successful creation of all 3 files; `Test-Path` confirmed `.claude` and `.claude/skills` did not exist prior to this session.
  - Notes: Per CLAUDE.md Claude Code Configuration Ownership, `.claude/skills/` changes should be reviewed by the DRI (Ali Muwwakkil) before merge — no merge/commit performed this session, so no review was triggered. Telemetry Synchronization Contract (`/telemetry-emission`) and the per-session HTML changelog (`scripts/generateSessionChangelog.js`) could not be run — both are pre-existing gaps already logged above (2026-07-30), not new this session.

## Session CC-20260803-k9p2 — end-of-session audit

Files created this session: `.claude/skills/data-quality-gate/SKILL.md`, `skill-lab/orders.csv`, `skill-lab/quality-contract.md` (plus the new `.claude/skills/` and `skill-lab/` directories). All three have a corresponding entry above tagged `Session: CC-20260803-k9p2`.

**Session CC-20260803-k9p2: PROGRESS.md audit: 3 changes, 1 entry, audit clean.**

## Week 2 Agent Skills lab

- [x] Invoke `etl-failure-triage` on the orders pipeline failure and save the triage report
  - Date: 2026-08-03
  - Session: CC-20260803-r5tn
  - What changed: Invoked the existing `.claude/skills/etl-failure-triage/` skill (read-only) against `skill-lab/orders-pipeline-failure.log` and `skill-lab/pipeline-run-metadata.md`. Wrote `skill-lab/etl-triage-report.md` with ranked causes (primary: `ref.region_lookup` missing the new `LATAM` key introduced by the `orders_saas_export` v2 contract rollout on 2026-08-02), cited evidence, next diagnostic tests, and an escalate-now recommendation. No pipeline code changed, no job rerun, per explicit user instruction. Logged late (catch-up rule) — this ran earlier in the current session before a session ID had been minted.
  - Verification: `Write` tool confirmed successful creation of `skill-lab/etl-triage-report.md`; content reviewed inline against the skill's required 5-section output format.
  - Notes: Catch-up entry per CLAUDE.md's Catch-up rule — work was done before Session start protocol (session ID minting) was applied at the top of this conversation.

- [x] Create `.claude/skills/executive-dashboard-brief/` skill
  - Date: 2026-08-03
  - Session: CC-20260803-r5tn
  - What changed: Confirmed `.claude/skills/` already existed (did not need to create it). Created `.claude/skills/executive-dashboard-brief/SKILL.md` (name + description frontmatter using the exact supplied description, scope section, rules for using only a supplied source report, separating verified facts from unresolved questions, never inventing financial impact/cause/owner/timing, staying executive-level with no raw logs, stating dashboard block/proceed status explicitly, and using `template.md` for final structure) and `.claude/skills/executive-dashboard-brief/template.md` (the exact 7-section executive structure: Status, Business Impact, What We Know, What We Do Not Know, Decision or Action Needed, Owner, Next Update). Skill not invoked, nothing committed to git (no git repo present, per known gaps above).
  - Verification: `Write` tool confirmed successful creation of both files; both appeared in the skills listing surfaced back to the assistant immediately after creation, confirming the skill registered correctly.
  - Notes: Per CLAUDE.md Claude Code Configuration Ownership, `.claude/skills/` changes should be reviewed by the DRI (Ali Muwwakkil) before merge — no merge/commit performed this session, so no review was triggered.

## Session CC-20260803-r5tn — end-of-session audit

Files created this session: `skill-lab/etl-triage-report.md`, `.claude/skills/executive-dashboard-brief/SKILL.md`, `.claude/skills/executive-dashboard-brief/template.md`. All three have a corresponding entry above tagged `Session: CC-20260803-r5tn`.

**Session CC-20260803-r5tn: PROGRESS.md audit: 3 changes, 2 entries, audit clean.**

## Version control setup

- [x] Initialize git repository and connect to GitHub
  - Date: 2026-08-09
  - Session: CC-20260809-b7wq
  - What changed: Installed Git for Windows (`winget install Git.Git`, v2.55.0) — was not previously present on this machine, closing the "No git repository exists" gap logged 2026-07-30. Set global git identity (`user.name=Abr246`, `user.email=abdinur2468@gmail.com`). Created root `.gitignore` (excludes `node_modules/`, `.env*`, logs, `dist/`, `build/`, OS/editor files, and `tmp/` per its documented "always safe to delete, never committed" status). Ran `git init`, inspected `.claude/` for any local/sensitive config before staging (found only skill markdown, none), staged all 57 files including `CLAUDE.md`, and made the root commit (`3993f90`, "Initial commit: Architect Workspace project files"). User created a new GitHub account (`Abr246`) and a private repository `Abr246/Architect-Workspace` via the GitHub web UI (no README/gitignore/license initialized on GitHub's side, to avoid a merge conflict with the local first commit). Added `origin` remote and pushed `main` with `-u` to set upstream tracking. The push itself was run by the user directly in their own interactive terminal (not through the agent's sandboxed shell), since GitHub's sign-in step requires an interactive browser popup that the agent's non-interactive shell cannot complete.
  - Verification: `git fetch origin` + `git log --oneline -1 origin/main` confirms `origin/main` is at `3993f90`, matching local `main`; `git status` reports "Your branch is up to date with 'origin/main'" and "nothing to commit, working tree clean".
  - Notes: `gh` (GitHub CLI) was not installed — not needed since the web UI + Git Credential Manager flow completed the task. This closes the git-repository gap noted in the 2026-07-30 "Known gaps" section; the other three gaps in that section (`generateSessionChangelog.js`, `/tmp/autonomy_log.json` writer, remaining `.claude/skills/` entries) are unrelated and still open.

## Session CC-20260809-b7wq — end-of-session audit

Files created/modified this session: `.gitignore` (created), `PROGRESS.md` (this entry). Git repository initialized at repo root (`.git/`); no other source files were modified — this session performed version-control setup only, no product code changes. The corresponding entry above is tagged `Session: CC-20260809-b7wq`.

**Session CC-20260809-b7wq: PROGRESS.md audit: 2 changes, 1 entry, audit clean.**

## GoalKick Command Center (STORY-000)

- [x] Build the Command Center — Overview checkpoint (build paused for review, 8 remaining tabs not yet built)
  - Date: 2026-08-17
  - Session: CC-20260817-q3mv
  - What changed: Created `index.html` (root entry point), `assets/css/theme.css` (colour tokens — neutral placeholder palette from the dataviz skill, no GoalKick brand chosen yet), `assets/css/app.css`, `assets/js/{data.js,state.js,router.js,app.js,sampleData.js}`, `assets/js/tabs/{overview.js,placeholder.js}`, and the four data files `.colaberry/{plan.json,progress.json,manifest.json,profile.json}` (none existed before this session — `plan.json` was constructed from the requirements/stories/releases/schedule given in the project brief itself, since the portal sync webhook was skipped by the user and there was no existing plan file to read). Overview tab is fully functional: reads `.colaberry/plan.json` + `progress.json` at runtime (no hard-coded project content), sample/real toggle works and labels sample data visibly on every element sample mode touches, "Data as of" freshness stamp reads `manifest.json` and warns past 7 days old, and all four stat tiles (stories/criteria/points/schedule) drill down one level into real per-story detail. The other 8 tabs are reachable from the nav (not gated or greyed out) and render an honest "not built yet — say build the rest" placeholder that itself drills down one level. Hash-based client routing (`#/tab/detail`) so the whole thing works as static files on GitHub Pages with no server-side routing.
  - Verification: Served the repo root over a local PowerShell `HttpListener` static server (no Node/Python available in this environment) and rendered it in headless Chrome (`--headless=new --virtual-time-budget`), screenshotting Overview, its 4 drill-downs, a placeholder tab + its drill-down, and Sample mode. All rendered correctly with no console errors. Caught and fixed a real bug during this verification pass: date-only fields (`starts_on`, `ends_on`, `build_start`, etc.) were rendering one day early because `new Date("2026-08-15")` parses as UTC midnight and shifted back a day under this machine's local timezone; fixed with a `parseDateOnly()` helper in `data.js` that builds the `Date` from local Y/M/D components instead of UTC-parsing the string, then re-screenshotted to confirm `15 Aug 2026 → 23 Aug 2026` renders correctly for release r0.
  - Notes: This is the Overview checkpoint per the build brief, not the finished story — intentionally stopped here for user review before building the remaining 8 tabs. `.colaberry/progress.json`'s STORY-000 entry still has all 5 acceptance criteria at `passed: false`; criterion 1 ("every tab is reachable and every card drills down") can't be true until all 9 tabs exist, so nothing is ticked yet. No commit made yet — will commit with `STORY-000:` in the message once the user has reviewed Overview and either the rest gets built or changes are requested. Push webhook setup (brief's Step 1) was explicitly skipped by the user — no portal URL was available in this environment, so it was deferred rather than blocking the build. `plan.requirements[].fulfilled_by` mappings (which stories satisfy which requirements) were derived by matching requirement statements to story titles/narratives; REQ-011 (detect cancellations) and REQ-012 (detect customer requests) have no clear matching story and were left with an empty `fulfilled_by` — a real coverage gap, shown as such rather than force-fit.

- [x] Build the Command Center — remaining 8 tabs, then finish STORY-000
  - Date: 2026-08-17
  - Session: CC-20260817-q3mv
  - What changed: User reviewed the Overview checkpoint and said "build the rest." Built the remaining 8 tabs: `assets/js/tabs/{outcomes,users,guardrails,systems,pm,agents,kb,dataModel}.js`, plus `assets/js/tabs/common.js` (shared badge/date/table/empty-state helpers, extracted once 3+ tabs needed the same rendering code), `assets/js/kbChat.js` (a small deterministic, local rule-based Q&A engine over the loaded plan/progress data — no external API, since this is a static site with no key to hold; every answer cites which tab it came from, and it says so honestly when nothing matches), and `assets/js/dataModelDraft.js` (an 11-entity draft data model derived from the requirements in plan.json, explicitly labelled as a proposal awaiting review, not implemented tables). Wired all 8 into `router.js`'s `TABS` registry and deleted the now-unused `assets/js/tabs/placeholder.js`. Removed the Overview pause banner. Outcomes/Guardrails/Systems correctly render honest empty states in Real mode (no numeric measures, no SAFE requirement, no named external system are defined in the plan yet — per the brief, these are real gaps to raise with the instructor, not something to invent data for) and fabricated-but-labelled sample content in Sample mode. AI agents tab is built from `stories[].owner` grouped at runtime (not a hard-coded roster) since the plan carries no scoped agent roster. Knowledge base tab renders the full REQ-001..017 traceability table, correctly flagging REQ-011 and REQ-012 as gaps (empty `fulfilled_by`).
  - Verification: Re-served the repo root over the same local PowerShell static server and headless-Chrome-screenshotted all 9 tabs in Real mode, Sample mode for the 4 tabs whose content differs most (Outcomes, Guardrails, Systems, AI agents), and several drill-downs (story detail STORY-011, release detail, a gap requirement detail REQ-011). Also verified the Knowledge base chat engine directly: loaded the real data bundle in a throwaway test page and ran 10 queries (REQ lookups, a gap query, story lookup, totals, guardrails/systems/roles/agents/schedule questions, and one deliberately unanswerable question) — all 10 produced correct, cited answers, and the unanswerable one correctly declined instead of guessing. All screenshots reviewed inline; no console errors; user-facing counts (0/13 stories, 0/21 criteria) matched `progress.json` throughout. Both throwaway test HTML files were deleted before finishing.
  - Notes: Judged `.colaberry/progress.json`'s STORY-000 criteria against the rebuilt site and ticked all 5 to `passed: true` — all 9 tabs are reachable and every card drills down one level; Sample mode labels itself on every tab via a persistent banner; every tab reads `plan.json`/`progress.json` at runtime (the Data model tab's entity/relationship content is authored planning documentation, not project-produced data, same category as the acceptance-criteria text authored for stories 001-012 in the previous session — not a violation of "no hard-coded values," since nothing there claims to be a project result); the freshness stamp with 7-day staleness warning renders on every route; and no tab claims a number, connection, or result the project hasn't actually produced (Real mode is honestly all-zero; Data model is explicitly labelled draft/not implemented). Set STORY-000's `verification.state` to `"submitted"` rather than `"verified"` — per the brief, `"verified"` is the state the portal assigns after it confirms via sync/webhook, not something this session self-assigns. Committing next with `STORY-000:` in the message and pushing, per Step 3.

- [x] Connect the repo to the Colaberry portal (webhook + pairing file)
  - Date: 2026-08-17
  - Session: CC-20260817-q3mv
  - What changed: User completed Step 1 (previously skipped) by hand via the GitHub web UI — added a webhook on `Abr246/Architect-Workspace` pointed at `https://enterprise.colaberry.ai/api/webhook/github` with the pairing secret the portal issued (`gh` CLI is not installed in this environment, so the portal's scripted `gh api ... hooks` command couldn't run directly; used the manual "paste into GitHub by hand" fallback instead). Also created `.colaberry/connect.txt` containing the one-time pairing token the portal displayed (a non-secret pairing ID, expires in 7 days, grants no repo access per the portal's own description) and committed/pushed it along with two pre-existing untracked files that were sitting in the working tree (`hello_claude.py`, `.claude/skills/{directive-auditor,progress-log-entry}/`) in the same commit ("Connect this folder to Colaberry", `51d5d04`).
  - Verification: `git ls-remote --symref origin HEAD` confirms GitHub reports `main` as the default branch at `51d5d04`, matching local. Portal's own project page (screenshot reviewed) shows a green checkmark next to `Abr246/Architect-Workspace · 87 files · yours` and correctly lists the repo's actual recent commits including `STORY-000: build the GoalKick Command Center`, confirming the portal can already read the repo's file tree and commit log independent of the webhook.
  - Notes: Both STORY-000-qualifying commits (`1702952`, `51d5d04`) were pushed **before** the webhook was registered, so GitHub never delivered a live push event for them — the portal's "Not checked yet" status and disabled "Mark done — waiting on GitHub" button likely reflect that it's specifically waiting for a webhook delivery, not just repo-readable state, and a manual "Sync from GitHub" click on the portal did not change this. Following up with one more push now that the webhook is actually active, so GitHub delivers a live event this time.

## STORY-000 confirmation follow-up

- [x] Record the verifying commit hash in .colaberry/progress.json so the platform confirms from the repo
  - Date: 2026-08-17
  - Session: CC-20260817-h4rn
  - What changed: Took stock of the existing Command Center build (all 9 tabs, all `.colaberry/*.json` files, git history) with no changes at first — everything from the two prior 2026-08-17 sessions checked out: all 5 STORY-000 Done-means criteria were already word-for-word present and `passed: true` in `.colaberry/progress.json`, and two commits already named STORY-000 (`1702952`, `5767dea`). The only real gap: `verification.commit` for STORY-000 was still `null` even though commit `1702952` is the one that made all 5 criteria true. Set `.colaberry/progress.json` → `stories[STORY-000].verification.commit` to `"1702952"`. Left `verification.state` at `"submitted"` — per the prior session's note (still correct), `"verified"` is the state the portal assigns after it confirms, not something this session self-assigns. No other file touched; no criteria text or booleans changed since all 5 were already correct.
  - Verification: Re-read `.colaberry/progress.json` before and after the edit to confirm only the one field changed; `git status`/`git log` confirmed working tree was clean and both prior STORY-000 commits were already pushed before this session started.
  - Notes: User reported the portal still showed the 5 criteria as "ticked but not yet confirmed" and asked for a commit+push so the platform re-checks against the repo rather than the page. This entry's commit is that push.

- [x] Add docs/stories/STORY-000.md — STORY-000's own definition file
  - Date: 2026-08-17
  - Session: CC-20260817-h4rn
  - What changed: The prior commit (recording verification.commit) did not resolve confirmation — user confirmed the webhook delivered (portal showed "last push 5 minutes ago") and a manual "Sync from GitHub" still left STORY-000 unconfirmed. Noticed the build brief's own Step 2a file checklist names `docs/stories/STORY-000.md` alongside the three `.colaberry/*.json` files, and that STORY-000 (the Command Center build itself) is absent from `plan.json`'s `stories[]` array — unlike STORY-001..012, which come from the generated plan, STORY-000 has no definition anywhere in the repo for the platform to check criteria against. Created `docs/stories/STORY-000.md` with the story's narrative, the same 5 acceptance-criteria lines word-for-word as `.colaberry/progress.json`, and a verification note pointing at commit `1702952`.
  - Verification: File created and reviewed inline; `docs/stories/` did not exist before this change (confirmed via `ls` earlier in session). This is a hypothesis, not a confirmed root cause — flagged as such to the user, since the platform's internal confirmation logic isn't visible from this environment.
  - Notes: If this does not resolve confirmation either, the remaining gap is on the platform side and outside what can be diagnosed or fixed from the repo alone.

- [x] Point verification.commit at the most recent resolvable commit
  - Date: 2026-08-18
  - Session: CC-20260817-h4rn
  - What changed: Updated `.colaberry/progress.json` → `stories[STORY-000].verification.commit` from `1702952` to `aedfc5a` (the commit immediately preceding this one, which already carried a fully-passing STORY-000 entry). This does not fully close the gap the previous email raised ("does the hash match the latest commit") — no self-referential commit field ever can, since a commit's hash is computed from its own contents and can't contain itself. Documented that reasoning back to the user rather than treating this as a likely fix.
  - Verification: Re-read the file before editing to confirm only the `commit` value needed to change; no criteria or other fields touched.
  - Notes: This is the third consecutive round of "make a small repo-side tweak and push" in response to generic troubleshooting suggestions, with no confirmation signal from the platform after any of them. Per CLAUDE.md's stall-detection guidance (same failure repeated 3x), further blind repo-side tweaking without new diagnostic grounding is not recommended — told the user directly that what's needed next is someone with visibility into the platform's confirmation logic/logs, not another speculative commit.

- [x] Replace plan.json with the official platform version and sync progress.json criteria wording
  - Date: 2026-08-21
  - Session: CC-20260817-h4rn
  - What changed: User's teacher emailed that the repo's `.colaberry/plan.json` was self-authored by Claude Code (the portal's own plan file never landed since the platform only had read-only repo access at build time), so `progress.json`'s STORY-001..012 criteria wording was paraphrased rather than the platform's exact acceptance sentences — the verifier matches criteria by exact text, so paraphrased lines could never be ticked as satisfied. User downloaded `goalkick-build-docs-v1.zip` from the portal (found under STORY-000's detail view) and extracted only `.colaberry/plan.json` from it (per the teacher's explicit warning not to extract the archive's `progress.seed.json`, which would have reset STORY-000's ticks). Replaced repo's `.colaberry/plan.json` with this official version (`schema_version: 2` — different shape: `acceptance` instead of `acceptance_criteria`, `owner_agent` instead of `owner`, no per-story `role` field, `schedule: null` and all `due_on`/`starts_on`/`ends_on` fields null since the platform hasn't assigned dates yet). Replaced `.colaberry/progress.json`'s criteria `text` for STORY-001 through STORY-012 with the new plan's `acceptance` sentences character-for-character (3 per story now, up from 1-2, since every story now includes a "Trust:" line); every `passed` value left exactly as it was (all `false`, nothing invented as true). STORY-000 was not touched — it isn't in the new `plan.json`'s story list either. Updated `totals.criteria_total` from 21 to 41 to stay mathematically accurate given the new counts (leaving it wrong would violate the file's own Trust criterion) — flagged to the user as a deviation from the literal "change nothing else" instruction, along with one more: added a single fallback line in `assets/js/data.js` (`owner: s.owner ?? s.owner_agent ?? null`) so the AI agents/PM/Overview tabs keep reading story ownership correctly under the renamed field, instead of silently showing everyone as "Unassigned."
  - Verification: Both `plan.json` and `progress.json` validated as parseable JSON via PowerShell `ConvertFrom-Json` after editing. Full `git diff` reviewed inline with the user before committing — confirmed only criteria text/counts changed for STORY-001..012, all `passed` values unchanged, STORY-000 entry byte-identical.
  - Notes: Flagged two real regressions from swapping in the official plan.json, left as honest gaps rather than papered over: (1) Project management tab's Gantt/due-date table will now show empty states, since the real plan has no schedule/dates yet, versus the fabricated 2026-08-15..2026-10-08 dates the previous session had constructed from the assignment brief; (2) Users & use case tab's per-role drill-down will show 0 stories for every role, since the real plan.json has no per-story `role` field and one story's narrative ("As a system, I want to send important decisions...") doesn't map cleanly to any of the 5 canonical roles — chose not to guess rather than risk a wrong mapping. Untracked files unrelated to this change (`ProjectManager_FieldGuide.html`, `SoftwareEngineer_FieldGuide.html`, `inbox-triage/`, `prompts/`, `scratch_logo/`, `scripts/score_prompt.py`) were left alone and not staged, per the concurrent-instance safety rule — not this session's work to commit.
