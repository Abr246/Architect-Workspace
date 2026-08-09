/* BLUEPRINT — single source of truth for the whole knowledge base.
   Every page renders from this object. Do not duplicate a number or
   string anywhere else in the site; change it here and every page updates. */
const BLUEPRINT = {
  meta: {
    title: "AI-Powered Soccer Facility Booking & Utilization Platform",
    shortName: "Pitch AI",
    idea: "An AI-powered soccer facility management platform built for facility owners/operators. It uses AI to optimize field/turf scheduling and utilization — predicting no-shows, dynamically pricing slots, and rebalancing bookings in real time — so operators maximize revenue and minimize idle field time across their pitches. The one thing it must do well on day one: frictionless booking, meaning any operator or customer can find and reserve an open slot in seconds with zero double-bookings.",
    dayOne: "Frictionless booking: any operator or customer can find and reserve an open slot in seconds with zero double-bookings.",
    dayOneOwner: "booking-service",
    primaryUser: "Facility owners/operators",
    coreAI: "AI-driven scheduling & utilization optimization",
    generated: "2026-08-06"
  },

  /* type: entry | frontend | service | ai | worker | datastore | thirdparty */
  components: [
    {
      id: "customer",
      name: "Customer",
      type: "entry",
      layer: "Entry Points",
      description: "The person trying to book a field to play on.",
      why: "“customer”"
    },
    {
      id: "operator",
      name: "Operator",
      type: "entry",
      layer: "Entry Points",
      description: "The facility owner/operator managing fields, pricing, and revenue.",
      why: "“facility owners/operators”"
    },
    {
      id: "booking-app",
      name: "Customer Booking App",
      type: "frontend",
      layer: "Frontend",
      description: "Lets a customer search a facility's fields and reserve an open slot in seconds.",
      why: "“customer”, “find and reserve an open slot”"
    },
    {
      id: "operator-console",
      name: "Operator Console",
      type: "frontend",
      layer: "Frontend",
      description: "Lets an operator see field utilization, revenue, and pricing, and manage their fields.",
      why: "“facility owners/operators”, “maximize revenue and minimize idle field time”"
    },
    {
      id: "booking-service",
      name: "Booking Service",
      type: "service",
      layer: "Services",
      description: "Owns reservation logic and locks a slot atomically the instant it's chosen — the component that guarantees zero double-bookings.",
      why: "“reserve an open slot ... with zero double-bookings”",
      dayOneCritical: true
    },
    {
      id: "ai-engine",
      name: "AI Optimization Engine",
      type: "ai",
      layer: "AI Layer",
      description: "Scores each open slot with a no-show probability and a recommended dynamic price, using historical booking data.",
      why: "“predicting no-shows”, “dynamically pricing slots”"
    },
    {
      id: "rebalancer",
      name: "Rebalancing Worker",
      type: "worker",
      layer: "Services",
      description: "Reacts in the background to cancellations and high no-show-risk slots by re-releasing them for booking immediately.",
      why: "“rebalancing bookings in real time”"
    },
    {
      id: "database",
      name: "Facility & Booking Database",
      type: "datastore",
      layer: "Data",
      description: "Stores fields, slots, reservations, and booking/no-show history so state outlives any single session.",
      why: "“field/turf scheduling”, “booking”"
    },
    {
      id: "payments",
      name: "Payment Gateway",
      type: "thirdparty",
      layer: "Third Party",
      description: "Charges the customer the dynamically computed price at the moment of reservation.",
      why: "“dynamically pricing slots” — a price only means something if it's collected"
    }
  ],

  diagrams: {
    architecture: `flowchart TD
    Customer(["Customer"])
    Operator(["Operator"])
    BookingApp["Customer Booking App"]
    Console["Operator Console"]
    Booking["Booking Service"]
    DB[("Facility & Booking Database")]
    AI["AI Optimization Engine"]
    Rebalance["Rebalancing Worker"]
    Pay{{"Payment Gateway"}}

    Customer -- "search facility" --> BookingApp
    BookingApp -- "get open slots" --> Booking
    Booking -- "read slot state" --> DB
    Booking -- "score slots" --> AI
    AI -- "read booking + no-show history" --> DB
    AI -- "price + no-show risk" --> Booking
    Booking -- "priced, available slots" --> BookingApp
    BookingApp -- "reserve slot" --> Booking
    Booking -- "atomic slot lock" --> DB
    Booking -- "charge dynamic price" --> Pay
    Pay -- "payment result" --> Booking
    Booking -- "confirmation" --> BookingApp
    Operator -- "view fields and revenue" --> Console
    Console -- "utilization and pricing query" --> Booking
    DB -- "cancellation or high-risk slot" --> Rebalance
    Rebalance -- "re-release slot" --> DB`,

    sequence: `sequenceDiagram
    participant C as Customer
    participant A as Booking App
    participant B as Booking Service
    participant AI as AI Optimization Engine
    participant D as Database
    participant P as Payment Gateway

    C->>A: search facility
    A->>B: get open slots
    B->>D: read slot state
    B->>AI: score slots
    AI->>D: read booking + no-show history
    AI-->>B: price + no-show risk
    B-->>A: priced, available slots
    C->>A: choose slot
    A->>B: reserve slot
    B->>D: atomic slot lock
    B->>P: charge dynamic price
    P-->>B: payment result
    B->>D: confirm reservation
    B-->>A: confirmation`,

    gantt: `gantt
    dateFormat  YYYY-MM-DD
    title Build Order
    section Phase 1 - Core Booking
    Booking Service + DB + Customer App :done, p1, 2026-08-10, 21d
    section Phase 2 - Operator Console
    Utilization + revenue views        :p2, after p1, 14d
    section Phase 3 - Payments
    Payment Gateway integration        :p3, after p2, 10d
    section Phase 4 - AI Optimization
    No-show + dynamic pricing model    :p4, after p3, 21d
    section Phase 5 - Rebalancing
    Background rebalancing worker      :p5, after p4, 10d`
  },

  dataFlow: [
    { step: 1, actor: "Customer", action: "Opens the Customer Booking App and searches for available slots at a facility.", aiTouch: false },
    { step: 2, actor: "Booking App", action: "Asks the Booking Service for open slots.", aiTouch: false },
    { step: 3, actor: "Booking Service", action: "Reads current slot state from the Facility & Booking Database.", aiTouch: false },
    { step: 4, actor: "Booking Service", action: "Asks the AI Optimization Engine to score each open slot.", aiTouch: true },
    { step: 5, actor: "AI Optimization Engine", action: "Reads historical booking/no-show data and returns a price and no-show-risk score per slot.", aiTouch: true },
    { step: 6, actor: "Booking Service", action: "Returns priced, available slots to the Customer Booking App.", aiTouch: true },
    { step: 7, actor: "Booking Service", action: "Atomically locks the chosen slot and creates a pending reservation — the step that guarantees zero double-bookings.", aiTouch: false, dayOneCritical: true },
    { step: 8, actor: "Booking Service", action: "Charges the dynamically computed price through the Payment Gateway.", aiTouch: false },
    { step: 9, actor: "Booking Service", action: "On payment success, confirms the reservation and returns confirmation to the Customer Booking App.", aiTouch: false },
    { step: 10, actor: "Operator", action: "Opens the Operator Console to view utilization, revenue, and current pricing.", aiTouch: false },
    { step: 11, actor: "Database", action: "A cancellation or a high no-show-risk score triggers the Rebalancing Worker.", aiTouch: true },
    { step: 12, actor: "Rebalancing Worker", action: "Re-releases the slot immediately so it becomes bookable again.", aiTouch: false }
  ],

  buildPhases: [
    {
      phase: 1,
      name: "Core Booking",
      weeks: 3,
      makeOrBreak: true,
      builds: "Booking Service + Facility & Booking Database + Customer Booking App, with atomic slot locking.",
      proves: "A customer can find and reserve a slot in seconds with zero double-bookings — the day-one requirement, before any AI exists.",
      components: ["booking-service", "database", "booking-app"]
    },
    {
      phase: 2,
      name: "Operator Console",
      weeks: 2,
      makeOrBreak: false,
      builds: "Read-only utilization and revenue views on top of the Phase 1 data.",
      proves: "Operators can see what's happening on their fields in real time.",
      components: ["operator-console"]
    },
    {
      phase: 3,
      name: "Payments",
      weeks: 1.5,
      makeOrBreak: false,
      builds: "Payment Gateway wired into the reservation step.",
      proves: "A real charge completes end-to-end against a real (even if static) price.",
      components: ["payments"]
    },
    {
      phase: 4,
      name: "AI Optimization",
      weeks: 3,
      makeOrBreak: false,
      builds: "No-show prediction and dynamic pricing, trained on accumulated booking history.",
      proves: "The AI's price and risk scores actually change behavior — more revenue or less idle time than static pricing.",
      components: ["ai-engine"]
    },
    {
      phase: 5,
      name: "Rebalancing",
      weeks: 1.5,
      makeOrBreak: false,
      builds: "Background worker reacting to cancellations and high-risk slots.",
      proves: "Slots freed by a no-show or cancellation get rebooked in real time instead of sitting idle.",
      components: ["rebalancer"]
    }
  ],

  assumptions: [
    {
      assumption: "Each operator manages their own independent set of fields (no shared multi-operator facilities).",
      impact: "If facilities are shared across operators, the database and Operator Console need an ownership/permissions model, not just a facility ID."
    },
    {
      assumption: "Dynamic pricing implies the platform also collects payment, so a Payment Gateway is in scope.",
      impact: "If operators actually settle payment offline (cash/POS at the facility), the Payment Gateway and its failure-handling drop out entirely, simplifying Phase 3 away."
    },
    {
      assumption: "“Real time” rebalancing means a reactive worker running within seconds to minutes of a trigger, not hard real-time (sub-second) guarantees.",
      impact: "If true real-time is required, the Rebalancing Worker needs a stream-processing design instead of a simple background job."
    },
    {
      assumption: "The AI Optimization Engine can start as a statistical model trained on the platform's own accumulating booking/no-show history, not a pre-trained third-party model.",
      impact: "If no historical data exists yet, Phase 4 needs a cold-start plan (e.g., rule-based pricing) until enough bookings accumulate to train on."
    }
  ],

  openQuestion: {
    question: "Do operators need to manage more than one facility from day one, or is a single facility per operator enough?",
    branchA: {
      label: "Single facility per operator",
      detail: "The current design is correct as-is: one owner column, one Operator Console scoped to one facility's fields. Phase 1–5 ship as planned."
    },
    branchB: {
      label: "Multi-facility operators",
      detail: "The database needs an operator → facilities → fields hierarchy, the Operator Console needs a facility switcher, and permissions become a real design problem instead of an implicit assumption — this pushes scope into Phase 1, not a later phase, because the Booking Service's locking model has to be facility-aware from the start."
    }
  },

  coverage: [
    { area: "Customer reservation flow", covered: "full", note: "Phase 1 — core to the day-one requirement." },
    { area: "Zero double-booking guarantee", covered: "full", note: "Atomic slot lock in the Booking Service, backed by the database." },
    { area: "Operator utilization/revenue view", covered: "full", note: "Phase 2 — read-only console over Phase 1 data." },
    { area: "Dynamic pricing", covered: "full", note: "Phase 4 — AI Optimization Engine." },
    { area: "No-show prediction", covered: "full", note: "Phase 4 — same engine, second output." },
    { area: "Real-time slot rebalancing", covered: "full", note: "Phase 5 — background worker." },
    { area: "Payment collection", covered: "full", note: "Phase 3 — third-party Payment Gateway." },
    { area: "Multi-facility / franchise management", covered: "none", note: "Not implied by the idea; see the open question." },
    { area: "League / tournament / team management", covered: "none", note: "The idea never mentions leagues or teams." },
    { area: "Notifications (email/SMS)", covered: "none", note: "Plausible in a real product, but not stated in the idea — left out rather than assumed." },
    { area: "Native mobile apps", covered: "none", note: "The idea doesn't name a platform; this design assumes responsive web is enough for day one." },
    { area: "Authentication / authorization detail", covered: "partial", note: "Two roles (operator, customer) are named; the permissions model beyond that is undesigned." }
  ],

  notCovered: [
    "Multi-facility franchise or brand-level management (the idea describes a single operator's fields, not a chain).",
    "League, tournament, or team-management features — nothing in the idea mentions leagues or teams.",
    "Notifications (email/SMS confirmations or reminders) — plausible, but the idea never states it.",
    "Native mobile apps — the idea doesn't specify a platform; this design assumes a responsive web app is sufficient for day one.",
    "Detailed authentication/authorization design beyond “operator” and “customer” as the two roles the idea names.",
    "Any pricing floor/ceiling business rules for the AI — the idea says pricing is dynamic but not by how much; that's a product decision, not an architecture one."
  ],

  sections: [
    { id: "summary", file: "01-summary.html", name: "Summary", desc: "The idea, the day-one requirement, and what the system looks like end to end." },
    { id: "components", file: "02-components.html", name: "Components", desc: "Every piece of the system and the words in the idea that required it." },
    { id: "architecture", file: "03-architecture.html", name: "Architecture", desc: "The flowchart and sequence diagram showing how components connect." },
    { id: "dataflow", file: "04-dataflow.html", name: "Data Flow", desc: "The 12-step walkthrough from search to confirmed booking." },
    { id: "buildorder", file: "05-buildorder.html", name: "Build Order", desc: "Five phases, what each one builds, and what it proves." },
    { id: "assumptions", file: "06-assumptions.html", name: "Assumptions", desc: "What was assumed, its impact if wrong, and the one open question." },
    { id: "coverage", file: "07-coverage.html", name: "Coverage", desc: "What this design covers in full, partially, or not at all." }
  ]
};
