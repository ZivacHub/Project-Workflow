# Project Workflow: changes per version

## v0.5.0
- NEW `/docs` for big projects (a game with many mechanics): each big part gets its own small file in `docs/design/<area>.md` that starts with a `Read when:` line, a plan step names the areas it needs with `Needs:`, and a chat opens only those. `/docs <topic>` (script `docs-find.mjs`) names the 1-4 files a topic needs; `/docs split <file>` (script `split-doc.mjs`) splits a huge document into area files and proves that no line is lost (the original is kept); `/docs check` lists docs that are too big or unlabelled.
- `/pickup`: the docs index is now shown as a compact list that is no longer cut off in the middle, the step's `Needs:` files are listed and counted in the read budget, and the long document inventory is replaced by one line in projects that have an index. `/new-project` asks for the big areas of a big project and creates the area files. Project template: `docs/design/_area-example.md`.
- Update with `node install.mjs update`; nothing you edited is replaced.

## v0.4.0
- NEW `Install.bat` (Windows): double-click it. It checks that Node.js is there (and, if you agree, installs it with Windows' own winget, or opens the download page), shows a small menu (Install, Preview, Update, Check, Uninstall) and runs the installer for you; messages are in plain words. With arguments it skips the menu (`Install.bat update`). Mac and Linux keep using `node install.mjs`.
- Update with `node install.mjs update`; nothing you edited is replaced.

## v0.3.2
- `/handoff` and Remote Control: it is switched off ONLY when you type `/handoff` yourself. A handoff Claude starts on its own (milestone, phase end, after the chat was compacted) or words like "wrap up" never touch it and never ask about it. (Only matters if you turned the `remoteControl` option on.)
- Update with `node install.mjs update`; nothing you edited is replaced.

## v0.3.1
- `/pickup` briefing: the "read first" list and the read-budget line now come BEFORE the long document inventory, so they are no longer cut off when the output is long.
- The project template is now version 3 (the docs layout with everything in `docs/`); `project-sync` describes the step-by-step move for projects that still keep documents in their root.
- Update with `node install.mjs update`; nothing you edited is replaced.

## v0.3.0
- NEW `/overview`: where is the project right now? A short plain summary plus a picture page (phases in a row, the step you are on highlighted with its grade, decisions waiting, last handoff, git state). From the projects folder it shows every project. Read-only; the page goes to the temp folder, never into your project. New script `overview.mjs`, new skill `overview`.
- `/delegate` changed: Claude now grades EVERY task right before starting it (the plan's grade is only a first guess) and says the grade, model and effort in one line. The model table also has an effort column (light = low, standard = medium, strong = high); xhigh, max and "ultracode" are never chosen automatically. A one-line reminder was added to the start-up rules every chat gets.
- Update with `node install.mjs update`; nothing you edited is replaced.

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
