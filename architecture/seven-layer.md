# Seven-Layer Binding

Every component listed in [inventory.md](./inventory.md) is bound to exactly one layer below. Where a single file hosts two architecturally distinct roles (e.g. a route file that both routes HTTP requests *and* defines a Zod schema), the two roles are listed as separate rows bound to different layers — the underlying path is still the one cited in `inventory.md`.

| LAYER | COMPONENT(S) | WHAT IT DOES AT THIS LAYER |
|---|---|---|
| **1. Storage** | GoalKick SQLite database (`backend/src/db/connection.ts`) | Durable row storage for fields, bookings, escalations, scheduling issues, and audit entries. |
| | Governance-lab decision/ledger/audit JSONL (`governance-lab/data/*.jsonl`) | Append-only persisted record of every verdict and executed action in the governance demo. |
| | Reliability-lab operational state (`reliability-lab/data/*`) | Persisted idempotency keys, sent log, dead-letter queue, and circuit-breaker state. |
| | Order-status escalation ticket file (`order-status-mcp/server.py`, `ESCALATIONS_FILE`) | Raw append-only ticket storage for human-handoff cases. |
| | Inbox-triage credentials file (`inbox-triage/.env`) | Flat-file storage of the Anthropic credential/model values used by `check_setup.py`. |
| **2. Data Fabric** | Fields service (`backend/src/services/fieldsService.ts`) | Mediates CRUD access to the `fields` table for every caller above it. |
| | Bookings service (`backend/src/services/bookingsService.ts`) | Mediates create/cancel/conflict-check access to the `bookings` table. |
| | Scheduling issues service (`backend/src/services/schedulingIssuesService.ts`) | Mediates detect/track/resolve access to the `scheduling_issues` table. |
| | Frontend API clients (`frontend/src/services/*.ts`) | Client-side data-access layer: `fetch` wrappers that move data between the browser and the backend's routes. |
| **3. Semantic** | Request-validation schemas (Zod, inside `backend/src/routes/*.ts`) | Defines and enforces the shape/meaning of each request payload before it reaches business logic. |
| | Domain type unions (e.g. `AuditEntityType`, `AuditAction` in `auditTrailService.ts`; `BookingStatus`, `EscalationType`, `SchedulingIssueStatus`) | Defines the controlled vocabulary of valid states/actions across the domain. |
| | Order-status Pydantic models (`OrderRow`, `EscalationReason` in `order-status-mcp/server.py`) | Defines and validates the shape/meaning of order and escalation data crossing the MCP boundary. |
| | Backend lint/contract config (`backend/eslint.config.js`) | Enforces the written-justification contract on `any` usage — part of `CLAUDE.md`'s Contract Enforcement Layer. |
| | Requirements/stories/traceability docs (`docs/REQUIREMENTS.md`, `docs/STORIES.md`, `docs/stories/STORY-*.md`, `docs/TRACEABILITY.md`) | Defines what each piece of the system is supposed to mean and do, and which requirement each story satisfies. |
| | Data contract spec (`docs/DATA_CONTRACT.md`) | Defines the field-by-field meaning and join key of the `.colaberry/` state files. |
| | MCP transport decision records (`mcp-server/docs/ADR-001-transport-selection.md`, `order-status-mcp/docs/TRANSPORT_DECISION.md`) | Documents the meaning/rationale behind each server's transport choice. |
| **4. Intelligence** | Scheduling service (`backend/src/services/schedulingService.ts`) | Deterministic reasoning engine that proposes alternate booking times with a rationale. |
| | Assistant service (`backend/src/services/assistantService.ts`) | Deterministic reasoning engine that answers pricing/availability/trend questions. |
| | Analytics service (`backend/src/services/analyticsService.ts`) | Computes and narrates booking-trend analysis (busy/slow/normal). |
| | Customer service service (`backend/src/services/customerServiceService.ts`) | Decides whether a customer issue is AI-answerable or must be escalated to a human. |
| | Prompt-grading script (`scripts/score_prompt.py`) + no-show-risk prompts/evals (`prompts/score-noshow-risk/*`) | The one place in this repo that actually calls an LLM (Claude) to produce a graded prediction. |
| | Reliability-lab vendor stand-in (`reliability-lab/vendor.js`) | Simulated external AI service generating order-confirmation message text. |
| **5. Governance** | Escalations service (`backend/src/services/escalationsService.ts`) + Escalations API route (`backend/src/routes/escalations.ts`) | The production approve/deny gate for refund/complaint/general customer escalations. |
| | Audit trail service (`backend/src/services/auditTrailService.ts`) + Audit Trail API route (`backend/src/routes/auditTrail.ts`) | The queryable compliance record of every booking, escalation, AI interaction, and resolution. |
| | Governance-lab agent/gate/policy/riskScore/pending/act/audit/ungoverned baseline (`governance-lab/*.js`, `governance-lab/policy.json`, `governance-lab/ungoverned/*.js`) | A full propose → policy-check → risk-score → escalate-or-act → hash-chained-audit pipeline, with a no-gate baseline for contrast. |
| | Reliability-lab idempotency check (`reliability-lab/check-idempotency.js`) | Verifies compliance with `CLAUDE.md`'s non-negotiable idempotency rule (same input twice ⇒ one send). |
| | Root operating contract (`CLAUDE.md`, both sections) | The policy document defining autonomy limits, escalation triggers, and Definition of Done for all work in this repo. |
| | Claude Code hook wiring and hooks (`.claude/settings.json`, `.claude/hooks/commit-guard.sh`, `.claude/hooks/story-progress-guard.sh`, `.claude/hooks/format-report.sh`) | Enforces commit-time policy (story linkage) before changes land. |
| | `.colaberry/` sync files (`plan.json`, `progress.json`, `manifest.json`, `profile.json`, `connect.txt`) | The shared completion/verification contract with the external Command Center platform — what counts as "done." |
| | Session progress log (`PROGRESS.md`) | The human-readable, session-tagged record of what shipped and how it was verified. |
| **6. Observability** | Request logging middleware (`backend/src/middleware/requestLogger.ts`) | Emits a structured JSON log line (method, path, status, duration) for every backend HTTP request. |
| | Notifications polling hook (`frontend/src/hooks/useNotifications.ts`) | Surfaces system-state changes (new bookings, escalations, issues) to the user via periodic polling. |
| | API-connectivity check script (`inbox-triage/check_setup.py`) | A health check that proves the Anthropic API connection is live and reports token counts. |
| | Structured MCP logging (`order-status-mcp/server.py`, `_emit_log`/`_handle_set_logging_level`) | Correlation-ID-tagged, per-tool-call timing and outcome notifications sent to the MCP client. |
| | Reliability-lab run receipt (`reliability-lab/desk.js`, its one-line JSON receipt output) | Per-run trace record: `orderId`, `correlationId`, `attempts`, `breakerState`, `gateScore`, `outcome`. |
| **7. Orchestration** | Backend process entry + app wiring (`backend/src/index.ts`, `backend/src/app.ts`) | Starts the process and mounts all nine routers into one dispatchable app. |
| | Backend API routes as dispatchers (`backend/src/routes/*.ts`) | The HTTP entry points that receive a validated request and hand it to the matching service. |
| | Frontend entry + app composition (`frontend/src/index.tsx`, `frontend/src/App.tsx`) | Mounts and composes the page/component tree the user interacts with. |
| | Pages & UI components (`frontend/src/pages/*.tsx`, `frontend/src/components/*.tsx`) | Coordinate forms, modals, and API calls into complete user-facing workflows. |
| | `mcp-server` skeleton (`mcp-server/src/server.py`) | The not-yet-populated stdio tool-server surface an agent would call into. |
| | `order-status-mcp` tool/resource/prompt surface (`order-status-mcp/server.py`'s `search_orders`, `get_order`, `escalate_order_issue`, `handoff_brief`, and its root-escape guard `_resolve_within_roots`) | Coordinates what an LLM agent is allowed to look up, escalate, and do, and in what order (see the `handoff_brief` prompt's four-step script). |
| | Reliability-lab order desk + reliability wrappers + naive baseline (`reliability-lab/desk.js`, `reliability-lab/reliability.js`, `reliability-lab/naive/desk.js`) | Coordinates the vendor call, timeout/retry/circuit-breaker mechanics, quality gate, and fallback into one workflow, with a no-protection baseline for contrast. |
| | Claude Code subagent definitions + slash commands (`.claude/agents/*.md`, `.claude/commands/*.md`) | Define the multi-agent and multi-step workflows (explore → plan → edit → review → test; `/ship`, `/close-out-story`, `/project-update`) used to build this repo. |
| | Backend/frontend dependency manifests (`backend/package.json`, `frontend/package.json`) | Declare the `dev`/`build`/`test` process scripts that drive each app's lifecycle. |

No layer above is N/A — every one of the seven has at least one component with a real, cited path in [inventory.md](./inventory.md).
