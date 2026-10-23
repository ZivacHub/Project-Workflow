---
name: handoff
description: Save where the work stands so the next chat continues without drifting. Rewrites .claude/handoff.md from scratch (plan position, strictly numbered next steps with a "Read first:" file list, what's waiting on the owner, git state), appends finished work to .claude/memory.md and archives old months. A script checks the result. Use when the owner says "handoff", "wrap up", "save context", "new session", "continue later", when the SessionStart hook says context was compacted, after a phase or milestone, or when the conversation is getting long.
---

# Handoff

Why this exists: every new chat starts empty. It only knows what is in these files. A handoff that is patched over and over, vague, or out of sync with the plan is how chats lose the thread and "hallucinate". So: rewrite, don't patch; copy facts from the plan, don't recall them.

Files (paths by docs layout; see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md: v3 = `docs/`, v2 = project root):
- `.claude/handoff.md`: the current state, <= ~90 lines. REWRITTEN from scratch every time. Auto-loaded into every new chat.
- `.claude/memory.md`: permanent log, append-only, dated. In v3 it holds the current month; older months live in `.claude/memory/YYYY-MM.md`.
- The plan board (`docs/plan/BOARD.md`; v2: `PLAN.md`) and `docs/DECISIONS.md` (v2: `DECISIONS.md`): the sources the handoff copies from.

## Steps
1. **Gather the facts** (read, don't recall): the plan board, the decisions (open/proposed ones), AUDIT.md open items if any, `git status -sb`, `git log --oneline -8`, the project CLAUDE.md, and the previous handoff + last memory entries.
2. **Tick the Status board first.** Every step finished in this session gets `[x]` (with its proof noted in the step or memory), the step in progress gets `[~]`. If a phase is fully done, tick the phase. The handoff must not claim progress the board doesn't show.
3. **Append to `.claude/memory.md`** one dated entry per finished piece of work since the last entry: what, why, changed paths, how it was verified, lessons. Skip what's already logged. Move any gotchas from the old handoff that are no longer needed day-to-day into memory.md.
   **Archive old months (layout v3 projects only):** run `node ~/.claude/hooks/memory-rotate.mjs <project folder>` (dry run), and if it lists entries from earlier months, run it again with `--apply`. It moves them to `.claude/memory/YYYY-MM.md`, keeps the current month and the newest 3 entries, deletes nothing, and checks the move entry by entry. v2 projects: skip. Also in v3: answered decisions already sit under "Decided" in docs/DECISIONS.md (the pickup moves them); make sure "Waiting on the owner" there holds only open/proposed ones.
4. **Rewrite `.claude/handoff.md`** using exactly the template format (`_template/.claude/handoff.md`):
   - `Git:` line = branch @ short hash "subject" · pushed yes/no · uncommitted (real values from step 1; commit first if the owner allows committing, then use the new hash).
   - **Where we are in the plan:** copy the phase title, steps done x/y and the next step from the board. If the real next step is not the board's, say why and cite the DECISIONS/Change-log ID. Never leave a silent mismatch.
   - **Last session:** what was done and what is left unfinished, each with where (file, step ID, commit).
   - **Next steps:** ONE list, numbered 1,2,3 (never 0 or -1, never a second list above it). Step 1 is concrete (a step ID, a file, a command) and has "done when". Order follows the plan. **v3 projects: step 1 gets an indented line `Read first: <1-4 files, paths from the project root, comma-separated>`**: the current phase file (docs/plan/phases/NN-name.md) plus only the reference docs that step really needs (e.g. docs/reference/DESIGN.md for UI work). This line is what keeps the next pickup small; a file that is not needed must not be on it, a file that is needed must be. The check fails if a named file does not exist.
   - **Waiting on the owner:** every open or proposed decision (ID + one plain line), and any question you asked that the owner hasn't answered. "nothing" only if true.
   - **Gotchas:** at most 8, only things still true that a fresh chat would get wrong. Prune the rest.
   - **Running / not committed:** services up, uncommitted files.
5. **Run the check:** `node ~/.claude/hooks/handoff-lint.mjs <project folder>`. It prints warnings (too long, numbering, no Git line, commits since, plan next step not mentioned). Fix every warning, re-run until clean.
6. **Cold-start test** (answer honestly, fix the file until all are yes): Could a brand-new chat with only this file + PRODUCT.md + the plan board + the files on `Read first:` start step 1 without asking the owner anything it could have known? Is every term explained or linked? Does anything claim something that isn't true right now?
7. If the owner allows committing in this project: commit the handoff/memory/board together; push if the project allows.
8. **Tell the owner, in plain words, 4-6 lines:** where we are in the plan (phase x of y), what's next, what is waiting on them, and that they can open a new chat in this folder and type `/pickup` (or just "continue"). If step 9 applies, add one line: "Remote Control for this chat is now switched off; `/pickup` switches it on in the next chat." If step 9 does not apply, say nothing about Remote Control and do not tell them to open a new chat: this chat goes on.
9. **Remote Control (only if `node ~/.claude/hooks/pickup-context.mjs --options` says `remoteControl=on`; otherwise skip this step and say nothing about it): switch it off ONLY when the owner is ending this chat.** The owner's rule: `/handoff` typed by THE OWNER turns Remote Control off; `/pickup` turns it on. So:
   - **The owner ended the chat** (the owner typed `/handoff`, or said wrap up / new session / continue later / I'm done / save and stop): as the very last action, after the message above (it disconnects the phone), if the tool `mcp__ccd_session_mgmt__set_remote_control` is available, call it with `session_id: "self"`, `enabled: false` and report the state it returns. In a terminal chat that tool doesn't exist: tell them the chat stays reachable until they close it.
   - **You started this handoff yourself** (a phase or milestone just closed, the hook said context was compacted, the chat is getting long): the chat carries on, so DO NOT call `set_remote_control` at all and do not mention Remote Control. (Past bug: a chat did its own handoff at a phase close and asked the owner to switch Remote Control off in the middle of their session.)
   - Either way, skip this step if the owner says to leave it on. (Recommended app setting: "Connect new sessions to Remote Control" Off, so a new chat is not reachable from the phone until `/pickup` switches it on.)

## Rules
- Rewrite, never append patches to the old handoff. History belongs in memory.md.
- Never put secrets, keys or passwords in either file.
- Anything uncertain is written as "unverified", not stated as fact.
