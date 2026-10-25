"""
score_prompt.py - runs a prompt against a set of test cases and grades it.

Plain-English summary of what this does:
  1. You give it two files: a prompt file (the instructions we send to
     Claude) and an eval.jsonl file (a list of test cases, one per line,
     each with an "input" and an "expected" answer - like the ones in
     prompts/score-noshow-risk/eval.jsonl).
  2. For every test case, it takes the prompt file's text and swaps in
     that case's input values, then sends the result to Claude.
  3. It reads Claude's reply, pulls out the JSON object in it, and checks
     it against the "expected" answer for that case.
  4. At the end it prints a score (how many cases matched, out of how
     many), one line per case that failed showing what we expected vs.
     what came back, which model was used, and how many cases ran.

How the prompt file should reference input fields:
  Write {{field_name}} anywhere in the prompt text and this script will
  replace it with that field's value from the test case's "input" object.
  Example: if a case has "customer_id": "CUST-1042", write {{customer_id}}
  in the prompt and it becomes CUST-1042 before we send it to Claude.

How matching works (only these three rules - nothing fancier):
  - Only the fields listed in "expected" are checked. Anything else the
    model adds is ignored.
  - Text fields: matched ignoring UPPER/lower case and extra spaces.
  - Number fields: matched if they're within NUMBER_TOLERANCE of each
    other, not just if they're exactly equal.

Usage:
  python scripts/score_prompt.py <prompt_file> <eval_file>

Example:
  python scripts/score_prompt.py prompts/score-noshow-risk/prompt.md prompts/score-noshow-risk/eval.jsonl
"""

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
import anthropic

# This project's .env file lives at the project root, one folder up from
# this scripts/ folder.
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

# How close two numbers need to be to count as "the same" - handles tiny
# rounding differences (e.g. 0.80 vs 0.801) instead of demanding an exact
# match.
NUMBER_TOLERANCE = 0.01

DEFAULT_MODEL = "claude-opus-5"

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


def fail(message: str) -> None:
    """Print a plain-English message and stop - never a raw stack trace."""
    print(message)
    sys.exit(1)


def looks_like_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    if lowered in PLACEHOLDER_MARKERS:
        return True
    if "your" in lowered and "key" in lowered:
        return True
    return False


def load_api_key_and_model() -> tuple[str, str]:
    load_dotenv(dotenv_path=ENV_PATH)

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    model = os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

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

    return api_key, model


def read_prompt_template(path: Path) -> str:
    if not path.exists():
        fail(
            f"Could not find the prompt file at {path}.\n"
            "Fix: check the path you typed, or create that file first."
        )
    return path.read_text(encoding="utf-8")


def read_eval_cases(path: Path) -> list[dict]:
    if not path.exists():
        fail(
            f"Could not find the eval file at {path}.\n"
            "Fix: check the path you typed, or create that file first."
        )

    cases = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            case = json.loads(line)
        except json.JSONDecodeError:
            print(f"Warning: line {line_number} of {path} is not valid JSON - skipping it.")
            continue
        if "input" not in case or "expected" not in case:
            print(f"Warning: line {line_number} of {path} is missing \"input\" or \"expected\" - skipping it.")
            continue
        cases.append(case)

    if not cases:
        fail(f"No usable test cases found in {path}.")

    return cases


def fill_placeholders(template: str, input_values: dict) -> str:
    filled = template
    for field_name, value in input_values.items():
        filled = filled.replace("{{" + field_name + "}}", str(value))

    leftover = re.findall(r"\{\{[^}]+\}\}", filled)
    if leftover:
        print(f"Warning: these placeholders were never filled in: {', '.join(leftover)}")

    return filled


def extract_json_object(text: str) -> dict | None:
    """Find the JSON object inside Claude's reply, even if there's extra
    wording or a markdown code fence around it."""
    text = text.strip()

    # Try the simple case first: the whole reply is just JSON.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Otherwise, grab everything between the first { and the last } and
    # try that instead.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None


def values_match(expected_value, actual_value) -> bool:
    if isinstance(expected_value, bool):
        return isinstance(actual_value, bool) and expected_value == actual_value

    if isinstance(expected_value, (int, float)):
        try:
            return abs(float(actual_value) - float(expected_value)) <= NUMBER_TOLERANCE
        except (TypeError, ValueError):
            return False

    if isinstance(expected_value, str):
        if not isinstance(actual_value, str):
            return False
        return expected_value.strip().lower() == actual_value.strip().lower()

    # Fallback for anything else (lists, dicts, None): must match exactly.
    return expected_value == actual_value


# Fields listed here are shown for every case so you can read them, but they
# never count toward the score. Free text like a one-sentence explanation
# will almost never match another write-up of the same idea word-for-word,
# even when the reasoning itself is correct - so grading it by exact text
# match would fail good answers for the wrong reason.
INFORMATIONAL_FIELDS = {"reason"}


def compare_case(expected: dict, actual: dict) -> tuple[bool, list[str]]:
    """Check only the graded fields named in `expected` (skips anything
    listed in INFORMATIONAL_FIELDS). Returns whether every graded field
    matched, plus a plain-English line per field that didn't."""
    mismatches = []
    for field_name, expected_value in expected.items():
        if field_name in INFORMATIONAL_FIELDS:
            continue
        actual_value = actual.get(field_name, "(missing)")
        if not values_match(expected_value, actual_value):
            mismatches.append(f"  {field_name}: expected {expected_value!r}, got {actual_value!r}")
    return (len(mismatches) == 0, mismatches)


def informational_lines(expected: dict, actual: dict) -> list[str]:
    """Build read-only, ungraded comparison lines for fields listed in
    INFORMATIONAL_FIELDS, so you can eyeball them even though they don't
    affect the score."""
    lines = []
    for field_name in expected:
        if field_name not in INFORMATIONAL_FIELDS:
            continue
        actual_value = actual.get(field_name, "(missing)")
        lines.append(f"  {field_name} - expected: {expected[field_name]!r}")
        lines.append(f"  {field_name} - got:      {actual_value!r}")
    return lines


def call_claude(client: anthropic.Anthropic, model: str, prompt_text: str) -> str:
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt_text}],
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

    return "".join(block.text for block in response.content if block.type == "text"), response.model


def main() -> None:
    if len(sys.argv) != 3:
        fail(
            "Usage: python scripts/score_prompt.py <prompt_file> <eval_file>\n"
            "Example: python scripts/score_prompt.py "
            "prompts/score-noshow-risk/prompt.md prompts/score-noshow-risk/eval.jsonl"
        )

    prompt_path = Path(sys.argv[1])
    eval_path = Path(sys.argv[2])

    prompt_template = read_prompt_template(prompt_path)
    cases = read_eval_cases(eval_path)
    api_key, model = load_api_key_and_model()

    client = anthropic.Anthropic(api_key=api_key, timeout=60.0)

    passed = 0
    failures = []
    model_used = model

    for case_number, case in enumerate(cases, start=1):
        filled_prompt = fill_placeholders(prompt_template, case["input"])
        reply_text, model_used = call_claude(client, model, filled_prompt)

        actual = extract_json_object(reply_text)
        if actual is None:
            failures.append(
                f"Case {case_number} FAILED: could not find a JSON object in the reply.\n"
                f"  Raw reply: {reply_text[:200]!r}"
            )
            continue

        info_lines = informational_lines(case["expected"], actual)
        if info_lines:
            print(f"Case {case_number} (for your review, not graded):")
            print("\n".join(info_lines))
            print()

        matched, mismatches = compare_case(case["expected"], actual)
        if matched:
            passed += 1
        else:
            failures.append(f"Case {case_number} FAILED:\n" + "\n".join(mismatches))

    total = len(cases)
    score = passed / total if total else 0.0

    print()
    if failures:
        for failure in failures:
            print(failure)
        print()

    print(f"Score: {score:.2f} ({passed}/{total} cases matched)")
    print(f"Model: {model_used}")
    print(f"Cases run: {total}")


if __name__ == "__main__":
    main()
