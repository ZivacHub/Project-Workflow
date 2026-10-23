---
name: delegate
description: Grade every plan step by difficulty (light / standard / strong) and run the steps on the right model, so cheap steps do not burn the strongest model's tokens. Holds the grading rubric, the one model table, the delegation rules, the helper brief and the check before ticking. Called by `plan`, `new-project` (when steps are written) and `pickup` (when a step starts). Use when the owner says "grade the steps", "which model for this", "delegate", "use cheaper models", "save tokens", or types /delegate.
---

# Delegate: grade the work, give each step to the right model

Why: a strong model on a mechanical step wastes tokens; a weak model on a hard step wastes time and causes rework. The plan records a grade per step, and starting a step follows it. The owner decided the mode ("mixed", 2026-10-23, see the rules below); when the project's rules say otherwise, those win.

## Model table (the ONLY place that names models: edit here when models change)
| Grade | Model for a helper (the Agent tool's `model` value) | Typical work |
|---|---|---|
| `light` | `haiku` | mechanical and fully specified, easy to check with a command |
| `standard` | `sonnet` | normal work with a clear spec and existing code or a pattern to follow |
| `strong` | `opus` | unclear, high-stakes or judgement work |

## Grading rubric (one grade per step, with a short reason)
- **light:** renames, formatting, moving or copying files, writing docs from facts that are already given, running tests and summarising, simple lookups, boilerplate that copies an existing pattern, version bumps.
- **standard:** a feature, screen or endpoint that follows existing patterns, writing tests, fixing a bug whose cause is known, a refactor inside one area, scripts with a clear spec.
- **strong:** architecture and data-model choices, security work, debugging with an unknown cause, design and UX judgement, anything touching money, accounts, auth or data deletion, planning itself, reviewing other people's work, any step where the owner must decide something.
- When torn between two grades, take the higher one. A step with no grade counts as `standard`; grade it when it starts.
- Write it on the step in the phase file: `Grade: light (copies the existing card pattern)`. The reason is one short phrase.

## When a plan is made or edited (`plan`, `new-project` Phase E)
Every new or edited step gets a `Grade:`. Show the grades together with the steps at the plan gate (a short list is enough: "3 light, 8 standard, 2 strong, here is why the strong ones") and let the owner change any. Grades are part of what the owner approves.

## When a step starts (`pickup`, or any time work begins on a step)
1. Read the step's grade (none = `standard`). Say in one plain line what you will do: "Step 2.3 is light: I'll run it in a helper on the light model" or "Step 2.4 is strong: I'll do it here with you".
2. **Mixed mode (the default; the owner chose it):**
   - `light` and `standard` steps that are clearly described and self-contained run in a helper started with the model from the table.
   - `strong` steps stay in the main chat.
   - **Never delegate:** a step that needs the owner's answer or taste; anything touching secrets or credentials, deleting data, pushing or publishing; a step so small that starting a helper costs more than doing it (about three tool calls or fewer); the middle of an interview or a choice card.
   - The owner approving a plan that shows the grades is the permission to start helpers for these steps; nothing else starts helpers.
3. **Helper brief:** the helper remembers nothing of this chat, so write it complete and self-contained: the goal in one sentence; the exact files to read first; what to change and what NOT to touch; the step's "Done when" and "Test"; forbidden actions (no commits, no pushes, no installs, no deleting, no questions to the owner); and what to report (files changed, test output, anything it could not do). Independent steps may run in parallel helpers only if their files do not overlap (see `docs/reference/TASKS.md`).
4. **Check before ticking:** the main chat re-runs the step's Test or reads the diff itself. Tick the board only after that, with the proof (plan skill, section C). If the check fails, retry once ONE GRADE UP (never the same model again) and note it in `.claude/memory.md`; if it fails again, do it in the main chat.
5. **Report plainly:** one line per delegated step: step ID, grade, model, result of the check. No estimates of saved tokens or money: you cannot measure them here, so do not claim them.

## Limits to respect
- The model of the main chat is the owner's choice (the app's model picker). Never switch it yourself. If the chat runs on a strong model while the next steps are light, say so once: that is where delegating saves the most.
- If helpers cannot be started in this app, fall back to "recommend only": name the grade and the suitable model, and let the owner decide.
- Delegation does not replace the owner's decisions, the phase gate or the board rules: helpers do steps, they never decide, plan or tick.
- Model names change: when a table value stops working, fix the table above (one place) and tell the owner.

## Plain-words summary for the owner (use when asked what this does)
"Every step in the plan has a difficulty label. Simple steps go to a cheaper helper model, hard ones stay with me. I check every helper's result against the step's test before I tick it, and I tell you what ran where."
