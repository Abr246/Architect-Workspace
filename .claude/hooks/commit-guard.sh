#!/usr/bin/env bash
set -euo pipefail

# 1. Read the JSON payload the harness pipes on stdin.
# WHY: the harness hands your script an envelope describing what is about to happen.
payload="$(cat)"

# Pull out .tool_input.command. No jq on this machine, so parse with node
# (already installed, already this repo's stack) instead of adding a dependency.
command="$(printf '%s' "$payload" | node -e '
let data = "";
process.stdin.on("data", chunk => { data += chunk; });
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(data);
    process.stdout.write(String((parsed.tool_input && parsed.tool_input.command) || ""));
  } catch (err) {
    process.stdout.write("");
  }
});
')"

# 2. Decide. Block known-destructive commands.
# WHY: exit 2 from a PreToolUse hook vetoes the tool call, and stderr becomes the reason Claude sees.
if [[ "$command" == *"git push --force"* || "$command" == *"rm -rf /"* ]]; then
  echo "commit-guard: blocked — command matches a forbidden pattern (git push --force / rm -rf /): $command" >&2
  exit 2
fi

# 3. Otherwise, proceed.
# WHY: exit 0 means proceed. The exit code is the entire API.
exit 0
