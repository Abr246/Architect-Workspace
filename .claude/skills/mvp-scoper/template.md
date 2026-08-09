# MVP Plan: <project name>

## What Week 1 Proves

<One sentence, in the customer's or operator's terms — not a technical milestone. The single thing this slice proves works. Should echo the "must do well on day one" line from architecture.md if one exists.>

## The Week 1 Slice

<One short paragraph. Which components from architecture.md are in scope this week, and which are explicitly deferred to a later phase, with a one-line reason each. Ground this in architecture.md's Build Order table if it has one — Week 1 is usually Phase 1, but only if Phase 1 is actually small; if Phase 1 itself is too big for a week, cut it further and say so.>

## Checklist

### Build
- [ ] <task — small enough to finish in the week, traced to a specific component in architecture.md or a specific technology in tech-stack.md>
- [ ] <task>
- [ ] <task>

### Wire up
- [ ] <a specific connection between two components, stated concretely — e.g. "Booking Service writes to Postgres with a unique constraint on (field_id, slot_time) so a second booking attempt fails instead of double-booking">
- [ ] <task>

### Prove it
- [ ] <the concrete test or demo that shows the Week 1 goal actually holds — a script, a manual click-through, a specific two-actor scenario>

## Definition of Done for Week 1

<One falsifiable sentence. Someone who wasn't in the room should be able to check this is true or false without asking a follow-up question. Example: "Two browser tabs try to book the same slot at the same second; exactly one succeeds and the other sees a clear 'already taken' message.">

## Deliberately Not This Week

- <component or feature from architecture.md> — <one-line reason, usually "not needed to prove the Week 1 goal" or "gated on data/infra Week 1 doesn't have yet">
- <component or feature>

## Traceability

| Checklist item | Comes from |
|---|---|
| <item> | architecture.md § <section or component> |
| <item> | tech-stack.md § <component> |
