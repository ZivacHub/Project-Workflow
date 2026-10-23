# Project Workflow: changes per version

## v0.1.1
- NEW `/info`: lists the workflow's commands and how to use each one, in any chat (new skill `info`).
- `/new-project` now also works for projects that already exist: it reads the code first, skips what the files already answer, and plans only what remains (existing files are never overwritten, no code is touched).
- Rules block in CLAUDE.md and README mention both. Update with `node install.mjs update`; nothing you edited is replaced.

## v0.1.0
First public release: skills (pickup, handoff, plan, new-project, project-audit, project-sync, prior-art, update-workflow), session start-up check and scripts, project template (docs layout v3), a marked rules block in CLAUDE.md, a once-a-day "new version" line, `check` and `uninstall`.
