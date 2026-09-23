# ADR-001: Transport Selection for MCP Servers in This Repository

**Status:** Accepted
**Date:** 2026-09-06
**Applies to:** `order-status-mcp/`, `mcp-server/`
**Owner:** Abr246

## Context

This repository contains two MCP servers:

- **`order-status-mcp/`** — a working reference implementation exposing order-lookup tools, a resource, and a handoff prompt, with roots-based file access control and structured logging already in place.
- **`mcp-server/`** — a new server, currently a bare stub (`mcp.run(transport="stdio")`, no tools yet), explicitly documented as reusing `order-status-mcp`'s Python environment.

Per `mcp-server/README.md`, both are designed to be launched **locally, as a subprocess, by an AI assistant or the MCP Inspector** — the README's own description of "the cursor sits there silently, that's correct" is the signature of a stdio-transport server, not a hosted network service. There is no authentication, session management, hosting config, or multi-client requirement anywhere in either codebase today.

Confirmed directly with the project owner: whatever calls this server will **always run on the exact same computer as the server itself** — there is no requirement, now or planned, for a caller on a different machine to reach it.

The two transport options available in the MCP SDK are:

| Dimension | STDIO | Streamable HTTP |
|---|---|---|
| Deployment model | Spawned as a child process by the client, on the same machine | Runs as a standalone network service; clients connect over HTTP |
| Client cardinality | Exactly one client per process, for its lifetime | Many concurrent clients/sessions per running server |
| Auth required | None — trust inherited from OS process ownership | Required (bearer token / OAuth) — any network-reachable client could otherwise connect |
| Session management | Trivial — one process, one implicit session | Must be built explicitly — session IDs, per-session state isolation, reconnect handling |
| Operational overhead | None — no port, no supervisor, no TLS | Needs a running host/container, process supervision, TLS, monitoring |
| Latency | Lowest possible — local pipes, no network hop | Adds a network round trip, even on localhost |

## Decision

Use **STDIO** transport for both MCP servers in this repository.

## Rationale — alignment with actual performance and scalability needs

- **Performance:** `order-status-mcp/server.py`'s real workload is an in-memory scan over four hardcoded order records and a single local file append (`escalations.jsonl`) — sub-millisecond work. STDIO's pipe-based IPC adds negligible overhead here and is, if anything, faster than a loopback HTTP call would be for the same operation. Transport choice is not a bottleneck for anything this project currently does.
- **Scalability:** Scalability concerns — concurrent multi-user load, horizontal scaling, remote reachability — don't apply. The project is designed as one process per developer, per AI-assistant session, launched on demand and torn down on exit. There is exactly one consumer per process by design, confirmed directly with the project owner. Streamable HTTP's session-management and concurrency machinery would add real operational surface area (auth, TLS, process supervision) with no corresponding need.
- **Consistency:** Both servers share one SDK (`mcp[cli]`) and one `mcp.run(transport=...)` entry point. Keeping both on STDIO means `mcp-server` can reuse the exact same Inspector CLI invocation already documented and proven for `order-status-mcp`, rather than the two servers needing different run/test tooling.

## Consequences

**Accepted trade-offs:**
- Cannot be reached from a different machine. Nothing else — a website, a phone app, a teammate's laptop, a cloud service — will ever be able to connect to this server, structurally, not as a missing setting.
- Cannot serve more than one active client per running process — each caller gets its own private, one-on-one copy.

**Gained:**
- Zero infrastructure to deploy, secure, or operate — no login, no security setup, nothing extra to manage, because "same machine" is itself the trust boundary.
- Matches the behavior already documented and tested in `mcp-server/README.md`.

## Alternatives Considered

**Streamable HTTP now, "for future flexibility"** — rejected. It would add an auth story, session-management code, and a hosting/supervision requirement to a project with no remote or multi-user access need today. Building for a scaling requirement that doesn't exist yet is the wrong default when the simpler option fully satisfies the current one.

## When to Revisit

This is not a permanent choice — switch to Streamable HTTP if any of the following becomes true:

1. A client outside the developer's own machine needs to call this server (e.g., a hosted agent, a teammate's machine, a CI job).
2. More than one concurrent consumer needs to share one running server instance and its state.
3. The server needs to run as a long-lived background service rather than a per-session subprocess.

If that happens, the migration is scoped, not a rebuild: swap `StdioServerTransport` for `StreamableHTTPServerTransport`, add token-based auth and per-session state isolation, and add a process supervisor. The tool/resource/prompt handlers themselves need no change — `order-status-mcp/server.py`'s handlers already contain zero transport-specific code, since the SDK keeps that abstraction separate.

## Related

- `mcp-server/README.md`
- `order-status-mcp/server.py`
