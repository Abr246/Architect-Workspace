# ungoverned

The same `agent.js` as the parent folder, byte-for-byte. No gate: `run.js` calls
`act.js` directly — no policy check, no escalation, no approval, no audit chain.
Whatever the agent proposes is carried out.

Writes only to `ungoverned/data/ledger.jsonl`. The parent's ledger, decisions
log, pending folder, and audit chain are never touched.

For comparison only. Not safe to point at anything real.
