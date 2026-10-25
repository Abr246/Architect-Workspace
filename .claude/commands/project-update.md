---
description: Turn recent commits and PROGRESS.md entries into a plain-language project update for non-technical stakeholders
argument-hint: [time range or focus, e.g. "last 2 weeks" or "STORY-010"]
allowed-tools: Bash(git log:*), Read, Write, Glob
---

1. Work out the reporting window.
   - Look inside `docs/updates/` for the most recently dated file already there.
     If one exists, the window is "since that file's date."
   - If none exists, default to the last 7 days.
   - If `$ARGUMENTS` gives an explicit range ("last 2 weeks") or a specific
     item ("STORY-010"), that overrides the default.
   <!-- WHY: so this command can be re-run every week/sprint without the
        user having to remember or type a date each time — it just picks up
        where the last update left off. -->

2. Gather the raw evidence, read-only, from two independent sources:
   - `git log --since="<window>" --pretty=format:"%h %ad %s" --date=short`
     for the commit history in that window.
   - The tail of `PROGRESS.md` for the matching entries (these carry
     verification evidence, not just intent).
   - If `$ARGUMENTS` names a specific STORY-nnn, also read
     `docs/stories/STORY-nnn.md` for its acceptance criteria.
   Do not run any command that changes files at this step.
   <!-- WHY: commit messages alone are often terse or technical
        ("fix retry logic"). PROGRESS.md entries are required to carry
        verification evidence, so cross-checking the two catches anything
        that was committed but never actually confirmed working. -->

3. Rewrite what was found into plain business language. No file paths, no
   function names, no code terms. Structure the output as:
   - **Headline** — one sentence, what happened
   - **What shipped** — 2-5 bullets, described as outcomes ("customers can
     now do X"), not implementation ("refactored the Y service")
   - **Why it matters** — the business reason, tied back to the underlying
     requirement or story where one exists
   - **Status & risks** — anything incomplete, blocked, or flagged; say so
     plainly rather than omitting it
   - **What's next** — the next unchecked item in the plan
   <!-- WHY: an executive reader needs to know what capability exists now
        and whether anything needs their attention — not which service file
        changed. If nothing shipped in the window, say that plainly instead
        of padding the summary. -->

4. Save the result to `docs/updates/UPDATE_<YYYY-MM-DD>.md` (create the
   folder if it doesn't exist) and also print it in the chat.
   This command only writes that one file. It never runs `git add`,
   `git commit`, or `git push` — sharing or filing the update is a separate,
   human-triggered step.
   <!-- WHY: saving a dated file is what makes step 1 work next time — each
        run closes the loop for the run after it, building a running
        history you can hand to anyone without re-asking. Not auto-committing
        keeps this command from silently changing repo history. -->
