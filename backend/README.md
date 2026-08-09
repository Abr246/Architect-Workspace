# backend/

Node.js + Express + TypeScript execution layer. See CLAUDE.md → Architecture & System Layers, Folder Responsibilities.

## Subfolders (status as of foundation scaffolding, 2026-07-30)

| Path | Purpose | Status |
|---|---|---|
| `src/routes/` | Express route definitions (admin, portal, public) | NOW |
| `src/services/` | Business logic | NOW |
| `src/models/` | Sequelize models — the DB access contract | NOW* (scaffolded ahead of confirmed need; remove if the first service turns out to be DB-free) |
| `src/config/` | Env/config wiring — config stays out of code (12-Factor) | NOW |
| `src/middleware/` | Auth, validation, cross-cutting request handling | NOW |
| `src/seeds/` | Seed data & migrations | LATER — not yet created |
| `src/scripts/` | One-off operational scripts | LATER — not yet created |
| `src/services/agents/` | Agent orchestration | LATER — not yet created |
| `src/intelligence/` | Planning/decision engines | LATER — not yet created |

## Rules

- No business logic outside `src/services/`.
- No route handles unvalidated input — Zod (or equivalent) at the boundary, per CLAUDE.md's Contract Enforcement Layer.
- `tsc --noEmit` must pass before any change here is considered done.
- Unit tests for services are colocated (`fooService.test.ts` next to `fooService.ts`), not under top-level `/tests` — see `tests/README.md`.
