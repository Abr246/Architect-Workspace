# reliability-lab

A tiny order desk: `desk.js` asks a stand-in vendor for a confirmation message, then appends it as one JSON line to `data/sent.log`. A per-attempt timeout, a jittered retry, and a circuit breaker (persisted in `data/breaker.json`) guard the vendor call; a plain-template fallback covers `UpstreamUnavailable`/`BreakerOpen`. Before anything is sent, a quality gate (`score(message, orderId)` in `reliability.js`) scores it 0-100 — exact order-id token (+40), no banned AI-disclaimer phrases (+30), 20-300 characters (+30); below 70 it's refused as `QualityGateRejected`, never sent under any name. Anything that can't be sent (gate-rejected, or a failed fallback) lands in `data/dead-letter.jsonl` with the score and reasons.

Every `confirm` run gets its own correlation id (not the idempotency key — that's per-order, this is per-run) stamped on every log line, the sent.log line, and any dead-letter row, and ends by printing a one-line JSON receipt: `orderId`, `correlationId`, `attempts`, `breakerState`, `gateScore`, `outcome` (`sent`/`fallback`/`duplicate`/`dead-lettered`), `errorName`.

Run: `node desk.js confirm 1001` or `node desk.js replay` (retries every dead-lettered order).

Set the vendor's behavior with `VENDOR_MODE=ok|slow|down|garbage` (default `ok`), e.g. `VENDOR_MODE=down node desk.js confirm 1001`.

The send is idempotent: it's wrapped in `runOnce(key, fn)` (`reliability.js`, backed by `data/keys.json`), keyed on `order:<orderId>`. Confirming the same order twice sends once and reports `duplicate: true` the second time. Verify with `node check-idempotency.js` or `npm test`.

Zero dependencies, Node.js only. `data/` is run output, not source — see `.gitignore`.
