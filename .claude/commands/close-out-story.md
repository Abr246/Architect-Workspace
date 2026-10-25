---
description: Verify a GoalKick story's acceptance criteria for real, record honest pass/fail in progress.json, log it in PROGRESS.md, and commit with the required story trailer
argument-hint: [STORY-nnn]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(npm --prefix backend test:*), Bash(npm --prefix backend run typecheck:*), Bash(npm --prefix frontend test:*), Bash(npx tsc --noEmit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

This command does the full "finish a story" job from `CLAUDE.md`'s GoalKick
section: real verification, an honest `progress.json` update, a `PROGRESS.md`
entry, and a commit carrying the story trailer. It never fakes a passing
criterion and it never pushes without asking.

1. **Resolve the target story.**
   - If `$ARGUMENTS` names a `STORY-nnn`, use it.
   - Otherwise read `.colaberry/progress.json` and list every story whose
     `verification.state` is not `"verified"`. If there's exactly one, confirm
     it with me before proceeding. If there are several, or none, **ask me**
     which story (or which already-verified story to re-check) rather than
     guessing.
   <!-- WHY: guessing the wrong story wastes the whole run and can write a
        false pass/fail record against the wrong criteria. -->

2. **Gather the real facts, read-only.**
   - Read `docs/stories/STORY-<nnn>.md` in full.
   - Read that story's object out of `.colaberry/progress.json` — its
     `criteria[]` array is the exact, graded text. Never paraphrase it and
     never add or drop a criterion.
   - Run `git status --short` and `git diff` to see what's actually sitting
     in the working tree right now.
   - Run `git log --oneline -20 -- <files this story previously touched>`
     (from `files_touched` in progress.json, if this story was touched
     before) to see what's already landed.
   No file is changed in this step.

3. **Reconcile the working tree against this story before touching anything.**
   - For any modified or untracked file that plausibly belongs to this
     story's scope, decide whether it's in-scope. If it's ambiguous — for
     example a test file for a service this story owns, changed for reasons
     that aren't obviously this story's acceptance criteria — **ask me**
     whether it belongs in this close-out or is unrelated work-in-progress I
     want left alone.
   - Never stage or commit a file you haven't confirmed belongs to this
     story's scope.
   <!-- WHY: the repo may have other uncommitted work sitting in the tree
        from something else entirely. Silently sweeping it into this story's
        commit misattributes it and pollutes the story's audit trail. -->

4. **Verify every acceptance criterion for real.** For each criterion:
   - Identify the concrete test(s) that cover it (search `tests_added` for
     this story, and the relevant `*.test.ts`/`*.test.tsx` files).
   - Run them: `npm --prefix backend test -- <pattern>` and/or
     `npm --prefix frontend test -- --watchAll=false <pattern>`.
   - Also run `npm --prefix backend run typecheck` (`tsc --noEmit`) for any
     backend file this story touches, and the frontend equivalent if it
     touches frontend files.
   - A criterion is only "passed" if you have a concrete artifact: an actual
     passing test name, or a manual check you personally ran and can quote
     (e.g. a curl response). Intent, or "this should work," is not evidence.
   - Confirm at least one **failure-path** test exists for this story's
     scope (malformed input, a conflicting state, a dependency failure) —
     per this repo's Definition of Done, happy-path-only is incomplete. If
     none exists, that criterion set is not done — say so, don't invent one
     you didn't verify.
   - Grep the diff for anything that looks like a secret (API keys, tokens,
     connection strings) before going further. If you find one, STOP and
     report it instead of continuing.

5. **Update `.colaberry/progress.json` honestly.**
   - Edit only the fields this session owns for this story: `criteria[].passed`
     (and `evidence` where useful), `files_touched`, `tests_added`, `notes`.
   - Never touch `verification` — that block is platform-owned.
   - A criterion that didn't pass stays `false`. Do not round up.
   - Do not add criteria that aren't already in the array.

6. **Write the `PROGRESS.md` entry** (root `CLAUDE.md`'s hard gate — every
   change touching backend/frontend/scripts needs one):
   - Re-read the tail of `PROGRESS.md` first; don't anchor on a stale copy.
   - Reuse this session's Session ID if one was already minted this session;
     otherwise mint `CC-<YYYYMMDD>-<4 random alphanumerics>` now.
   - Append, don't rewrite, using the required format: task name, date,
     session, one-line what-changed, verification evidence (real test
     output or "criterion N/M passing"), and notes only if something is
     incomplete or a deviation was made.

7. **Stage exactly the files this story's work touched** — the story file
   updates, `.colaberry/progress.json`, `PROGRESS.md`, and any source/test
   files confirmed in-scope in step 3. Never `git add -A`.

8. **Commit** with a message ending in both required trailers on their own
   lines:
   ```
   STORY-<nnn>: <what actually changed, one line>

   <body: what was verified and how, 1-3 lines>

   Story: STORY-<nnn>
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```

9. **Stop before pushing.** Show me the commit (`git log -1 --stat`) and ask
   me to confirm before running `git push` — pushing changes shared remote
   history and isn't this command's call to make silently.
   <!-- WHY: everything through the commit is local and reversible; a push
        is visible to everyone else pulling this repo, so it gets its own
        explicit yes, same as `/ship` never auto-committing. -->

10. **Report honestly.** State plainly: how many of the story's criteria
    actually passed out of the total, which (if any) did not and why, and
    whether the story is fully done or only partly — a partly-finished story
    is a legitimate, expected result, not a failure of this command.
