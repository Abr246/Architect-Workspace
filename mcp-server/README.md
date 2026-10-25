# mcp-server

This folder will become an MCP server — a small program that gives an AI
assistant new abilities (like looking something up or saving something),
following a standard called the Model Context Protocol (MCP).

Right now it does not do anything yet. This step only proves it can start.
No abilities have been added.

## Which language this uses, and why

**Python.** This repo already has a working MCP server in the
`order-status-mcp/` folder, built with Python and already tested and
working. Using the same language means this new server can reuse the same
proven setup instead of installing a second, separate toolchain
(TypeScript/Node, which the rest of this repo's `backend/` and `frontend/`
folders use for the actual product, not for MCP servers). One language for
MCP work in this repo, not two.

**Something worth knowing:** this folder does not have its own Python
setup yet — no such thing exists here on purpose, since you asked for
nothing beyond the three items below. The start command below borrows the
Python setup that already exists inside `order-status-mcp/`. That's fine
for this step, but it means this server currently depends on that other
folder's setup existing. If `order-status-mcp/` is ever deleted, this
server's start command would need to change. A dedicated setup for this
folder is a sensible next step, once you're ready for it — just flagging
it now rather than deciding it for you.

## How to start it

Open a terminal (PowerShell) in the root of this repository — the folder
that contains this `mcp-server` folder, `backend`, `frontend`, and so on —
and type exactly this:

```
order-status-mcp\.venv\Scripts\python.exe mcp-server\src\server.py
```

## What you should see

**Nothing.** The cursor will just sit there on a blank line, with no text
printed at all.

This is correct, not broken. An MCP server talks to a client (like the
Inspector, or an AI assistant) over the same channel it would normally use
to print text — so it deliberately stays silent and waits. "Silent and
waiting" is what a healthy, running MCP server looks like from a plain
terminal. It is not stuck; it is listening.

To stop it, click into that terminal and press `Ctrl+C`. It should stop
cleanly with no error message.

## How to actually confirm it's working (optional, but reassuring)

Since the terminal itself won't tell you anything, here's a second command
that will. Open a **second** terminal (leave the first one running, or
it's fine to run this after stopping the first — either works), in the
same repo root folder, and type:

```
npx --yes @modelcontextprotocol/inspector --cli order-status-mcp\.venv\Scripts\python.exe mcp-server\src\server.py --method tools/list
```

The first time you run this, it may take a few seconds while it downloads
a small tool — that's normal. You should see exactly this:

```
{
  "tools": []
}
```

An empty list is correct — no abilities have been added yet. This
confirms the server started, responded, and is speaking MCP correctly.

## What's not here yet

No tools, no resources, no prompts. Those get added in a later step.
