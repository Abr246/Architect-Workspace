# directives/

SOPs and runbooks — human-readable. Each directive defines goals, inputs, outputs, edge cases, safety constraints, and how success is verified. See CLAUDE.md → Architecture & System Layers, Folder Responsibilities.

No business logic or executable code belongs here — that lives in `backend/` or `frontend/`.

Convention: one directive per non-trivial service, written before or alongside its implementation.
