"""
generate_pdf.py - builds CheckSetup_Submission.pdf from a write-up plus the
full source of check_setup.py. One-off generator script; not part of the
deliverable itself.
"""

from pathlib import Path
from fpdf import FPDF

HERE = Path(__file__).resolve().parent
SCRIPT_PATH = HERE / "check_setup.py"
OUTPUT_PATH = HERE / "CheckSetup_Submission.pdf"

script_source = SCRIPT_PATH.read_text(encoding="utf-8")

pdf = FPDF(format="Letter")
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_margins(20, 20, 20)
pdf.add_page()


def mc(h, text, **kw):
    # multi_cell leaves the cursor wherever text ended, not back at the
    # left margin -- reset x before every call or later calls silently
    # run out of horizontal room.
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, h, text, **kw)


# --- Title ---
pdf.set_font("Helvetica", "B", 18)
mc(10, "Claude API Connection Verification")
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(90, 90, 90)
mc(6, "check_setup.py -- Anthropic Python SDK setup and verification script")
pdf.set_text_color(0, 0, 0)
pdf.ln(4)


def heading(text):
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(20, 40, 90)
    mc(8, text)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(1)


def body(text):
    pdf.set_font("Helvetica", "", 10.5)
    mc(5.5, text)
    pdf.ln(3)


def bullet(text):
    pdf.set_font("Helvetica", "", 10.5)
    mc(5.5, f"-  {text}")


# --- Objective ---
heading("1. Objective")
body(
    "Verify that a working, correctly authenticated connection to the Claude API "
    "can be established using the official Anthropic Python SDK, with credentials "
    "loaded from environment configuration rather than hardcoded in source, and "
    "with clear, human-readable error handling for the most common setup mistakes."
)

# --- What was built ---
heading("2. What Was Built")
body(
    "check_setup.py loads ANTHROPIC_API_KEY and ANTHROPIC_MODEL from a local .env "
    "file using python-dotenv, sends a single short test message to Claude asking "
    "it to confirm the connection in one sentence, and prints three things on success:"
)
bullet("The model that actually answered (read from the API response, not just the request)")
bullet("Claude's reply text")
bullet("The input and output token counts from the response's usage data")
pdf.ln(2)
body(
    "If ANTHROPIC_API_KEY is missing, empty, or still set to an obvious placeholder "
    "value, the script prints a specific plain-English fix and exits -- it never "
    "attempts an API call with invalid credentials. If Anthropic's servers reject "
    "the key at request time (authentication failure), the script catches that "
    "specific error and prints a plain-English fix instead of letting a raw stack "
    "trace surface. Permission, model-not-found, and network-connection errors are "
    "handled the same way, each with its own targeted message."
)

# --- Environment setup ---
heading("3. Environment Setup Performed")
bullet("Installed Python 3.12 via winget (Python.Python.3.12)")
bullet("Installed the anthropic and python-dotenv packages via pip")
bullet("Created a local .env file (excluded from version control via .gitignore) to hold ANTHROPIC_API_KEY and ANTHROPIC_MODEL")
pdf.ln(3)

# --- Security notes ---
heading("4. Security Notes")
bullet("The API key is never hardcoded in check_setup.py -- it is read only from the environment at runtime")
bullet("The .env file is excluded from git via the project's .gitignore, so it cannot be committed accidentally")
bullet("No real API key value is included anywhere in this document or in the repository")
pdf.ln(3)

# --- How to run ---
heading("5. How to Run")
pdf.set_font("Courier", "", 10)
pdf.set_fill_color(245, 245, 245)
mc(5.5, "python check_setup.py", fill=True)
pdf.ln(4)

# --- Script listing ---
pdf.add_page()
heading("6. Full Script Listing -- check_setup.py")
pdf.set_font("Courier", "", 8.5)
pdf.set_fill_color(245, 245, 245)
for line in script_source.splitlines():
    safe_line = line if line.strip() else " "
    mc(4.2, safe_line, fill=True)

pdf.output(str(OUTPUT_PATH))
print(f"Wrote {OUTPUT_PATH}")
