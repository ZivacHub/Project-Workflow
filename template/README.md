# Project template (layout v3, DRAFT: see CHANGELOG.md)

Don't copy this by hand. Tell Claude "create a new project" and the `new-project` skill runs a detailed interview, then writes docs/PRODUCT.md, docs/DECISIONS.md and docs/plan/BOARD.md with the owner, and only then scaffolds from this folder.
Existing folder with code? Open Claude in it: `project-audit` sets it up from this template and writes docs/reference/AUDIT.md.
Project behind on the template? `/project-sync` (see CHANGELOG.md for what each version adds).

Layout (the project's top folder keeps only the code, CLAUDE.md and README.md):
- `CLAUDE.md` rules + a short docs map · `.claude/handoff.md` (auto-loaded each session) · `.claude/memory.md` (history, this month; older months in `.claude/memory/YYYY-MM.md`) · `.claude/project-workflow.json` (template version)
- `docs/INDEX.md` every doc with "read when" · `docs/PRODUCT.md` goal in the owner's words · `docs/DECISIONS.md` every decision, the owner's words
- `docs/plan/BOARD.md` status board + change log · `docs/plan/phases/NN-name.md` detail of one phase
- `docs/reference/` ARCHITECTURE, DESIGN, TESTING, TASKS, SECURITY_CHECKLIST, AUDIT, PRIOR_ART (read only when a step touches them)

Reading tiers (why it is organised this way): always = CLAUDE.md, PRODUCT, BOARD, open decisions, handoff; for the next step = the current phase file + the handoff's `Read first:` files; on demand = everything else. A pickup should read about 30 KB at most, however big the project gets.
Edit this folder to change what every NEW project starts with; bump `VERSION` and add a CHANGELOG entry so `project-sync` can bring old projects along.
Overview of all projects: `project-workflow-status` (terminal).
