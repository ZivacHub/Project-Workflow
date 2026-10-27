---
name: pickup
description: Continue a workflow project in a new chat without losing the thread. Re-loads the goal (PRODUCT.md), the plan board, open decisions and the handoff, opens only the files the next step needs (reading tiers), verifies them against git and each other by script, briefs the owner in plain words with choice cards for anything waiting on the owner, then continues strictly in plan order. Use when the owner types /pickup or says "continue", "where were we", "keep going", "what's next", "resume".
---

# Pickup

Purpose: a new chat knows nothing. Past chats drifted because (a) the handoff said one thing and the plan another, (b) the original goal got lost, (c) questions were jargon, (d) choices were made without the owner. This skill prevents those four, and reads as little as it can get away with: only the files the next step needs.

File locations depend on the project's docs layout (v3 = `docs/`, v2 = project root): see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md. `pickup-context.mjs` tells you which layout the project has.

## 0. Read the options; make the chat reachable from the phone if the owner wants that (do first, takes a second)
Run `node ~/.claude/hooks/pickup-context.mjs --options`. It prints one line `owner=<name> root=<projects folder> remoteControl=on|off renameChat=on|off`: who the owner is, the projects folder every path below refers to, and the owner's personal options. If `remoteControl=on` and the tool `mcp__ccd_session_mgmt__set_remote_control` is available, call it with `session_id: "self"`, `enabled: true` (if it is already on nothing changes; if the approval card is declined, just carry on). In a terminal chat that tool doesn't exist: tell the owner once to type `/remote-control`. Say in one line whether Remote Control is on. If `remoteControl=off`, skip this and say nothing about it.

## 1. Find the project (which folder are we talking about?)
Look in this order and use the first that gives a workflow project (a folder directly under the projects folder, `root=` above, not `_template` or `_workflow`) or the **workshop**. The workshop is the projects root itself: it is not a project (no PRODUCT.md, no plan board) but the place where the owner edits `_template`, `_workflow` and the shared rules, skills and hooks. It has its own `.claude/handoff.md` and `.claude/memory.md`.
1. A project the owner named in their message ("pickup MyApp"), or "pickup workshop" / "pickup root" for the workshop.
2. The chat's primary working directory (see the environment info at the top of the conversation; if the chat was started in a project folder, or the owner switched/added one, this is it).
3. Any additional directory that was added to the chat. If two different projects are present, ask which one.
4. Otherwise (chat is in the projects root, nothing named): **ask which one** (the owner may be answering from a phone). Use AskUserQuestion with the workshop first, then one option per project that has a handoff (skip `_template`, placeholder handoffs), newest first, at most 4 options in all. Label = project name (workshop: "Workflow workshop (templates + shared workflow)"); description = one plain line: where it stopped, how many decisions wait on the owner, when last worked. Mark the newest "(last worked)".
Then use that folder's absolute paths for everything. For the workshop the folder is the projects root and the "plan" is the step list in its handoff: next step = its handoff's "Next steps" step 1 (there is no Status board, so skip the plan-vs-handoff check). If the chat did not start in that folder, say once in one line that a chat opened inside the project folder also loads that project's own skills and start-up check, and that this chat is reading everything by hand instead.

## 2. Load what the next step needs (reading tiers: never skip a file that matters, never read one that doesn't)
The start-up check only loads context when a chat STARTS in a project folder. If the owner added or named the folder later, nothing was loaded, so do it now:
1. Run `node ~/.claude/hooks/pickup-context.mjs "<project folder>"` (for the workshop pass the projects root: it prints the project table, the workshop handoff + its check, memory, the template changelog, git and an inventory of the workshop documents instead of the items below). For a project it prints, in one go: the docs layout, the goal, plan progress, the current phase's file (v3) or the next step's detail cut out of PLAN.md (v2), decisions waiting, the handoff with its script check, the last memory entries, git status/log, `docs/INDEX.md` (v3) or an inventory of every `.md`/`.txt` (v2), the files on the handoff's `Read first:` line, and a **READ BUDGET** (what a pickup opens whole; target <= 30 KB).
2. **Tier 0 (always)** is already in that output: goal, board, open decisions, handoff. Do not re-read those files whole. Also read `CLAUDE.md` if it was not shown.
3. **Tier 1 (this step):** OPEN with the Read tool every file on the handoff's `Read first:` line, and the current phase file if the output cut it. On a v2 project there is no `Read first:` line: read the full `PLAN.md` section of the next phase and the files the handoff or the step names. If the output lists `NEXT STEP ... NEEDS`, open those area docs too, and nothing else of `docs/design/`. For another topic run `node ~/.claude/hooks/docs-find.mjs "<topic>"` and open only the files it names (the `docs` skill).
4. **Tier 2 (on demand):** `AUDIT.md` open items, `TASKS.md`/`GATES.md`, `DESIGN.md`/`ARCHITECTURE.md`/`TESTING.md`, older memory (`.claude/memory/`), other phases: open one ONLY when the next step touches it. `docs/INDEX.md` says when each is needed; when unsure, check its row, or read the file's first 40 lines rather than skip it or read it all.
5. The briefing ends with two lines: `Files read: <what you actually opened>` and `Not opened (on demand): <the docs you left out on purpose>`. If a document the next step clearly needs isn't in "Files read", you skipped it: go back. If the READ BUDGET is over 30 KB, say so in the briefing (the project's handoff or docs need slimming; propose `handoff`/`plan` fixes, don't do them unasked).
## 3. Verify (script + git, always)
- `node ~/.claude/hooks/handoff-lint.mjs <project folder>`: format, numbering, git hash, commits since, plan position.
- `git status -sb`, `git log --oneline -8`. Commits newer than the handoff or uncommitted work means the handoff is stale: read those commits and treat them as the truth.
- **Plan vs handoff:** the next step must be the first unticked step of the first unfinished phase on the board (docs/plan/BOARD.md, v2: PLAN.md). If the handoff says something else, that is a conflict: show both to the owner, with the reason the handoff gives (if any), and ask. Do NOT pick silently and do NOT jump ahead (this is exactly how a past chat went from phase 4 to phase 7).
- Anything the handoff says is "running" (servers, Docker, Ollama) may have stopped: check before relying on it; start what the next step needs (see ~/.claude/TOOLS.md).

## 4. Brief the owner (plain words, <= ~14 lines)
```
Project: <name>
Goal (your words, from PRODUCT.md): "<one line quote>"
Where we are: Phase <N> of <M> "<title>": <x>/<y> steps done   [e.g. ■■■■□□□□ 4/8]
Last time: <1-3 lines: what was finished, what was left half-done>
Next per the plan: <step ID + title>. In plain words: <what it does and what you will be able to see/try afterwards>
Waiting on you: <N decisions: list the titles>   (details below as choice cards)
Check: <OK | what didn't match (handoff vs plan vs git)>
Files read: <list of the files you opened>
Not opened (on demand): <docs left out on purpose>      Read budget: <x> KB
```
Then, for each decision waiting on the owner (max 3 at once; the rest are only listed), a **choice card** in the exact style defined in ~/.claude/CLAUDE.md "How to ask the owner". Use AskUserQuestion when available, with each option's description saying what it means and what would change for the owner. If a question comes from a project doc written in jargon, translate it first: never forward it as written.
If PRIOR_ART.md (docs/reference/, v2: root) has `[ ] pending` ideas (search it for "pending", don't read the whole file), list them as plain choices ("adopt / reject / later") once; don't block work on them.

**Name the chat** (so several pickups can be told apart): right after the briefing, only if `renameChat=on` (step 0) and the tool `mcp__ccd_session_mgmt__set_session_title` is available, rename this chat with `session_id: "self"` to `<Project> · <next step id + short name> · <day month hh:mm>` (example: `My App · 2.3 Design pass · 15 Oct 14:30`). If the app asks the owner to approve the new title, that is fine. In a terminal chat use `/rename` text instead and tell the owner the suggested name.
## 5. Record answers properly
When the owner answers: write the owner's own words into DECISIONS.md (docs/DECISIONS.md in v3), set the status to `[decided <date>]` and the Result line, and in v3 move the block from "Waiting on the owner" to the bottom of "Decided". If the owner's answer is vague ("depends", "whatever", "you choose"), it is NOT a decision: write your interpretation as `[proposed]`, say it back in one sentence, and get a yes. Never write "Decision: ..." in your own voice for something the owner didn't say. Work that does not depend on the open item can continue meanwhile.

## 6. Start
- **First step of a phase?** Run the phase gate (see `plan` skill): plain-words preview, visible skills/repos search result, the phase's open decisions as choice cards, the owner's go. Then build.
- **Mid-phase and not blocked?** Start the next step. Follow the project's CLAUDE.md skills; use the step's "Done when/Test". Follow the `delegate` skill BEFORE starting: grade the step on the spot (the phase file's `Grade:` is only a first guess; none = grade it now), say in one line the grade, model, effort and where it runs (a helper, or here), delegate only what that skill allows, and check the result against the step's Test before ticking.
- **Blocked on the owner?** Ask the choice card(s), and offer the next unblocked step from the plan (not a different phase) meanwhile.
- **The owner added something new** ("continue, but first X" or a new idea): do X, and if it changes scope, propose the plan edit (plan skill: add/reorder with a Change log line) instead of just doing it.
- When a step is done: tick the board with proof right away. At a phase end or when the chat is getting long: `handoff`.

## Drift alarms (stop and tell the owner if any is true)
- You are about to do something not on the board or not in the plan order.
- The step doesn't clearly serve the goal in PRODUCT.md.
- You're about to decide something that belongs in DECISIONS.md.
- You're explaining with words the owner hasn't seen explained.
