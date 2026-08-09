---
name: system-architect
description: Use when the user has a project idea and wants a system architecture, a technical design, or a diagram of how it would work (e.g. "design the architecture for X", "how would this system work technically", "give me a diagram of how the pieces fit together"). Takes a one-paragraph project idea, identifies the real components that specific idea needs, produces a mermaid flowchart of the data flow, and explains each component in one plain-English sentence. Do NOT use for architecture reviews of existing code, refactor planning, or infrastructure changes to this repo — those are normal engineering work, not blueprinting a new idea.
---

# System Architect

## Scope — when this skill applies

- **Triggers:** the user describes a project idea (new product, feature, or system) and wants to know how it would be built — an architecture, a technical design, or a diagram.
- **Does not trigger on its own for:** reviewing or refactoring this repo's existing architecture, planning a migration, or making infrastructure changes to `/backend` or `/frontend`. Those are engineering tasks with real code to read, not blueprints for a new idea.

## 1. Read the idea, don't template it

Take the user's one-paragraph project idea as the sole source of truth for what components exist. Do not reach for a generic "frontend / backend / database" starter kit and fill in the blanks — every component in the output must trace back to something the idea actually implies.

- If the idea implies a mobile or web client, include a frontend/client component — otherwise don't invent one.
- If the idea implies a server that owns business logic, include a backend/API component.
- If the idea implies data that must persist between sessions or users, include a database — name the kind of data it holds, not just "database."
- If the idea implies calling out to something the user doesn't own (payments, maps, email, SMS, a model provider, a third-party dataset), include it as an explicit external service.
- If the idea implies an LLM, agent, recommendation engine, or other AI-driven decision-making, include an AI/agent layer — and be specific about what it decides or generates, not just "AI layer."
- If the idea has no AI component, don't add one. If it has no external service, don't add one. A correct architecture for a simple idea is short.

If the idea is too vague to identify real components (e.g., a single buzzword with no description of what it does, who uses it, or what data moves through it), ask the user one clarifying question before proceeding rather than guessing a generic shape.

## 2. Design the data flow

For each component identified in step 1, work out:

- What triggers it (user action, scheduled job, webhook, another component's output)
- What it sends and to whom
- What it stores and where
- What comes back to the user, if anything

This is the substance of the diagram in step 3 — do this reasoning before drawing, not while drawing.

## 3. Produce a genuine mermaid flowchart

Build a `flowchart` (not a generic box-and-line description in prose) that reflects the actual data flow worked out in step 2:

- Every node must be a component identified in step 1 — no placeholder or decorative nodes.
- Every edge must represent a real data flow or trigger relationship, labeled with what moves along it (e.g. `-- user query -->`, not an unlabeled arrow).
- Direction should read naturally for the system (typically left-to-right or top-to-bottom following the user's action through the system).
- Keep it genuinely specific to this idea: two different project ideas that both have a "backend" should not produce the same diagram shape unless their data flows are actually the same.

## 4. Explain each component in plain English

For every node in the diagram, write exactly one sentence a non-technical person could follow — what it does and why it's there, no jargon, no implementation detail that isn't necessary to understand its role.

## 5. Save the result

Write the full output — the components identified, the mermaid diagram, and the plain-English explanations — to `project-blueprint/architecture.md`. Create the `project-blueprint/` directory if it does not exist.

Structure the file as:

```markdown
# Architecture: <project name or short idea summary>

## Components

- **<Component>** — <plain-English sentence>
- ...

## Diagram

```mermaid
flowchart <direction>
...
```

## Notes

<any assumptions made about the idea, or the clarifying question asked, if applicable>
```

## Rules

- Never output a component the idea doesn't support just to look thorough. A three-component diagram for a simple idea is correct; a seven-component diagram is a defect if three of them aren't implied by the idea.
- The mermaid diagram must be valid mermaid syntax — check node names don't collide and edges reference declared nodes.
- Stay concrete: name real technologies or roles where the idea implies them (e.g. "Postgres" if the idea says "structured records," "object storage" if it says "user-uploaded files"), but don't invent a specific vendor the user never mentioned unless it's the obvious default for the described behavior.
