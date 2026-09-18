# GoalKick — Requirements

AI-powered soccer field booking and management platform

This is the source of truth for what you are building. Your Claude Code prompts
point here. If you sharpen a requirement, edit it — your version is the real one.

| Kind | Meaning |
|---|---|
| Functional | something the system does |
| Safety | a guardrail, with a check that enforces it |
| Reliability | how it behaves when something fails |
| Constraint | a technology or vendor you must use — context, not a task |

## AI Assistance

### REQ-004 — Functional · must

The system must provide an AI assistant to answer customer questions about pricing and availability.

Fulfilled by: STORY-003

### REQ-005 — Functional · must

The system must use AI agents to assist with customer service.

Fulfilled by: STORY-008

### REQ-006 — Functional · must

The system must use AI agents for scheduling.

Fulfilled by: STORY-006

### REQ-007 — Functional · must

The system must use AI agents for basic business analytics.

Fulfilled by: STORY-007

## Analytics

### REQ-014 — Functional · must

The system must detect busy and slow booking periods.

Fulfilled by: STORY-007

## Booking Management

### REQ-002 — Functional · must

The system must allow customers to choose a date and time for booking a field.

Fulfilled by: STORY-002, STORY-011

### REQ-003 — Functional · must

The system must allow customers to book a soccer field.

Fulfilled by: STORY-002, STORY-011

### REQ-011 — Functional · must

The system must detect cancellations.

Fulfilled by: STORY-010

## Conflict Detection

### REQ-010 — Functional · must

The system must detect booking conflicts.

Fulfilled by: STORY-005

### REQ-013 — Functional · must

The system must detect scheduling issues.

Fulfilled by: STORY-012

## Customer Interaction

### REQ-012 — Functional · must

The system must detect customer requests.

Fulfilled by: STORY-009

## Data Integration

### REQ-016 — Constraint

The system must connect to the booking database.

Fulfilled by: STORY-010

### REQ-017 — Constraint

The system must connect to the customer information database.

Fulfilled by: STORY-010

## Field Availability

### REQ-001 — Functional · must

The system must allow customers to view available soccer fields.

Fulfilled by: STORY-001

### REQ-009 — Functional · must

The system must detect available and unavailable soccer fields.

Fulfilled by: STORY-001

## Human Oversight

### REQ-008 — Functional · must

The system must send important decisions such as refunds and complaints to a human for approval.

Fulfilled by: STORY-004

### REQ-015 — Functional · must

The system must identify when an issue needs to be sent to a human for approval.

Fulfilled by: STORY-004, STORY-009
