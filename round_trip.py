"""
One complete tool-use round trip for the Order Support Assistant —
answers customer questions about order status for a small online retailer.

Run with:  python round_trip.py
Requires:  pip install anthropic python-dotenv
           ANTHROPIC_API_KEY set in a .env file (see project root)
"""

import os
import json
from dotenv import load_dotenv
import anthropic

load_dotenv()  # reads ANTHROPIC_API_KEY from .env

client = anthropic.Anthropic()  # picks up ANTHROPIC_API_KEY automatically

# --- Hardcoded data source (stands in for the real order database) ---
ORDERS = {
    "ORD-4821": {"status": "shipped", "shipped_date": "2026-08-22", "eta": "2026-08-25"},
    "ORD-5190": {"status": "processing", "shipped_date": None, "eta": "2026-08-27"},
    "ORD-3007": {"status": "delivered", "shipped_date": "2026-08-15", "eta": "2026-08-18"},
}


def get_order_status(order_id: str) -> str:
    """MY function — the only thing that actually touches the data source."""
    order = ORDERS.get(order_id)
    if order is None:
        return f"No order found with ID {order_id}."
    if order["status"] == "shipped":
        return f"Shipped on {order['shipped_date']}, expected delivery {order['eta']}."
    if order["status"] == "processing":
        return f"Still processing, expected to ship by {order['eta']}."
    if order["status"] == "delivered":
        return f"Delivered on {order['shipped_date']}."
    return "Status unknown."


# --- The one tool this program exposes to Claude ---
order_status_tool = {
    "name": "get_order_status",
    "description": (
        "Look up the current shipping status and estimated delivery date for a "
        "customer's order by order ID. Use this whenever the customer asks where "
        "their order is, its shipping status, or when it will arrive."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The order ID, e.g. 'ORD-4821'.",
            }
        },
        "required": ["order_id"],
    },
}

MODEL = "claude-opus-5"
USER_QUESTION = "Hi, can you tell me the status of order ORD-4821?"


def main() -> None:
    messages = [{"role": "user", "content": USER_QUESTION}]

    # ---------- (1) THE REQUEST I SENT ----------
    print("=" * 60)
    print("(1) THE REQUEST I SENT")
    print("=" * 60)
    request_payload = {
        "model": MODEL,
        "max_tokens": 1024,
        "tools": [order_status_tool],
        "messages": messages,
    }
    print(json.dumps(request_payload, indent=2))

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        tools=[order_status_tool],
        messages=messages,
    )

    # ---------- (2) STOP_REASON ----------
    print("\n" + "=" * 60)
    print("(2) STOP_REASON THAT CAME BACK")
    print("=" * 60)
    print(response.stop_reason)

    # ---------- (3) THE TOOL_USE BLOCK ----------
    tool_use_block = next(b for b in response.content if b.type == "tool_use")
    print("\n" + "=" * 60)
    print("(3) TOOL_USE BLOCK (arguments the model filled in)")
    print("=" * 60)
    print(f"id:    {tool_use_block.id}")
    print(f"name:  {tool_use_block.name}")
    print(f"input: {json.dumps(tool_use_block.input, indent=2)}")

    # ---------- (4) MY FUNCTION EXECUTES ----------
    print("\n" + "=" * 60)
    print("(4) MY FUNCTION EXECUTES (this line, right here)")
    print("=" * 60)
    order_id = tool_use_block.input["order_id"]
    result_text = get_order_status(order_id)  # <-- this is the line
    print(f"get_order_status({order_id!r}) -> {result_text!r}")

    # ---------- (5) THE TOOL_RESULT I SEND BACK ----------
    messages.append({"role": "assistant", "content": response.content})
    tool_result_message = {
        "role": "user",
        "content": [
            {
                "type": "tool_result",
                "tool_use_id": tool_use_block.id,
                "content": result_text,
            }
        ],
    }
    messages.append(tool_result_message)
    print("\n" + "=" * 60)
    print("(5) THE TOOL_RESULT I SEND BACK")
    print("=" * 60)
    print(json.dumps(tool_result_message, indent=2))

    response2 = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        tools=[order_status_tool],
        messages=messages,
    )

    # ---------- (6) THE FINAL ANSWER ----------
    final_text = next(b.text for b in response2.content if b.type == "text")
    print("\n" + "=" * 60)
    print("(6) THE FINAL ANSWER")
    print("=" * 60)
    print(f"stop_reason: {response2.stop_reason}")
    print(final_text)


if __name__ == "__main__":
    main()
