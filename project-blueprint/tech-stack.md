# Tech Stack: Pitch AI (AI-Powered Soccer Facility Booking & Utilization Platform)

Based on `project-blueprint/architecture.md`. Generated 2026-08-06.

## Fit-rating key

| Icon | Meaning |
|---|---|
| 🟢 Great fit | Matches this project's size and needs — pick it, move on. |
| 🟡 Good fit | Works, but there's a real caveat to read first. |
| 🔴 Consider carefully | Where this plan is most likely to hurt you. |

## Headline

This stack is most likely to break at the **AI Optimization Engine**, not because scikit-learn is the wrong tool, but because of timing: it's the one component recommended here that requires data Pitch AI won't have on day one. Everything else — the booking flow, the database, the payment — can work correctly from the very first customer. The AI can't, until enough real bookings exist to train it on. Read the 🔴 row below before you build Phase 4.

## Recommendations

### Things a person touches

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| Customer Booking App | React + Vite (TypeScript) | 🟢 | React lets you build the booking screen out of small reusable pieces, and Vite (the tool that assembles those pieces into a fast website) keeps that screen feeling instant, which matters since "seconds to book" is the one thing Pitch AI must nail on day one. | `Explain React and Vite to me like I'm new to frontend development, using Pitch AI's Customer Booking App as the example. Walk me through what a "find and reserve a slot in seconds" screen would actually look like as React components.` |
| Operator Console | React + Vite (TypeScript), sharing a component library with the Customer Booking App | 🟡 — for Phase 2's read-only views alone, a drag-and-drop admin tool would ship faster, but it won't grow cleanly into the field-management features operators need later. | Reusing the same React toolkit as the Customer Booking App means one small team can build and maintain both screens without learning two different tools. | `Explain how to share a component library between two React apps, using Pitch AI's Customer Booking App and Operator Console as the example. What would actually live in the shared library versus stay separate?` |

### Things you write

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| Booking Service | Node.js + Express (TypeScript) | 🟢 — but the zero-double-booking promise must come from the database transaction, not from Node itself; get that wrong and no backend language saves you. | Node.js handles many customers trying to book at once without falling over, and Express (the toolkit that turns Node into a web server) is simple enough that a small team can read every line of it. | `Explain Node.js and Express to me like I'm new to backend development, using Pitch AI's Booking Service as the example. How would it use a Postgres transaction to guarantee zero double-bookings?` |
| AI Optimization Engine | scikit-learn (Python) behind a small FastAPI microservice | 🔴 — architecture's own assumptions call this out: Pitch AI has zero booking history on day one, so this component has nothing to learn from until Phases 1–3 have been running long enough to accumulate it. Ship a simple rule-based price/no-show score first; switch to a trained model once real bookings exist. | scikit-learn (a toolkit for turning data into prediction models) is the standard way to turn booking history into a no-show score and a price — but that history doesn't exist yet. | `Explain scikit-learn and FastAPI to me like I'm new to machine learning, using Pitch AI's AI Optimization Engine as the example. How much booking history would I realistically need before this no-show and pricing model is trustworthy?` |
| Rebalancing Worker | Node.js background worker process | 🟢 | A small always-running Node.js process is enough to notice a cancelled slot and put it back up for booking within seconds — Pitch AI only needs "fast," not "instant," so nothing heavier is justified. | `Explain how a Node.js background worker process works, using Pitch AI's Rebalancing Worker as the example. How does it know a slot just became available without me writing a slow polling loop?` |

### Things you store

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| Facility & Booking Database | PostgreSQL 16 | 🟢 | PostgreSQL keeps every booking accurate even if two people try to grab the same slot at the same instant, which is the entire point of Pitch AI's day-one promise. | `Explain PostgreSQL to me like I'm new to databases, using Pitch AI's Facility & Booking Database as the example. What tables would I actually have, and how does a unique constraint stop two people from booking the same slot?` |

### Things you depend on

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| Payment Gateway | Stripe | 🟡 — Stripe keeps roughly 30¢ + 2.9% of every charge; on a $20–30 field-slot booking that's a real slice of a small transaction, worth knowing about upfront rather than discovering it at the first payout. | Stripe collects the customer's card payment and hands Pitch AI a simple pass/fail result, so the team never has to touch or store card numbers directly. | `Explain Stripe to me like I'm new to payments, using Pitch AI's dynamic-price checkout as the example. What does Stripe actually take a cut of on a $25 field-slot booking?` |

### What the data flow needs (not named in the component list)

| Component | Recommended Tech | Fit | Why | Try This Prompt |
|---|---|---|---|---|
| Rebalancing Trigger (job queue) | pg-boss (Postgres-backed job queue) | 🟢 | pg-boss watches for a cancelled or high-risk slot and hands the Rebalancing Worker a to-do item, using the same Postgres database Pitch AI is already running — no second system to keep alive. | `Explain what a Postgres-backed job queue like pg-boss does, using Pitch AI's Rebalancing Worker as the example. Walk me through what happens, step by step, the moment a booking is cancelled.` |
| Hosting & Deployment | Render | 🟢 | Render runs the Booking Service, the Rebalancing Worker, and the database for you, so a small team spends its time on the booking flow instead of managing servers. | `Explain Render to me like I'm new to deploying software, using Pitch AI's Booking Service, database, and workers as the example. What would my actual list of services on Render look like?` |
| Operator & Customer Authentication | Clerk | 🟡 — it's a recurring per-user cost and a second vendor Pitch AI now depends on just to let anyone log in; rolling your own is possible, but the security risk of getting it wrong outweighs the monthly fee at this stage. | Clerk handles logging Operators and Customers in and remembering who they are, so nobody on a small team has to build password security by hand. | `Explain Clerk to me like I'm new to authentication, using Pitch AI's two roles — Operator and Customer — as the example. How would it tell the Operator Console who's allowed to see which facility's revenue?` |

## Fit Summary

- 🟢 Great fit: 6 — Customer Booking App, Booking Service, Facility & Booking Database, Rebalancing Worker, Rebalancing Trigger (pg-boss), Hosting (Render)
- 🟡 Good fit: 3 — Operator Console, Payment Gateway (Stripe), Authentication (Clerk)
- 🔴 Consider carefully: 1 — AI Optimization Engine (scikit-learn / FastAPI)

## Least confident calls

- **AI Optimization Engine (🔴).** The technology itself is a standard, boring choice — the risk is sequencing, not tooling. Architecture's own Assumptions table already flags this as the one place a cold-start plan is required.
- **Operator & Customer Authentication (Clerk, 🟡).** Architecture's "What This Design Does Not Cover" section explicitly leaves authorization undesigned. Recommending a hosted provider here is a reasonable default, not a settled decision — a two-person team could legitimately choose to roll a minimal session-based auth instead and accept the risk.
- **Payment Gateway (Stripe, 🟡).** Fine technically; the open question is economic (fee-per-transaction against small-dollar bookings), not architectural, and this document can't tell you the operator's actual margin tolerance.

## What to learn first, in order

1. **PostgreSQL 16** — everything else reads or writes through it; understand it before anything else.
2. **Node.js + Express** — the Booking Service is the make-or-break Phase 1 component.
3. **React + Vite** — build the Customer Booking App once the Booking Service has something to call.
4. **pg-boss** — needed the moment rebalancing enters the picture, but conceptually simple once Postgres is understood.
5. **Stripe** — Phase 3, and mostly a matter of following their integration guide correctly.
6. **Clerk** — wire in alongside Phase 1–2 once both frontends exist, so Operator-vs-Customer access is never an afterthought.
7. **Render** — learn deployment once there's something worth deploying, ideally by the end of Phase 1.
8. **scikit-learn + FastAPI** — deliberately last: Phase 4 is the only phase gated on having real data to learn from.

## Alternatives considered and why not

| Component | Chosen | Alternative | Why not |
|---|---|---|---|
| Customer Booking App | React + Vite | Next.js | SSR/SEO benefits aren't needed — there's no public marketing or search-engine discovery requirement in the idea, just a fast booking flow. |
| Operator Console | React + Vite (shared) | Retool (low-code admin) | Faster for Phase 2's read-only views, but doesn't extend cleanly into the field-management features operators need later. |
| Booking Service | Node.js + Express | Go | Stronger raw concurrency guarantees, but adds a second language for a lean team when Postgres transactions already solve the atomicity requirement. |
| Facility & Booking Database | PostgreSQL | MongoDB | Booking data is inherently relational with strict uniqueness needs; a document store makes the zero-double-booking guarantee harder, not easier. |
| AI Optimization Engine | scikit-learn / FastAPI | Pre-trained third-party pricing API | Architecture's assumptions explicitly rule this out — the model is meant to train on the platform's own accumulating history. |
| Rebalancing Worker | Node.js worker | AWS Lambda + EventBridge | Adds a cloud-vendor-specific serverless stack before there's any proven scale reason to leave a simple managed host. |
| Payment Gateway | Stripe | Square | Stripe's docs/SDKs are the faster default for a small dev team; Square is reasonable if the operator already uses it in person. |
| Rebalancing Trigger | pg-boss | Redis + BullMQ | Reliable and popular, but adds a second datastore to operate; pg-boss reuses the Postgres already running. |
| Hosting & Deployment | Render | AWS ECS / Kubernetes | Significant ops overhead for a single-facility MVP with no proven scale need yet. |
| Authentication | Clerk | Roll-your-own JWT/session auth | Security-sensitive code a small team is likely to get subtly wrong; a hosted provider trades a monthly fee for correctness. |

## How hard each decision is to undo

| Technology | Undo difficulty | Why |
|---|---|---|
| PostgreSQL 16 | Medium | Data model is portable to any other SQL database, but the migration effort is real. |
| React + Vite (both frontends) | Low | UI layer only — swappable without touching backend contracts. |
| Node.js + Express (Booking Service) | Medium | Rewriting the atomic-locking logic in another language is the riskiest part of the whole system to redo. |
| scikit-learn / FastAPI | Low | Isolated microservice behind an API boundary — swap the whole engine without touching anything else. |
| Node.js worker (Rebalancing) | Low | Small, self-contained process. |
| Stripe | High | Switching processors touches accounting, refunds, webhooks, and possibly re-verification with the operator's bank. |
| pg-boss | Low | Swap for BullMQ/Redis later behind the same job interface if scale ever demands it. |
| Render (hosting) | Low–Medium | Containerized services port to most hosts; the database migration is the harder part. |
| Clerk (auth) | Medium–High | User identities and session tokens are provider-specific — migrating means re-authenticating every user. |

## What this document does NOT tell me

- Whether Pitch AI is a good business idea, or whether operators will actually pay for it.
- Exact dollar hosting/vendor costs at any specific booking volume — that depends on real usage this document can't predict.
- A security or PCI-compliance audit — Stripe handles card data, but the rest of the system still needs its own review before launch.
- The actual database schema, API contracts, or UI designs — this names technologies, not the system built on top of them.
- Legal or contractual terms for facility operators, payouts, or refunds.
- A staffing or hiring plan for who builds each component.

---

Knowledge base: [`project-blueprint/stack/index.html`](stack/index.html)
