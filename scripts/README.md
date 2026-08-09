# scripts/

Repo-root operational scripts: deploy helpers, ad-hoc data pulls, the session-changelog generator. Same single-responsibility rule as `backend/src/scripts/` — one script, one job. See CLAUDE.md → Folder Responsibilities, Production Readiness Principles.

**Known gap:** `generateSessionChangelog.js` is required by CLAUDE.md's per-session HTML report gate but hasn't been built yet. Not built as part of this foundation pass — it's tooling/feature work, not folder structure.
