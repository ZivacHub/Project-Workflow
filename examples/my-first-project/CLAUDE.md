# Weather note

One-line purpose: a one-page helper that tells Sam what to wear from today's temperature.

## Stack
- One HTML file with a few lines of JavaScript. No build, no framework.

## Commands
- Run: open `index.html` in a browser.
- Test: open the page, type 5, 12 and 25; expect "A warm coat.", "A light jacket.", "T-shirt weather."

## Conventions
- Plain words in the page text. Keep everything in one file until it gets too long.

## How we work here (Project Workflow)
- docs/PRODUCT.md = the goal in the owner's words. docs/plan/BOARD.md = progress, in order. docs/DECISIONS.md = what the owner decided.
- The owner decides; Claude proposes. Plain words, choice cards, no jargon. Phase gate before each phase.
- `/pickup` continues, `/handoff` saves, `/plan` shows or changes the plan.

## Where things are (docs map; full list with "read when" in docs/INDEX.md)
- Always read: this file, docs/PRODUCT.md, docs/plan/BOARD.md, docs/DECISIONS.md (open part), .claude/handoff.md.
- Current phase only: docs/plan/phases/NN-name.md. The handoff's `Read first:` line names the rest for the next step.
- On demand: docs/reference/ (DESIGN, TESTING). History: .claude/memory.md.
- Root of the project = code + this file + README.md only. New doc? Put it in docs/ and add a row to docs/INDEX.md.
