#!/usr/bin/env bash
set -euo pipefail

# 1. Read the JSON payload the harness pipes on stdin.
# WHY: PostToolUse on Write hands us the file that was just written.
payload="$(cat)"

# Pull out the file path. No jq on this machine, so parse with node
# (already installed, already this repo's stack) instead of adding a
# dependency — same approach as commit-guard.sh.
file_path="$(printf '%s' "$payload" | node -e '
let data = "";
process.stdin.on("data", chunk => { data += chunk; });
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(data);
    const p = (parsed.tool_response && parsed.tool_response.filePath) ||
              (parsed.tool_input && parsed.tool_input.file_path) || "";
    process.stdout.write(String(p));
  } catch (err) {
    process.stdout.write("");
  }
});
')"

# 2. Only act on a project-update report. Anything else, skip silently.
# WHY: this hook has one job -- keep the exec-facing status report readable.
# It must never reformat unrelated files, so it exits quietly on everything
# outside docs/updates/UPDATE_*.md (matched with either slash style since
# this can run under Windows or POSIX paths).
case "$file_path" in
  *docs[/\\]updates[/\\]UPDATE_*.md) ;;
  *) exit 0 ;;
esac

# 3. Run the formatter. Plain Node, no external dependency -- no formatter
#    exists elsewhere in this repo today (see .claude/commands/ship.md).
node "$CLAUDE_PROJECT_DIR/scripts/format-report.js" "$file_path"

exit 0
