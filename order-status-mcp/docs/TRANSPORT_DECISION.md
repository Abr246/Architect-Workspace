# Transport Decision Record — order-status-mcp

## My answers

1. **Who calls this server, and from where?** Remote clients over a network.
2. **How many callers at the same time, realistically?** A handful (single digits).
3. **Does it need to run on more than one machine, now or within a year?** No — one instance is fine.
4. **Does anything have to survive between requests?** Nothing — fully stateless.
5. **What's the worst thing that happens if it's unavailable for an hour?** Minor inconvenience.

## Transport I chose

**Streamable HTTP**, run in **stateless mode**.

## State model I chose

No server-side session store, no event store for stream resumability. Every
request is handled on its own; nothing about one call depends on anything
being remembered from a previous one.

## My rationale

Callers are remote, so stdio is off the table from the first answer alone —
it only works when the client can spawn the server as a local subprocess and
talk to it over its own stdin/stdout. That leaves an HTTP-based transport,
and Streamable HTTP is the current one, so the real decision isn't "which
transport" so much as "how much machinery do I run underneath it."

The rest of my answers all pull toward the cheapest version of that
machinery. A handful of concurrent callers doesn't need anything designed
for scale. One instance being enough means I never have to solve the
"which instance has this session" problem, so there's no reason to pay for
a session store or sticky routing. Fully stateless means there's nothing
that would need to survive a restart in the first place — no in-flight
session state, no partially-done workflow sitting in memory. And if it's
down for an hour, that's a minor inconvenience, not lost work — so there's
no case for the added complexity of a resumable-stream event store just to
protect against a dropped connection.

Every answer points the same direction: run Streamable HTTP with no session
persistence layer under it. If any one of these answers had come back
differently — more concurrency, multiple instances, real state to protect,
or real cost to downtime — the stateless answer would stop being obviously
correct and I'd have to justify it instead of just taking it.

## Option I rejected, and why

**stdio.** It's the simplest MCP transport and would need zero of this
decision if the caller were local — but the very first answer rules it out
on its own: stdio requires the client to spawn and own the server process
directly, which doesn't work for a caller on a different machine. I didn't
weigh this one against Streamable HTTP on cost or complexity; it's not a
candidate for a remote caller at all.

I also considered, and rejected, building the *stateful* variant of
Streamable HTTP — the version with a server-side session store and an event
store for resumable streams, the shape you'd want if this had to run behind
a load balancer across multiple instances. Nothing in my answers asks for
that: one instance is enough, nothing needs to survive between requests, and
an hour of downtime is a minor inconvenience rather than lost work. Building
that layer now would be solving a scaling and durability problem I don't
have.

## When I'd revisit this

If concurrent callers grow past "a handful" or this ever needs to run on
more than one machine — either one alone is enough to force the stateful,
multi-instance version of this decision.
