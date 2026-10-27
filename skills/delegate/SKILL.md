---
name: delegate
description: Grade every task by difficulty (light / standard / strong) BEFORE starting it, and run it on the right model and effort, so cheap work does not burn the strongest model's tokens. Holds the grading rubric, the one model-and-effort table, the delegation rules, the helper brief and the check before ticking. Called by `plan` and `new-project` (when steps are written) and by `pickup` and every chat before a task starts. Use when the owner says "grade the steps", "which model for this", "delegate", "use cheaper models", "save tokens", or types /delegate.
---

# Delegate: grade the work first, give each task to the right model

Why: a strong model on a mechanical task wastes tokens; a weak model on a hard task wastes time and causes rework. The owner decided (2026-10-23): **grade a task on the spot, before starting it** (a plan's grade is only a first guess), and run it in "mixed" mode. When the project's own rules say otherwise, those win.

## Model and effort table (the ONLY place that names models and effort: edit here when they change)
| Grade | Helper model (the Agent tool's `model`) | Helper effort (the Agent tool's `effort`) | Typical work |
|---|---|---|---|
| `light` | `haiku` | `low` | mechanical and fully specified, easy to check with a command |
| `standard` | `sonnet` | `medium` | normal work with a clear spec and existing code or a pattern to follow |
| `strong` | `opus` | `high` | unclear, high-stakes or judgement work |
This skill is the explicit instruction to pass that `effort` when starting a helper. `xhigh`, `max` and "ultracode" are never chosen automatically: only when the owner asks for them (the owner switches the chat's own effort with `/effort`). If a model rejects an effort value, start the helper without `effort` and tell the owner in one line.

## Grading rubric (one grade per task, with a short reason)
- **light:** renames, formatting, moving or copying files, writing docs from facts that are already given, running tests and summarising, simple lookups, boilerplate that copies an existing pattern, version bumps.
- **standard:** a feature, screen or endpoint that follows existing patterns, writing tests, fixing a bug whose cause is known, a refactor inside one area, scripts with a clear spec.
- **strong:** architecture and data-model choices, security work, debugging with an unknown cause, design and UX judgement, anything touching money, accounts, auth or data deletion, planning itself, reviewing other people's work, any task where the owner must decide something.
- When torn between two grades, take the higher one.
- In a plan, write it on the step in the phase file: `Grade: light (copies the existing card pattern)`; one short phrase for the reason. In an older project (layout v2) the step's details live in `PLAN.md` under `## Phases (details)`: write it there, on that step's line.

## 1. When a plan is made or edited (`plan`, `new-project` Phase E)
Every new or edited step gets a `Grade:` as a first guess. Show the grades together with the steps at the plan gate ("3 light, 8 standard, 2 strong, and why the strong ones") and let the owner change any. Old steps without a grade are not graded unasked.

## 2. BEFORE any task starts (a plan step or any request in the chat): grade it now
1. **Grade it on the spot,** even when the plan already shows a grade: look at the real task and the code as it is today. Missing grade = grade it now. If you disagree with the plan's grade, use the new one and say so.
2. **Say it in one plain line before you start:** "Step 2.3: light, so a helper on haiku (low effort)" or "This is strong, so I do it here with you". For a trivial request (a question, a one-line edit) the line is just "light, doing it here".
3. **Mixed mode (the owner's choice):**
   - `light` and `standard` tasks that are clearly described and self-contained run in a helper started with the model and effort from the table.
   - `strong` tasks stay in the main chat.
   - **Never delegate:** a task that needs the owner's answer or taste; anything touching secrets or credentials, deleting data, pushing or publishing; a task so small that starting a helper costs more than doing it (about three tool calls or fewer, which includes most one-off requests); the middle of an interview or a choice card.
   - The owner approving a plan that shows grades is the permission to start helpers for such steps; for an ad-hoc request outside a plan, delegate only when the owner has said to or the task is clearly big enough and self-contained, and then say so first.
4. **Helper brief:** the helper remembers nothing of this chat, so write it complete: the goal in one sentence; the exact files to read first (the step's `Needs:` docs and nothing else of the design docs); what to change and what NOT to touch; the step's "Done when" and "Test"; forbidden actions (no commits, pushes, installs, deleting, no questions to the owner); and what to report (files changed, test output, anything it could not do). Independent steps may run in parallel helpers only if their files do not overlap (`docs/reference/TASKS.md`).
5. **Check before ticking:** the main chat re-runs the step's Test or reads the diff itself, and only then ticks the board with the proof (plan skill, section C). If the check fails, retry once ONE GRADE UP (never the same model again) and note it in `.claude/memory.md`; if it fails again, do it in the main chat.
6. **Report plainly:** one line per delegated task: ID, grade, model and effort, result of the check. No estimates of saved tokens or money: they cannot be measured here, so never claim them.

## Limits to respect
- The model and effort of the main chat are the owner's choice (the app's pickers, `/effort`). Never switch them yourself. If the chat runs on a strong model while the next tasks are light, say so once: that is where delegating saves the most.
- If helpers cannot be started in this app, fall back to "recommend only": name the grade, model and effort, and let the owner decide.
- Delegation does not replace the owner's decisions, the phase gate or the board rules: helpers do tasks, they never decide, plan or tick.
- Names and levels change over time: when a table value stops working, fix the table above (one place) and tell the owner.

## Plain-words summary for the owner (use when asked what this does)
"Before I start any task I give it a difficulty label and say it out loud. Simple tasks go to a cheaper, quicker helper, hard ones stay with me. I check every helper's result against the step's test before I tick it, and I tell you what ran where."
