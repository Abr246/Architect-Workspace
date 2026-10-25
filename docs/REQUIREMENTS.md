# GoalKick — Requirements

AI-powered soccer field booking and management platform

This is the source of truth for what you are building. Your Claude Code prompts
point here. If you sharpen a requirement, edit it — your version is the real one.

| Kind | Meaning |
|---|---|
| Functional | something the system does |
| Safety | a guardrail, with a check that enforces it |
| Reliability | how it behaves when something fails |
| Non-functional | a quality attribute (usability, accessibility, performance) not tied to one feature |
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

### REQ-026 — Functional · must

The system must present the assistant as a chat interface ("GoalKick AI") that answers questions about fields, bookings, scheduling issues, and customers using real application data, with suggested questions and a clear fallback for anything outside its known topics.

Fulfilled by: STORY-022

## Analytics

### REQ-014 — Functional · must

The system must detect busy and slow booking periods.

Fulfilled by: STORY-007

### REQ-025 — Functional · must

The system must give facility managers a visual breakdown of booking volume, revenue, field performance, and peak times, over a selectable look-back window, using only real booking and field data.

Fulfilled by: STORY-021

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

### REQ-019 — Functional · must

The system must let staff view every booking that has been made, including who made it, which field, and its status.

Fulfilled by: STORY-014

### REQ-020 — Functional · must

The system must let staff view every question asked through the assistant and every help request submitted, including its outcome.

Fulfilled by: STORY-015

### REQ-021 — Functional · must

The system must give facility managers an at-a-glance overview of field availability, today's bookings, pending approvals, scheduling issues, and recent activity.

Fulfilled by: STORY-017

### REQ-022 — Functional · must

The system must let a customer open a dedicated details page for a specific field, showing its full information, amenities, and availability, before booking it.

Fulfilled by: STORY-018

### REQ-023 — Functional · must

The system must notify users of booking and scheduling events — new bookings, cancellations, scheduling conflicts, decided requests, and upcoming bookings — through a notification panel they can read, mark as read, and act on.

Fulfilled by: STORY-019

## Conflict Detection

### REQ-010 — Functional · must

The system must detect booking conflicts.

Fulfilled by: STORY-005

### REQ-013 — Functional · must

The system must detect scheduling issues.

Fulfilled by: STORY-012

### REQ-024 — Functional · must

The system must let managers see and resolve scheduling conflicts from a dedicated conflict-center page, using only existing booking and field data.

Fulfilled by: STORY-020

## Customer Interaction

### REQ-012 — Functional · must

The system must detect customer requests.

Fulfilled by: STORY-009

## Data Integration

### REQ-016 — Constraint

The system must connect to the booking database.

Fulfilled by: STORY-016

### REQ-017 — Constraint

The system must connect to the customer information database.

Fulfilled by: STORY-016

## Field Availability

### REQ-001 — Functional · must

The system must allow customers to view available soccer fields.

Fulfilled by: STORY-001

### REQ-009 — Functional · must

The system must detect available and unavailable soccer fields.

Fulfilled by: STORY-001

## User Experience

### REQ-018 — Non-functional · must

The system must present a consistent, professional visual design across all
customer- and operator-facing pages.

Fulfilled by: STORY-013

## Human Oversight

### REQ-008 — Functional · must

The system must send important decisions such as refunds and complaints to a human for approval.

Fulfilled by: STORY-004

### REQ-015 — Functional · must

The system must identify when an issue needs to be sent to a human for approval.

Fulfilled by: STORY-004, STORY-009
