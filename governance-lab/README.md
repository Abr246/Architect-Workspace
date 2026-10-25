# governance-lab

An `agent` that proposes an action, a `gate` that checks it against `policy.json` and logs the verdict, and an `act` step that only the gate can reach. Built so the same scenarios can be replayed on demand.

Run: `node run.js` (or `npm start`) from inside this folder.
Set the scenario via the `AGENT_MODE` env var: `normal` (default), `generous`, `escalate_safe`, `sloppy`, or `rogue`.
Every run appends one line to `data/decisions.jsonl` (the verdict); `act` only runs — and only then appends a line to `data/ledger.jsonl` — when the gate's verdict is allow.
`policy.json` holds the rules as data; `act` cannot be invoked except through `gate.js` — see the code comments in `act.js`/`gate.js` for how that's enforced.

A verdict of `escalate` never runs the action. Instead it's parked in `data/pending/<actionId>.json` with the full action, the five risk factors (`riskScore.js`), the deciding rule, and an expiry (default one hour, override with `ESCALATION_TTL_MS`). `node run.js pending` lists what's waiting. `node run.js approve <actionId> --by <name>` runs it exactly once and marks it resolved — a second approve on the same id does nothing and says the approval was already spent. `node run.js deny <actionId> --by <name> [--reason <text>]` marks it denied without ever running it. Past its expiry, a pending item reads as denied automatically wherever it's read, and `approve` refuses to act on it.

Every decision gets one correlationId, minted the moment the agent proposes, carried on the decision record, the pending file, the approval, the ledger line, and every log line printed. `data/audit.jsonl` is the append-only record of that id's whole life (`proposed | evaluated | escalated | approved | denied | expired | executed`): each entry's `hash` is a SHA-256 (Node's built-in `crypto`, nothing installed) of the previous entry's hash plus a stable serialization of this entry's own fields, so editing any past entry without recomputing every hash after it is detectable. `node run.js why <correlationId>` replays one decision's story straight from `audit.jsonl` alone. `node run.js verify-audit` walks the whole chain from genesis and reports either that it's intact, or the exact line and correlationId of the first entry that doesn't match.
