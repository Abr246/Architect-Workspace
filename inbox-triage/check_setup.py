"""
check_setup.py - verifies the Claude API connection is configured correctly.

Loads ANTHROPIC_API_KEY and ANTHROPIC_MODEL from a .env file in this folder,
sends one short message to Claude, and prints the model that answered, the
reply, and the input/output token counts. Fails with a plain-English message
(never a raw stack trace) if the key is missing, empty, still a placeholder,
or rejected by Anthropic's servers.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import anthropic

ENV_PATH = Path(__file__).resolve().parent / ".env"

PLACEHOLDER_MARKERS = {
    "your-api-key-here",
    "your_api_key_here",
    "sk-ant-your-key-here",
    "replace_me",
    "replace-me",
    "changeme",
    "change-me",
    "xxxxxxxx",
    "placeholder",
    "example",
    "todo",
}


def looks_like_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    if lowered in PLACEHOLDER_MARKERS:
        return True
    if "your" in lowered and "key" in lowered:
        return True
    return False


def fail(message: str) -> None:
    print(message)
    sys.exit(1)


def main() -> None:
    load_dotenv(dotenv_path=ENV_PATH)

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    model = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5")

    if not api_key or not api_key.strip():
        fail(
            "No ANTHROPIC_API_KEY found.\n"
            f"Fix: create a file at {ENV_PATH} containing:\n"
            "  ANTHROPIC_API_KEY=sk-ant-...\n"
            "  ANTHROPIC_MODEL=claude-opus-5\n"
            "Get a real key from https://console.anthropic.com under API Keys."
        )

    if looks_like_placeholder(api_key):
        fail(
            "ANTHROPIC_API_KEY is still set to a placeholder value, not a real key.\n"
            f"Fix: open {ENV_PATH} and replace it with your real key from "
            "https://console.anthropic.com (API Keys section) - it starts with 'sk-ant-'."
        )

    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": "Reply with a single sentence confirming this connection works.",
            }],
        )
    except anthropic.AuthenticationError:
        fail(
            "Authentication failed - the API key was rejected by Anthropic's servers.\n"
            "Fix: the key in your .env file is invalid, revoked, or was mistyped when "
            "copied. Generate a fresh key at https://console.anthropic.com (API Keys) "
            f"and update {ENV_PATH}."
        )
    except anthropic.PermissionDeniedError:
        fail(
            "The API key was recognized but does not have permission for this request.\n"
            "Fix: check your organization's access/billing settings in the Anthropic Console."
        )
    except anthropic.NotFoundError:
        fail(
            f"Model '{model}' was not recognized.\n"
            f"Fix: check the ANTHROPIC_MODEL value in {ENV_PATH} - try 'claude-opus-5'."
        )
    except anthropic.APIConnectionError:
        fail(
            "Could not reach Anthropic's servers - this looks like a network problem.\n"
            "Fix: check your internet connection and try again."
        )

    reply_text = next((b.text for b in response.content if b.type == "text"), "")

    print(f"Model that answered: {response.model}")
    print(f"Reply: {reply_text}")
    print(f"Input tokens: {response.usage.input_tokens}")
    print(f"Output tokens: {response.usage.output_tokens}")


if __name__ == "__main__":
    main()
