# tests/

Automated verification layer. Reserved for Playwright/E2E flows (`systemV2/`, added once frontend work begins) and future API-contract / visual-regression tests. See CLAUDE.md → Folder Responsibilities, Testing & Validation Rules.

Unit tests for backend business logic are colocated next to their source in `backend/src/services/` (e.g. `fooService.test.ts`) rather than placed here — CLAUDE.md doesn't name a top-level unit-test folder, so this repo keeps unit tests close to the code they cover and reserves this folder for true end-to-end coverage.
