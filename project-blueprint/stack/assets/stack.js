/* STACK — single source of truth for the tech-stack knowledge base.
   Every page renders from this object. Do not duplicate a number or
   string anywhere else in the site; change it here and every page updates.
   Sibling of ../assets/blueprint.js (the architecture data), not a replacement for it. */
const STACK = {
  meta: {
    title: "Tech Stack — AI-Powered Soccer Facility Booking & Utilization Platform",
    shortName: "Pitch AI",
    projectName: "Pitch AI",
    sourceDoc: "project-blueprint/architecture.md",
    headline: "This stack is most likely to break at the AI Optimization Engine, not because scikit-learn is the wrong tool, but because of timing: it's the one component recommended here that requires data Pitch AI won't have on day one. Everything else — the booking flow, the database, the payment — can work correctly from the very first customer. The AI can't, until enough real bookings exist to train it on.",
    generated: "2026-08-06"
  },

  fitKey: [
    { icon: "🟢", level: "green", label: "Great fit", meaning: "Matches this project's size and needs — pick it, move on." },
    { icon: "🟡", level: "amber", label: "Good fit", meaning: "Works, but there's a real caveat to read first." },
    { icon: "🔴", level: "red", label: "Consider carefully", meaning: "Where this plan is most likely to hurt you." }
  ],

  /* group.fromFlow = true means these rows came from the DATA FLOW, not the architecture's component list */
  groups: [
    {
      id: "touch",
      name: "Things a person touches",
      desc: "The two frontends a customer and an operator actually see and click.",
      fromFlow: false,
      items: [
        {
          id: "booking-app",
          component: "Customer Booking App",
          tech: "React + Vite (TypeScript)",
          fit: "green",
          why: "React lets you build the booking screen out of small reusable pieces, and Vite (the tool that assembles those pieces into a fast website) keeps that screen feeling instant, which matters since “seconds to book” is the one thing Pitch AI must nail on day one.",
          caveat: null,
          prompt: "Explain React and Vite to me like I'm new to frontend development, using Pitch AI's Customer Booking App as the example. Walk me through what a \"find and reserve a slot in seconds\" screen would actually look like as React components."
        },
        {
          id: "operator-console",
          component: "Operator Console",
          tech: "React + Vite (TypeScript), sharing a component library with the Customer Booking App",
          fit: "amber",
          why: "Reusing the same React toolkit as the Customer Booking App means one small team can build and maintain both screens without learning two different tools.",
          caveat: "For Phase 2's read-only views alone, a drag-and-drop admin tool would ship faster, but it won't grow cleanly into the field-management features operators need later.",
          prompt: "Explain how to share a component library between two React apps, using Pitch AI's Customer Booking App and Operator Console as the example. What would actually live in the shared library versus stay separate?"
        }
      ]
    },
    {
      id: "write",
      name: "Things you write",
      desc: "The services and workers your own team builds and owns the logic for.",
      fromFlow: false,
      items: [
        {
          id: "booking-service",
          component: "Booking Service",
          tech: "Node.js + Express (TypeScript)",
          fit: "green",
          why: "Node.js handles many customers trying to book at once without falling over, and Express (the toolkit that turns Node into a web server) is simple enough that a small team can read every line of it.",
          caveat: "The zero-double-booking promise has to come from the database transaction, not from Node itself — get that wrong and no backend language saves you.",
          prompt: "Explain Node.js and Express to me like I'm new to backend development, using Pitch AI's Booking Service as the example. How would it use a Postgres transaction to guarantee zero double-bookings?"
        },
        {
          id: "ai-engine",
          component: "AI Optimization Engine",
          tech: "scikit-learn (Python) behind a small FastAPI microservice",
          fit: "red",
          why: "scikit-learn (a toolkit for turning data into prediction models) is the standard way to turn booking history into a no-show score and a price — but that history doesn't exist yet.",
          caveat: "Architecture's own assumptions call this out: Pitch AI has zero booking history on day one, so this component has nothing to learn from until Phases 1–3 have been running long enough to accumulate it. Ship a simple rule-based price/no-show score first, and only switch to a trained model once real bookings exist. It's also a second language (Python next to Node), which is real ops overhead for a small team.",
          prompt: "Explain scikit-learn and FastAPI to me like I'm new to machine learning, using Pitch AI's AI Optimization Engine as the example. How much booking history would I realistically need before this no-show and pricing model is trustworthy?"
        },
        {
          id: "rebalancer",
          component: "Rebalancing Worker",
          tech: "Node.js background worker process",
          fit: "green",
          why: "A small always-running Node.js process is enough to notice a cancelled slot and put it back up for booking within seconds — Pitch AI only needs “fast,” not “instant,” so nothing heavier is justified.",
          caveat: null,
          prompt: "Explain how a Node.js background worker process works, using Pitch AI's Rebalancing Worker as the example. How does it know a slot just became available without me writing a slow polling loop?"
        }
      ]
    },
    {
      id: "store",
      name: "Things you store",
      desc: "Where the system's state lives once a session ends.",
      fromFlow: false,
      items: [
        {
          id: "database",
          component: "Facility & Booking Database",
          tech: "PostgreSQL 16",
          fit: "green",
          why: "PostgreSQL keeps every booking accurate even if two people try to grab the same slot at the same instant, which is the entire point of Pitch AI's day-one promise.",
          caveat: null,
          prompt: "Explain PostgreSQL to me like I'm new to databases, using Pitch AI's Facility & Booking Database as the example. What tables would I actually have, and how does a unique constraint stop two people from booking the same slot?"
        }
      ]
    },
    {
      id: "depend",
      name: "Things you depend on",
      desc: "Third-party services this system's promises actually rely on.",
      fromFlow: false,
      items: [
        {
          id: "payments",
          component: "Payment Gateway",
          tech: "Stripe",
          fit: "amber",
          why: "Stripe collects the customer's card payment and hands Pitch AI a simple pass/fail result, so the team never has to touch or store card numbers directly.",
          caveat: "Stripe keeps roughly 30¢ + 2.9% of every charge — on a $20–$30 field-slot booking that's a real slice of a small transaction, worth knowing about upfront rather than discovering it at the first payout.",
          prompt: "Explain Stripe to me like I'm new to payments, using Pitch AI's dynamic-price checkout as the example. What does Stripe actually take a cut of on a $25 field-slot booking?"
        }
      ]
    },
    {
      id: "flow",
      name: "What the data flow needs",
      desc: "Technology the architecture's component list never named, but the 12-step data flow can't actually run without.",
      fromFlow: true,
      items: [
        {
          id: "queue",
          component: "Rebalancing Trigger (job queue)",
          tech: "pg-boss (Postgres-backed job queue)",
          fit: "green",
          why: "pg-boss watches for a cancelled or high-risk slot and hands the Rebalancing Worker a to-do item, using the same Postgres database Pitch AI is already running — no second system to keep alive.",
          caveat: null,
          prompt: "Explain what a Postgres-backed job queue like pg-boss does, using Pitch AI's Rebalancing Worker as the example. Walk me through what happens, step by step, the moment a booking is cancelled."
        },
        {
          id: "hosting",
          component: "Hosting & Deployment",
          tech: "Render",
          fit: "green",
          why: "Render runs the Booking Service, the Rebalancing Worker, and the database for you, so a small team spends its time on the booking flow instead of managing servers.",
          caveat: null,
          prompt: "Explain Render to me like I'm new to deploying software, using Pitch AI's Booking Service, database, and workers as the example. What would my actual list of services on Render look like?"
        },
        {
          id: "auth",
          component: "Operator & Customer Authentication",
          tech: "Clerk",
          fit: "amber",
          why: "Clerk handles logging Operators and Customers in and remembering who they are, so nobody on a small team has to build password security by hand.",
          caveat: "It's a recurring per-user cost and a second vendor Pitch AI now depends on just to let anyone log in at all — rolling your own is possible, but the security risk of getting it wrong outweighs the monthly fee at this stage.",
          prompt: "Explain Clerk to me like I'm new to authentication, using Pitch AI's two roles — Operator and Customer — as the example. How would it tell the Operator Console who's allowed to see which facility's revenue?"
        }
      ]
    }
  ],

  leastConfident: [
    {
      id: "ai-engine",
      component: "AI Optimization Engine",
      reason: "The technology itself is a standard, boring choice — the risk is sequencing, not tooling. Architecture's own Assumptions table already flags this as the one place a cold-start plan is required."
    },
    {
      id: "auth",
      component: "Operator & Customer Authentication",
      reason: "Architecture's “What This Design Does Not Cover” section explicitly leaves authorization undesigned. Recommending a hosted provider here is a reasonable default, not a settled decision — a small team could legitimately roll a minimal session-based auth instead and accept the risk."
    },
    {
      id: "payments",
      component: "Payment Gateway",
      reason: "Fine technically; the open question is economic (fee-per-transaction against small-dollar bookings), not architectural, and this document can't tell you the operator's actual margin tolerance."
    }
  ],

  learningOrder: [
    { order: 1, tech: "PostgreSQL 16", reason: "Everything else reads or writes through it; understand it before anything else." },
    { order: 2, tech: "Node.js + Express", reason: "The Booking Service is the make-or-break Phase 1 component." },
    { order: 3, tech: "React + Vite", reason: "Build the Customer Booking App once the Booking Service has something to call." },
    { order: 4, tech: "pg-boss", reason: "Needed the moment rebalancing enters the picture, but conceptually simple once Postgres is understood." },
    { order: 5, tech: "Stripe", reason: "Phase 3, and mostly a matter of following their integration guide correctly." },
    { order: 6, tech: "Clerk", reason: "Wire in alongside Phase 1–2 once both frontends exist, so Operator-vs-Customer access is never an afterthought." },
    { order: 7, tech: "Render", reason: "Learn deployment once there's something worth deploying, ideally by the end of Phase 1." },
    { order: 8, tech: "scikit-learn + FastAPI", reason: "Deliberately last: Phase 4 is the only phase gated on having real data to learn from." }
  ],

  alternatives: [
    { component: "Customer Booking App", chosen: "React + Vite", alternative: "Next.js", whyNot: "SSR/SEO benefits aren't needed — there's no public marketing or search-engine discovery requirement in the idea, just a fast booking flow." },
    { component: "Operator Console", chosen: "React + Vite (shared)", alternative: "Retool (low-code admin)", whyNot: "Faster for Phase 2's read-only views, but doesn't extend cleanly into the field-management features operators need later." },
    { component: "Booking Service", chosen: "Node.js + Express", alternative: "Go", whyNot: "Stronger raw concurrency guarantees, but adds a second language for a lean team when Postgres transactions already solve the atomicity requirement." },
    { component: "Facility & Booking Database", chosen: "PostgreSQL", alternative: "MongoDB", whyNot: "Booking data is inherently relational with strict uniqueness needs; a document store makes the zero-double-booking guarantee harder, not easier." },
    { component: "AI Optimization Engine", chosen: "scikit-learn / FastAPI", alternative: "Pre-trained third-party pricing API", whyNot: "Architecture's assumptions explicitly rule this out — the model is meant to train on the platform's own accumulating history." },
    { component: "Rebalancing Worker", chosen: "Node.js worker", alternative: "AWS Lambda + EventBridge", whyNot: "Adds a cloud-vendor-specific serverless stack before there's any proven scale reason to leave a simple managed host." },
    { component: "Payment Gateway", chosen: "Stripe", alternative: "Square", whyNot: "Stripe's docs/SDKs are the faster default for a small dev team; Square is reasonable if the operator already uses it in person." },
    { component: "Rebalancing Trigger", chosen: "pg-boss", alternative: "Redis + BullMQ", whyNot: "Reliable and popular, but adds a second datastore to operate; pg-boss reuses the Postgres already running." },
    { component: "Hosting & Deployment", chosen: "Render", alternative: "AWS ECS / Kubernetes", whyNot: "Significant ops overhead for a single-facility MVP with no proven scale need yet." },
    { component: "Authentication", chosen: "Clerk", alternative: "Roll-your-own JWT/session auth", whyNot: "Security-sensitive code a small team is likely to get subtly wrong; a hosted provider trades a monthly fee for correctness." }
  ],

  lockIn: [
    { tech: "PostgreSQL 16", level: "medium", reason: "Data model is portable to any other SQL database, but the migration effort is real." },
    { tech: "React + Vite (both frontends)", level: "low", reason: "UI layer only — swappable without touching backend contracts." },
    { tech: "Node.js + Express (Booking Service)", level: "medium", reason: "Rewriting the atomic-locking logic in another language is the riskiest part of the whole system to redo." },
    { tech: "scikit-learn / FastAPI", level: "low", reason: "Isolated microservice behind an API boundary — swap the whole engine without touching anything else." },
    { tech: "Node.js worker (Rebalancing)", level: "low", reason: "Small, self-contained process." },
    { tech: "Stripe", level: "high", reason: "Switching processors touches accounting, refunds, webhooks, and possibly re-verification with the operator's bank." },
    { tech: "pg-boss", level: "low", reason: "Swap for BullMQ/Redis later behind the same job interface if scale ever demands it." },
    { tech: "Render (hosting)", level: "medium", reason: "Containerized services port to most hosts; the database migration is the harder part." },
    { tech: "Clerk (auth)", level: "high", reason: "User identities and session tokens are provider-specific — migrating means re-authenticating every user." }
  ],

  notCovered: [
    "Whether Pitch AI is a good business idea, or whether operators will actually pay for it.",
    "Exact dollar hosting/vendor costs at any specific booking volume — that depends on real usage this document can't predict.",
    "A security or PCI-compliance audit — Stripe handles card data, but the rest of the system still needs its own review before launch.",
    "The actual database schema, API contracts, or UI designs — this names technologies, not the system built on top of them.",
    "Legal or contractual terms for facility operators, payouts, or refunds.",
    "A staffing or hiring plan for who builds each component."
  ],

  /* topology: what runs where, for the "your machine vs somebody else's" illustration */
  topology: {
    yours: ["booking-app", "operator-console", "booking-service", "ai-engine", "rebalancer", "database", "queue"],
    managed: ["hosting", "payments", "auth"]
  },

  sections: [
    { id: "summary", file: "01-summary.html", name: "Summary", desc: "The fit-rating key, the headline risk, and the stack at a glance." },
    { id: "recommendations", file: "02-recommendations.html", name: "Recommendations", desc: "Every component, grouped, with its one recommended technology." },
    { id: "fit-analysis", file: "03-fit-analysis.html", name: "Fit Analysis", desc: "Every rating explained, with the reds called out and defended." },
    { id: "prompts", file: "04-prompts.html", name: "Prompts", desc: "Every copy-ready follow-up prompt in one place." },
    { id: "learning-path", file: "05-learning-path.html", name: "Learning Path", desc: "What to learn first, in order, tied to the build phases." },
    { id: "alternatives", file: "06-alternatives.html", name: "Alternatives", desc: "What else was considered for each slot, and why it lost." },
    { id: "lockin", file: "07-lockin.html", name: "Lock-in", desc: "How hard each decision would be to undo later." },
    { id: "appendix", file: "08-appendix.html", name: "Appendix", desc: "What runs on your machine vs. somebody else's, and what this document doesn't tell you." }
  ]
};
