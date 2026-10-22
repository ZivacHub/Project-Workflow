# <Project> — Plan board
Status: DRAFT | APPROVED <date> | IN PROGRESS        Plan version: 1        Last changed: <date>
Goal and non-negotiables: docs/PRODUCT.md. Every decision: docs/DECISIONS.md. Detail of each phase: docs/plan/phases/ (one file per phase).
This file stays SMALL on purpose: the tick-list, the rules and the change log. It is read at the start of every session.

## Status board
Legend: `[ ]` not started · `[~]` in progress · `[x]` done (proof in the step) · `[-]` dropped (reason in the Change log).
This board is the ONLY place that tracks progress. Tick a step in the same change set that finishes it. A script reads it
(phases = top-level lines, steps = indented lines), so keep exactly this shape. Each phase title starts with `Phase <number>`
and has a detail file `docs/plan/phases/<NN>-<name>.md` (NN = the phase number, two digits: Phase 4 -> `04-screens.md`).

- [ ] Phase 0 — <title>
  - [ ] 0.1 <step title>
  - [ ] 0.2 <step title>
- [ ] Phase 1 — <title>
  - [ ] 1.1 <step title>

## Rules for this plan
- **Order:** the next step is the first unticked step of the first unfinished phase. Jumping ahead, reordering or dropping needs the owner's OK and a Change log line. Add new steps with the next free number; never renumber old ones.
- **Parallel plans:** if the plan itself runs workstreams in parallel, put ONE line `Focus: <which phases/steps run now and why>` under the legend (only with the owner's OK). The scripts show it next to the board order and the handoff may follow it. The work split (who owns which paths) lives in docs/reference/TASKS.md.
- **Phase gate (before starting each phase):** (1) say in plain words what this phase builds and what the owner will be able to see/try at the end; (2) show the skills/repos search result for this phase, even when it is "nothing worth adopting, here is what I checked"; (3) put every open decision this phase needs to the owner as a choice card; (4) wait for the owner's go. Then build.
- **Phase close:** show the owner what now works (screenshot / command output), tick the phase, run the `handoff` skill.
- **Done means proven:** each step has a "Done when" and a "Test" (written in the phase file); tick only after the test ran.
- **Where things go:** step detail -> the phase file. Decisions -> docs/DECISIONS.md (open ones as `[open]`). Skills list -> CLAUDE.md. Quality checklist and work split -> docs/reference/TASKS.md. Risks -> the phase file they belong to, or DECISIONS.md once the owner has to answer.

## Change log
- <date> (the owner / Claude proposed, the owner approved): <what changed in the plan and why>
