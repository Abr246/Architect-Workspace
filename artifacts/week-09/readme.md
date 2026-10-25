# naive/

The desk with three protections removed: no circuit breaker, no idempotency
(`runOnce`), no quality gate — and, following from that, no fallback and no
dead-letter either. Only `withTimeout` and `retry` remain, with the retry
cap raised from 3 to 20.

This is what most systems look like the first night they meet a bad vendor.
Nothing here is malicious. It is just missing.

Reuses `../vendor.js` and `../reliability.js` read-only. Writes only to
`naive/data/` — the protected desk's `sent.log` / `keys.json` /
`breaker.json` are never touched.

Run: `VENDOR_MODE=down node desk.js confirm 1001` (from inside `naive/`).
