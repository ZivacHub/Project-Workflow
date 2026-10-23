# Project Workflow: changes per version

## v0.2.0
- NEW `delegate` skill: every plan step gets a difficulty grade (`light` / `standard` / `strong`) when a plan is made or edited. When a step starts, light and standard steps that are clearly described run in a helper on a cheaper model, hard steps stay in your chat, and the result is checked against the step's test before the step is ticked. The owner approving a plan that shows the grades is the permission to start helpers. One model table (in the skill) is the only place that names models.
- `plan`, `new-project` and `pickup` follow it; the project template's phase file has a `Grade:` field and the board has a rule for it. Existing plans are not changed: a step without a grade counts as `standard`.
- `/info`, the README and the rules block list it. Update with `node install.mjs update`; nothing you edited is replaced.

## v0.1.1
- NEW `/info`: lists the workflow's commands and how to use each one, in any chat (new skill `info`).
- `/new-project` now also works for projects that already exist: it reads the code first, skips what the files already answer, and plans only what remains (existing files are never overwritten, no code is touched).
- Rules block in CLAUDE.md and README mention both. Update with `node install.mjs update`; nothing you edited is replaced.

## v0.1.0
First public release: skills (pickup, handoff, plan, new-project, project-audit, project-sync, prior-art, update-workflow), session start-up check and scripts, project template (docs layout v3), a marked rules block in CLAUDE.md, a once-a-day "new version" line, `check` and `uninstall`.
