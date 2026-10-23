---
name: info
description: List the Project Workflow commands and how to use each one, in plain words, in any chat. Use when the owner types /info or asks "what commands do I have", "what can you do here", "how do I use this", "list the commands".
---

# Info: the commands and how to use them

Only LIST and explain. Never start one of the commands yourself, change a file or ask a question. Keep the whole answer under about 35 lines, in plain words, spoken to the owner as "you".

## 1. Print this table (adjust nothing except the last line of step 3)
| Type | Use it when | What happens |
|---|---|---|
| `/new-project` | You have an idea, an empty folder, or a project that already exists and you want it on the right path | A long interview in plain-words choice cards, a search for similar projects, one-by-one choices, then a phased plan. For an existing project it reads the code first, skips what the files already answer and plans only what remains. Nothing is built or changed until you approve the plan. |
| `/pickup` (or say "continue") | Start of a new chat in a project | Loads the goal, plan board, open decisions and last handoff, checks them against git, tells you where you are and what is next, then continues in plan order. |
| `/handoff` (or say "wrap up") | After a milestone, or before you end a chat | Rewrites the handoff note from scratch so the next chat starts clean, and logs what was done. |
| `/plan` | You want to see progress or change the plan | Shows the board, adds / drops / moves phases (with your OK), runs the check before and after each phase. |
| `/project-audit` | An existing project with code: "what is wrong?" | Reads and tests the project, writes a findings list with a ready fix prompt for each, and a fix plan. Never changes your code by itself. |
| `/project-sync` | The template changed | Brings older projects up to the current template, one at a time, asking first. |
| `/prior-art` | "How do others do this?" | Searches GitHub for similar projects, reports ideas worth borrowing and what the licences allow. |
| `/overview` (or say "where are we") | Any time in a project, or in the projects folder for all of them | A short plain summary plus a picture page: the phases in a row, the step you are on highlighted, decisions waiting, last handoff, git state. Changes nothing. |
| `/delegate` (or say "grade the steps", "save tokens") | A plan exists or is being made | Before every task Claude gives it a difficulty grade (light / standard / strong) and says it out loud. Light and standard ones run in a helper on a cheaper model and effort, hard ones stay with you, and every result is checked before the step is ticked. It happens by itself; you rarely type this. |
| say "update workflow" | A message says a newer version exists | Shows what changed and updates only with your OK (only where the installer was used). |
| `/info` | Any time | This list. |
Also: `node ~/.claude/hooks/project-workflow-status.mjs` in a terminal prints one table of every project: git, plan progress, decisions waiting, handoff age.

## 2. A normal day, in one line
New chat: `/pickup` -> work in plan order (you answer the choice cards) -> `/handoff` before you stop.

## 3. Other skills on this computer, and what to type now
- List the other skills installed here that are not in the table: run `ls ~/.claude/skills`, skip the names in the table, and for each remaining one read only its one-line `description:` (for example `grep -m1 "^description:" ~/.claude/skills/<name>/SKILL.md`). Show at most 15, one short line each, name first. If there are none, say nothing about this.
- Last line: one suggestion for what to type NEXT, based on the chat's start-up check line (the line that begins with "[Project Workflow check]" or "[Workflow workshop]", if present): project with a handoff -> `/pickup`; empty folder or "TEMPLATE" marker -> `/new-project`; code but no CLAUDE.md -> `/project-audit` (or `/new-project` to plan it); no check line -> "open Claude inside a project folder, then `/pickup`".
