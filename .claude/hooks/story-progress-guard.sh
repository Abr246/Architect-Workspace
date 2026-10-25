#!/usr/bin/env bash
set -euo pipefail

# 1. Read the JSON payload the harness pipes on stdin.
# WHY: PreToolUse hands us the exact shell command about to run, before it runs.
payload="$(cat)"

# Pull out .tool_input.command. No jq on this machine, so parse with node
# (already installed, already this repo's stack) -- same approach as
# commit-guard.sh.
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

# 2. Only act on commands that actually run `git commit`. The "if" filter
# in settings.json already narrows this, but check again here too, since
# a compound command ("cd x && git commit ...") can still slip through.
case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# 3. Find every STORY-nnn the commit message references. Read the raw
# command text, not a parsed message -- the message may arrive as
# -m "..." or as a heredoc, but the story id is plain text either way.
story_ids="$(printf '%s' "$command" | grep -oE 'STORY-[0-9]+' | sort -u || true)"

# No story named -- nothing for this guard to check. Most commits (a
# typo fix, a doc tweak) have no story to link, and that's fine.
if [[ -z "$story_ids" ]]; then
  exit 0
fi

# 4. CLAUDE.md's rule for finishing a story is two steps, in that order:
# update .colaberry/progress.json, THEN commit naming the story. This is
# exactly the rule this hook exists to make impossible to forget.
staged="$(git diff --cached --name-only 2>/dev/null || true)"
if ! printf '%s\n' "$staged" | grep -qx '.colaberry/progress.json'; then
  echo "story-progress-guard: blocked -- this commit names $(printf '%s' "$story_ids" | tr '\n' ' ') but .colaberry/progress.json is not staged. Update the story's criteria in progress.json and run 'git add .colaberry/progress.json' before committing (see CLAUDE.md: \"When you finish a story\")." >&2
  exit 2
fi

# 5. Belt and suspenders: the story id named in the message should
# actually show up in what changed in progress.json -- catches naming
# the wrong story, or staging progress.json for an unrelated reason.
diff_text="$(git diff --cached -- .colaberry/progress.json 2>/dev/null || true)"
missing=""
while IFS= read -r id; do
  [[ -z "$id" ]] && continue
  if ! printf '%s' "$diff_text" | grep -q "$id"; then
    missing="$missing $id"
  fi
done <<< "$story_ids"

if [[ -n "$missing" ]]; then
  echo "story-progress-guard: blocked -- this commit names$missing but that story id doesn't appear in the staged .colaberry/progress.json changes. Double-check this is the right story before committing." >&2
  exit 2
fi

# 6. Both halves are present and they match. Proceed.
exit 0
