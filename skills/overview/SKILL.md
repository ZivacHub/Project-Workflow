---
name: overview
description: Show where a project is, in a short plain summary in the chat plus a picture page (phases as a row, the step you are on highlighted, decisions waiting, last handoff, git). From the projects folder it shows every project. Read-only. Use when the owner types /overview or asks "where are we", "show me the state of the project", "what step are we on", "visualise the project", "give me an overview".
---

# Overview: where is the project right now?

Read-only: it changes nothing in the project. (`/plan` is for changing the plan; `project-workflow-status` in a terminal is the one-table view of all projects.)

## Steps
1. **Find the folder:** the chat's project folder (or the one the owner names). From the projects folder itself it shows all projects.
2. **Run** `node ~/.claude/hooks/overview.mjs "<folder>"`. It prints a short text summary (overall progress, the phase you are in, the step in progress or next, decisions waiting, handoff age, git state) and writes a picture page into the temp folder (never into the project) and prints its path. Add `--no-html` for text only.
3. **Tell the owner in plain words, 5-8 lines:** "You are in phase N of M, '<title>'. Step X is in progress / next: <what it means in plain words>. <N decisions wait on you: titles>. The last handoff is <age>. <Anything that looks off: uncommitted work, a stale handoff, a plan warning>." If the plan has a `Focus:` line, say that work runs in parallel and the first unfinished phase may not be where the work is. Quote nothing long.
4. **Show the picture page:** if the built-in browser (tools named `mcp__Claude_Browser__*`) is available, open the printed `file:///...` address in it (navigate / preview). Otherwise give the owner the file path to open in a browser. Say once that the page is a snapshot and does not update by itself: `/overview` makes a fresh one.
5. If there is no plan board yet, say so and offer `/new-project` (plan it) or `/plan`.

## Rules
- Only report what the script printed; do not guess progress from memory.
- A step's grade (light / standard / strong) appears as a small label when the phase file has one.
