import json
import time
import warnings
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from mcp.server import MCPServer
from mcp.server.mcpserver import Context
from mcp.server.mcpserver.exceptions import ResourceNotFoundError
from mcp.shared.exceptions import MCPDeprecationWarning
from mcp_types import EmptyResult, SetLevelRequestParams
from pydantic import BaseModel, Field

mcp = MCPServer("order-status")


async def _handle_set_logging_level(ctx: Any, params: SetLevelRequestParams) -> EmptyResult:
    # This toy server emits at every level and lets the client filter, so
    # there is nothing to store from the requested minimum severity.
    return EmptyResult()


# Declare the logging capability at construction time. MCPServer's ergonomic
# constructor has no parameter for this: SEP-2577 deprecated the capability,
# so the wrapper dropped the pass-through, and capability advertisement is
# derived purely from whether a "logging/setLevel" handler is registered on
# the low-level server underneath. Skip this and every _emit_log call below
# still "succeeds" with no error raised anywhere -- the client just silently
# drops every notification, because it never saw `logging` in the initialize
# handshake. That's the whole bug: nothing breaks, nothing tells you why.
with warnings.catch_warnings():
    warnings.simplefilter("ignore", MCPDeprecationWarning)
    mcp._lowlevel_server.add_request_handler(
        "logging/setLevel", SetLevelRequestParams, _handle_set_logging_level
    )


async def _emit_log(ctx: Context, level: str, event: str, **fields: Any) -> None:
    """Send one structured notifications/message log line to the client.

    Payload is always {"event": <stable name>, ...fields}, never a formatted
    sentence, so it stays greppable across thousands of invocations. Uses the
    SEP-2577-deprecated logging capability on purpose: this SDK build exposes
    no successor for arbitrary tool-side structured logs, and the capability
    is still fully functional for any client that opts in.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", MCPDeprecationWarning)
        await ctx.log(level, {"event": event, **fields}, logger_name="order-status")


async def _resolve_within_roots(ctx: Context, requested_path: Path) -> Path | None:
    """Resolve `requested_path` to its real location and confirm it falls
    inside one of the client's declared roots. Returns the resolved Path if
    allowed, or None if the client declared no usable roots, roots aren't
    reachable at all (no back-channel, client doesn't support the capability,
    client declined), or the resolved path lands outside every root -- all
    three cases deny.

    ORDER IS THE WHOLE CONTROL: resolve the real path first (follow symlinks,
    collapse "..") and only then compare against the roots. Comparing the raw
    path instead -- e.g. a string prefix check like
    str(requested_path).startswith(str(root)) -- is insufficient for two
    separate reasons, either one of which breaks it on its own:
      1. ".." segments make a path that is textually "under" the root
         resolve somewhere else entirely once the filesystem walks it, so a
         prefix check on the unresolved string never sees the escape.
      2. A prefix check treats any sibling that merely shares a name prefix
         as if it were inside the root -- root "/data/app" would wrongly
         pass a request for "/data/app-evil/secret", which is a different
         directory, not a subdirectory.
      A symlink living inside an allowed root can also point outside it;
      only following it (resolve() does this) exposes that. Comparing
      resolved-to-resolved path *components* via `relative_to`, not raw
      strings, is the only order/method pair immune to all of the above.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", MCPDeprecationWarning)
        try:
            roots_result = await ctx.session.list_roots()
        except Exception:
            # No back-channel, client doesn't support roots, or it declined:
            # fail closed. A denial we can't explain is still a denial.
            return None

    allowed_roots: list[Path] = []
    for root in roots_result.roots:
        try:
            allowed_roots.append(Path(root.uri.path).resolve(strict=False))
        except (ValueError, OSError):
            continue
    if not allowed_roots:
        return None

    resolved = requested_path.resolve(strict=False)
    for allowed_root in allowed_roots:
        try:
            resolved.relative_to(allowed_root)
            return resolved
        except ValueError:
            continue
    return None


ESCALATIONS_FILE = Path(__file__).parent / "escalations.jsonl"

ORDERS = [
    {"order_id": "ORD-4821", "customer": "Maria Chen",   "status": "shipped",    "shipped_date": "2026-08-22", "eta": "2026-08-25"},
    {"order_id": "ORD-5190", "customer": "James Okafor", "status": "processing", "shipped_date": None,         "eta": "2026-08-27"},
    {"order_id": "ORD-3007", "customer": "Priya Nair",   "status": "delivered",  "shipped_date": "2026-08-15", "eta": "2026-08-18"},
    {"order_id": "ORD-6644", "customer": "Maria Chen",   "status": "processing", "shipped_date": None,         "eta": "2026-08-30"},
]


class OrderRow(BaseModel):
    order_id: str
    customer: str
    status: str
    shipped_date: str | None
    eta: str


class EscalationReason(str, Enum):
    REFUND_REQUEST = "refund_request"
    DELIVERY_PROBLEM = "delivery_problem"
    DAMAGED_ITEM = "damaged_item"
    OTHER = "other"


@mcp.tool()
async def search_orders(
    ctx: Context,
    query: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            description="Order ID or customer name to search for, e.g. 'ORD-4821' or 'Maria Chen'.",
        ),
    ],
    limit: Annotated[
        int,
        Field(gt=0, le=20, description="Maximum number of matching orders to return."),
    ] = 5,
) -> list[OrderRow]:
    """
    Call this whenever a customer asks about the status, shipping progress, or
    delivery estimate of an order, and you do not already have that information
    in this conversation. Search by order ID or by customer name — partial
    matches are fine. Always look up the order here before answering; never
    guess or assume a status.
    """
    correlation_id = uuid4().hex
    started = time.monotonic()
    await _emit_log(ctx, "info", "tool_started", correlation_id=correlation_id, tool_name="search_orders")

    q = query.strip().lower()
    progress_token = (ctx.request_context.meta or {}).get("progress_token")
    matches: list[OrderRow] = []
    for i, row in enumerate(ORDERS, start=1):
        # Only clients that opted in with a progress token get these; everyone else sees no protocol change at all.
        if progress_token is not None:
            await ctx.report_progress(i, len(ORDERS), f"Checking order {row['order_id']}")
        if q in row["order_id"].lower() or q in row["customer"].lower():
            matches.append(OrderRow(**row))
    result = matches[:limit]

    # query itself is user-supplied text (may be a customer's name) so it never
    # leaves this process; query_length is the safe, still-useful substitute.
    await _emit_log(
        ctx,
        "info",
        "tool_completed",
        correlation_id=correlation_id,
        tool_name="search_orders",
        duration_ms=round((time.monotonic() - started) * 1000, 1),
        query_length=len(query),
        result_count=len(result),
    )
    return result


@mcp.resource("orders://{order_id}", mime_type="application/json")
def get_order(order_id: str) -> dict:
    """
    The live order and shipment record for a single order, addressed by its
    order ID. Read this to ground any answer about an order's status,
    shipping date, or delivery estimate — never guess from memory.
    """
    for row in ORDERS:
        if row["order_id"] == order_id:
            return row
    raise ResourceNotFoundError(f"No order found with id {order_id!r}.")


@mcp.tool()
async def escalate_order_issue(
    ctx: Context,
    order_id: Annotated[
        str,
        Field(min_length=1, max_length=20, description="The order ID this issue is about, e.g. 'ORD-4821'."),
    ],
    customer_message: Annotated[
        str,
        Field(
            min_length=1,
            max_length=1000,
            description="The customer's question or complaint, as close to verbatim as possible.",
        ),
    ],
    reason: Annotated[
        EscalationReason,
        Field(description="Why this needs a human: refund_request, delivery_problem, damaged_item, or other."),
    ],
) -> dict:
    """
    Call this when the order record alone cannot answer what the customer
    is asking — a refund request, a damaged item, a delivery that never
    arrived, or anything else the order data doesn't explain. This does not
    resolve the issue itself: it files a ticket for a human agent to pick
    up. It never issues a refund, cancels an order, or changes any order
    state.
    """
    correlation_id = uuid4().hex
    started = time.monotonic()
    await _emit_log(
        ctx, "info", "tool_started", correlation_id=correlation_id, tool_name="escalate_order_issue", order_id=order_id
    )

    if not any(row["order_id"] == order_id for row in ORDERS):
        await _emit_log(
            ctx,
            "info",
            "tool_completed",
            correlation_id=correlation_id,
            tool_name="escalate_order_issue",
            order_id=order_id,
            duration_ms=round((time.monotonic() - started) * 1000, 1),
            escalated=False,
        )
        return {
            "escalated": False,
            "ticket": None,
            "message": f"No order found with id {order_id!r}; nothing was escalated.",
        }

    ticket = {
        "ticket_id": uuid4().hex,
        "order_id": order_id,
        "customer_message": customer_message,
        "reason": reason.value,
        "filed_at": datetime.now(timezone.utc).isoformat(),
    }

    allowed_target = await _resolve_within_roots(ctx, ESCALATIONS_FILE)
    if allowed_target is None:
        await _emit_log(
            ctx,
            "warning",
            "access_denied",
            correlation_id=correlation_id,
            tool_name="escalate_order_issue",
            order_id=order_id,
            requested_path=str(ESCALATIONS_FILE),
        )
        return {
            "escalated": False,
            "ticket": None,
            "message": "Escalation was not filed: the ticket file is outside the client's declared roots.",
        }

    write_started = time.monotonic()
    await _emit_log(
        ctx,
        "info",
        "external_call_started",
        correlation_id=correlation_id,
        tool_name="escalate_order_issue",
        order_id=order_id,
        boundary_name="escalation_file_write",
    )
    try:
        with allowed_target.open("a", encoding="utf-8") as f:
            f.write(json.dumps(ticket) + "\n")
    except OSError as exc:
        # Caught deliberately so the failure is traced under this invocation's
        # correlation id before it propagates -- the framework still turns the
        # re-raise into the tool's normal crash response; nothing is swallowed.
        await _emit_log(
            ctx,
            "error",
            "tool_error",
            correlation_id=correlation_id,
            tool_name="escalate_order_issue",
            order_id=order_id,
            error_class=type(exc).__name__,
            duration_ms=round((time.monotonic() - started) * 1000, 1),
        )
        raise
    await _emit_log(
        ctx,
        "info",
        "external_call_finished",
        correlation_id=correlation_id,
        tool_name="escalate_order_issue",
        order_id=order_id,
        boundary_name="escalation_file_write",
        duration_ms=round((time.monotonic() - write_started) * 1000, 1),
    )

    # customer_message is the customer's raw complaint text; it never leaves
    # this process. ticket_id, order_id and reason are safe identifiers/enums.
    await _emit_log(
        ctx,
        "info",
        "tool_completed",
        correlation_id=correlation_id,
        tool_name="escalate_order_issue",
        order_id=order_id,
        duration_ms=round((time.monotonic() - started) * 1000, 1),
        escalated=True,
        ticket_id=ticket["ticket_id"],
        reason=reason.value,
    )
    return {
        "escalated": True,
        "ticket": ticket,
        "message": f"Ticket {ticket['ticket_id']} filed for order {order_id}.",
    }


@mcp.prompt()
def handoff_brief(order_id: str) -> str:
    """
    Trigger this by name when a support agent is picking up an escalated
    case and needs a fast, grounded briefing before responding to the
    customer — not something the model should fire on its own.
    """
    # Multi-turn workflows can return a list of typed `Message` objects
    # instead of a single string, one message per turn — not needed here,
    # since this is a single instruction handed to whoever runs it next.
    return f"""Handoff brief for order {order_id}.

1. Read the `orders://{order_id}` resource for this order's current status, shipped date, and ETA. If that read fails because no such order exists, stop here and report plainly: "No order found with id '{order_id}' — nothing to hand off." Do not invent an order record.
2. From the order record, write a two-to-three sentence summary of what this order looks like right now, and anything about its status that would explain a delay or problem.
3. If the order record alone does not explain why this case needed a human, call the `escalate_order_issue` tool with this order_id, the customer's original message, and the closest matching reason, so a ticket exists for the agent to act on. If a ticket already exists for this order, do not file a duplicate — say so instead.
4. Produce a final brief with exactly two sections: "Order status" and "Recommended next step for the agent."
"""


if __name__ == "__main__":
    mcp.run(transport="stdio")
