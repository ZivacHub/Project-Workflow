---
name: plan
description: Show, edit and run a project's build plan (the Status board with [ ] / [~] / [x] per phase and step, in docs/plan/BOARD.md; older projects: PLAN.md), keep each phase's detail in its own small file, and split an old monolithic PLAN.md. Use when the owner types /plan or says "where are we in the plan", "show the plan", "add a phase", "move X before Y", "drop this step", "change the plan", "mark it done", "start the next phase", or when a phase is about to start or end (phase gate / phase close).
---

# Plan

Where things live (see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md): in **layout v3** the board, the rules and the change log are `docs/plan/BOARD.md`, and each phase's detail is its own file `docs/plan/phases/NN-name.md` (NN = the phase number, two digits: Phase 4 -> `04-screens.md`, Phase 4b -> `04b-daily-batch.md`; copy `_template/docs/plan/phases/_example.md`). In **layout v2** everything is in one `PLAN.md` (board under `## Status board`, detail under `## Phases (details)`); section G splits it. Every rule below says "the board"/"the phase file": read it as the v3 file, or as the matching part of PLAN.md in v2.

The board has one tracking place: the `## Status board` section. Format (a script reads it, keep the shape):
```
- [x] Phase 0 — Title
  - [x] 0.1 Step title
- [~] Phase 1 — Title
  - [x] 1.1 ...
  - [~] 1.2 ...
  - [ ] 1.3 ...
```
Marks: `[ ]` not started · `[~]` in progress · `[x]` done (proof recorded) · `[-]` dropped (reason in the Change log).
Details (purpose in plain words, "Grade / Use / Done when / Test / Decisions needed" per step; the Grade comes from the `delegate` skill) live in the phase's own file (v2: under `## Phases (details)`). Decisions live in DECISIONS.md, the work split and quality checklist in `docs/reference/TASKS.md`, the skills list in CLAUDE.md: none of those are repeated in the plan.

## A. Show (/plan, "where are we")
Read the board only (not the phase files) and answer in plain words:
- A progress line per phase with counts and a small bar, e.g. `Phase 3 Finisher  ■■■■■■■□ 7/8  [~]`.
- "Now: Phase N. Next step: ID title, and what that means in plain words."
- Waiting on the owner: open/proposed decisions (titles only; cards on request).
- Last 3 Change-log lines, so the owner sees how the plan has moved.

## B. Change the plan (add / drop / reorder / split / rename)
The owner owns the plan. Claude proposes, the owner approves, then Claude applies.
1. Say what you'd change in one plain sentence and what it affects ("moves publishing after captions; nothing already built is affected / 3 steps need renumbering").
2. Show the board lines before and after.
3. Wait for the owner's OK (a choice card if there are alternatives).
4. Apply in one change set: the board lines, the matching phase file (a NEW phase gets a new file `NN-name.md` from the example; a dropped or split phase updates or renames its file, keeping the number), a `Change log` line on the board (`- <date> (the owner approved): <what and why in the owner's words>`), bump "Plan version" and "Last changed", add or fix the file's row in docs/INDEX.md if a file was added, and update the handoff's next step and `Read first:` line if they moved.
Optional `Focus:` line (under the legend): for plans that run workstreams in parallel, one line saying which phases/steps run now and why. Only with the owner's OK; scripts show it next to the board order.
Rules: every step you add or edit gets a `Grade: light|standard|strong (short reason)` from the `delegate` skill (rubric and model table live there; show the grades with the proposed change and let the owner change them; old steps without a grade count as `standard`, do not grade them unasked); add new steps with the next free number, never renumber finished ones; a dropped step becomes `[-]` with a reason, never deleted; reordering phases keeps their numbers (the order on the board is the order of work).

## C. Tick (step finished)
Mark `[x]` only after the step's Test ran (when a helper did the step, the main chat re-runs the Test itself first: `delegate` skill). Put the proof in the step's details line or memory.md ("npm test 47/47", "screenshot .claude/audit/x.png"). Same change set as the work. When the last step of a phase is ticked, tick the phase and run the phase close.

## D. Phase gate (before the first step of any phase)
Do all four, visibly, in this order. It can be short when the phase is small, but never skipped.
1. **Preview in plain words:** what this phase builds, why it comes now, what the owner will be able to see or try when it's done, rough size (steps, "about a day of work" style estimate, honestly uncertain).
2. **Search report (visible):** run `prior-art` in feature mode and `find-skills` for this phase's needs. Show a short table: what was searched, what was found (what it does in one plain sentence), what we'd gain, verdict (adopt / idea only / ignore) with the reason. If nothing is worth using, say that and list what you checked: "nothing" without a list is not acceptable. Adoption is the owner's call (choice card), recorded in DECISIONS.md.
3. **Decisions this phase needs:** every open question as a choice card (global CLAUDE.md "How to ask the owner"). Anything that was decided earlier is not asked again, but is named ("as decided in D4").
4. **Go:** wait for the owner's go. Then set the phase to `[~]` and build step by step.

## E. Phase close
Show what now works (a command output or screenshot the owner can look at), list what is not done, tick the board, record lessons in memory.md, run `handoff`. Ask whether the owner wants to adjust the plan before the next gate.

## F. Add a board to a plan that has none (existing projects)
1. Read the plan's phase headings (`### Phase N — ...`) and their steps (numbered `N.M` or numbered lists). Build the board skeleton with every step `[ ]`.
2. Set statuses from evidence only: progress tables, handoff, memory.md, tests/gates, git log. If you cannot prove it, use `[~]` and note "verify". Never mark `[x]` from a feeling.
3. Show the owner the board and the list of uncertain items before saving it.
4. Save it as `docs/plan/BOARD.md` from `_template/docs/plan/BOARD.md` (with its "Rules for this plan" and "Change log"). In a v2 project that is not being moved yet: insert it right after the title block of PLAN.md, add the rules and change log from the template if missing, and keep the old detail sections untouched.

## G. Split a monolithic PLAN.md into board + phase files (the plan part of moving a project from layout v2 to v3)
Only inside the `project-sync` move, with the owner's OK for that project. Nothing is deleted: every part of the old PLAN.md must land somewhere and you show the owner the table of where. Commit the project first, so the old file stays in git history.
1. **Record the progress first:** run `node ~/.claude/hooks/project-workflow-status.mjs` (or `pickup-context`) and note the plan line (phases done/total, steps done/total, next step). This is what must be identical afterwards.
2. **Sort every section of the old PLAN.md** into its new home and show the owner the table before writing:
   | Old section | Goes to |
   |---|---|
   | Title block, `## Status board`, `## Rules for this plan`, `## Change log`, "Answers from the owner" | `docs/plan/BOARD.md` (board lines copied tick for tick; the rest as is) |
   | Each `### Phase N` block (purpose, steps with Use / Done when / Test, risks of that phase) | `docs/plan/phases/NN-name.md`, one file per phase (a sub-phase like 4b gets `04b-...`) |
   | Decisions table or section | already in DECISIONS.md? check each row; copy only missing ones there as `[decided <date>]` with the original wording and "moved from PLAN.md"; do not duplicate |
   | Skills & tools section | CLAUDE.md "Skills" if missing there; otherwise drop the duplicate lines from the plan copy but keep them in the archive file |
   | Parallel agent plan, Quality checklist | `docs/reference/TASKS.md` (append under "Moved from PLAN.md" if not already covered) |
   | Open questions / risks | the phase file they belong to; anything the owner must answer becomes a `[open]` entry in DECISIONS.md |
   | Summary / goal text | `docs/PRODUCT.md` if missing there, else keep as the header of BOARD.md |
   | Progress logs, dated notes, anything else | `docs/plan/phases/` file of the phase they are about, or `.claude/memory/` archive |
   Anything you cannot place goes into `docs/plan/phases/99-unsorted-from-old-plan.md` and is listed to the owner: never dropped.
3. **Write the files.** Keep the old PLAN.md until step 4 passes; then remove it with `git rm` in the move commit (its content is in git history and in the new files).
4. **Prove it:** the board's phases/steps/marks equal the old board (same counts and same next step as in step 1), every old `### Phase` heading has a phase file, and `docs/INDEX.md` lists the new files. Any difference: stop and fix before committing.
