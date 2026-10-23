---
name: project-sync
description: Bring existing workflow projects up to the current workflow template, and prove they took it. Compares each project's .claude/project-workflow.json version with _template/VERSION, lists what the CHANGELOG says is new, applies the safe parts, proposes the rest, and verifies with the status script and a simulated session start. Use when the owner says "sync", "update the projects", "do the projects have the new rules", "apply the template changes", after editing _template or a shared skill, or when the session-start hook reports template drift.
---

# Project sync

What updates by itself vs what needs this skill:
- **Global, automatic for every project and every new chat:** ~/.claude/CLAUDE.md, the global skills, the session-start hook and its working-rules digest. Editing these needs no per-project action. (A chat that is already open keeps what it loaded; new chats get the change.)
- **Per project, needs a sync:** the files that live inside each project (the plan board, DECISIONS, PRODUCT, the docs layout, handoff format, project-workflow.json). `_template/VERSION` + `CHANGELOG.md` say what's current; each project's `.claude/project-workflow.json` says what it has. The docs layout (v3 = everything in `docs/`, v2 = loose in the root) is decided by whether `docs/INDEX.md` exists, not only by the version number: see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md.

## Steps
1. **Overview:** run `node ~/.claude/hooks/project-workflow-status.mjs` (same as the `project-workflow-status` command). It shows the shared-workflow checks and one row per project (git/GitHub, setup, template version, plan progress, decisions waiting, handoff age). Show the owner the table in plain words and what needs attention. From the projects root, do this and ask which projects to sync (default: all that are behind).
2. **For each project behind:** read `_template/CHANGELOG.md` entries newer than the project's version. Write a short, plain-words plan for THAT project:
   - **Safe, add automatically** (new files that don't exist yet): DECISIONS.md, `.claude/project-workflow.json`, missing template docs. Never overwrite an existing file.
   - **Needs the owner's OK** (changes something that exists): adding the Status board to PLAN.md (use the `plan` skill, section F: statuses only from evidence, uncertain ones `[~]`), rewriting the handoff in the new format (`handoff` skill), turning an existing decisions table/section into DECISIONS.md entries (copy, keep the original text), PRODUCT.md north star (if missing, write a DRAFT from what the owner has said and mark it "DRAFT: confirm"; if present, only add what's missing).
   Show the plan, wait for the owner's OK per project, then apply.
3. **Never** touch project code, never rewrite the owner's words, never mark things done without evidence, never change CLAUDE.md content beyond adding the "How we work here" block and pointers.
4. **Record:** set `.claude/project-workflow.json` to the new version + date, add a dated line to the project's `.claude/memory.md`, and commit the sync as its own commit if the project is a git repo and committing is allowed there.
5. **Prove it took (always):**
   - `node ~/.claude/hooks/project-workflow-status.mjs`: the project's template column shows `ok` and its plan row shows phases done/total.
   - Simulate a session start for the project: `echo {"cwd":"<project folder>","source":"startup"} | node ~/.claude/hooks/project-check.mjs` and check the output contains the rules digest, the north star, the plan progress and the handoff, with no handoff warnings left.
   - `node ~/.claude/hooks/handoff-lint.mjs <project folder>` prints "handoff OK".
   Report the three results to the owner.

## Move a project from docs layout v2 to v3 (template v3)
Needs the owner's OK for THAT project, every time, one project at a time. Project code is never touched, except references to moved doc paths (step 4), which also need the owner's OK.
0. **Preconditions.** (a) The project is a git repo. If the working tree is dirty, another chat is probably mid-work there: ask the owner to let that chat commit or `/handoff` first; never move files under uncommitted work. (b) Every open chat of this project has run `/handoff` (otherwise it keeps using old paths); ask the owner. (c) If `docs/INDEX.md` already exists the project is v3: nothing to move, only fix what `project-workflow-status` flags.
1. **Baseline.** Run `node ~/.claude/hooks/pickup-context.mjs "<project folder>"` and note: the plan line (phases/steps done, next step), the decisions waiting, and the READ BUDGET. These are the numbers to compare afterwards.
2. **Show the move table, wait for OK** (old path -> new path), every doc file in the root, `docs/` and `.claude/`:
   - `PRODUCT.md` -> `docs/PRODUCT.md`; `DECISIONS.md` -> `docs/DECISIONS.md` (open and proposed entries on top under "Waiting on the owner", decided ones under "Decided", wording untouched).
   - `PLAN.md` -> split into `docs/plan/BOARD.md` + `docs/plan/phases/NN-name.md` (`plan` skill, section G).
   - `DESIGN`, `ARCHITECTURE`, `TESTING`, `TASKS`, `GATES`, `SECURITY_CHECKLIST`, `AUDIT`, `PRIOR_ART` and the project's own extra notes (QUALITY, STORAGE_PLAN, research notes, an old PROJECT_PLAN...) -> `docs/reference/`. `AUDIT.md`: open findings on top, fixed ones to `docs/reference/archive/AUDIT-fixed.md` (nothing deleted).
   - Stay where they are: README, LICENSE, THIRD_PARTY, CHANGELOG, anything inside code folders (e.g. `ui/README.md`, `tests/…/PARITY.md`, `engines/…`), and files already in the project's own `docs/` (samples, benchmark notes): they only get a row in `docs/INDEX.md`.
   - `.claude/memory.md`: `node ~/.claude/hooks/memory-rotate.mjs <folder>` (dry run, show the result), then `--apply` after OK.
3. **Move with `git mv`** so history follows (never copy and delete), then do the plan split, the decisions order and the AUDIT restructure. Keep the original wording everywhere.
4. **Fix references.** Search the whole project (code, scripts, tests, configs, CLAUDE.md, handoff, every doc) for the old paths (`PLAN.md`, `GATES.md`, `TASKS.md`, `DESIGN.md`, `AUDIT.md`, ... ). Show the list. Doc references: update. References in code or scripts (e.g. a gate script that reads GATES.md or TASKS.md, a test that reads DESIGN.md): show each one, fix only with the owner's OK, then run the project's own test or gate command (from its CLAUDE.md) to prove nothing broke.
5. **Make it discoverable.** Create `docs/INDEX.md` from the template with a row (one line + "read when") for EVERY file now in `docs/`; replace CLAUDE.md's old "Project docs" paragraph with the "Where things are" docs map from `_template/CLAUDE.md` (the rest of CLAUDE.md stays); rewrite the handoff in the new format with `Read first:` (`handoff` skill); set `.claude/project-workflow.json` template to 3.
6. **Prove it (all must pass, otherwise revert the move):**
   - `node ~/.claude/hooks/project-workflow-status.mjs`: Docs column `v3`, no docs warnings, plan line identical to the baseline.
   - `pickup-context` for the project: layout v3, the current phase file, READ BUDGET <= 30 KB. Report before -> after.
   - Simulated session start (step 5 above) and `handoff-lint` say OK.
   - The project's own tests/gates pass when step 4 changed any reference.
   - `git status` clean after the commit, and no loose doc files left in the root.
7. **Commit** as its own commit (message: "Docs layout v3: move documents into docs/", with the before/after numbers), add a dated line to the project's memory, push only if the project allows it. Suggested order of projects: smallest and quietest first, the one with live uncommitted work last.

## After editing the template or a shared skill yourself
Bump `_template/VERSION`, add a CHANGELOG entry (what, which files, safe or needs OK), and run this skill so every project is brought along. If you only changed a global skill or CLAUDE.md, no version bump is needed; say so.
**Template v3 is written but NOT released:** `_template/VERSION` stays 2 until the owner says projects may start moving. Bumping it to 3 makes every project's start-up check and `project-workflow-status` offer this move in every chat, so do it only on the owner's go, then follow the section above per project. New projects started from the template are already layout v3 (their `.claude/project-workflow.json` says template 3).

## What this cannot do
It can't change a chat that is already open, and it can't make a project follow a rule it has no file for. If a project has no CLAUDE.md at all, the session-start hook sends Claude to `project-audit` (onboarding) instead.
