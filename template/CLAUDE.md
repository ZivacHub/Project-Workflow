<!-- TEMPLATE: delete this line once find-skills has been run for this project -->
# <Project name>

One-line purpose: <what it is and who it's for>

## Stack
- Frontend: 
- Backend / DB: 
- Hosting: 

## Commands
- Dev: 
- Build: 
- Test: 

## Conventions
- 

## Design stack (filled by find-skills, approved by the owner)
- Structure/typography: 
- Motion: 
- Curation: 
- Reference sites / tokens: (skillui output goes in .claude/skills/)

## Skills (chosen with find-skills; Claude must use these, not skip them)
| Skill | Used for |
|---|---|
| context7 | current docs / versions |
| playwright-cli | visual + e2e checks |
| unlazy | long multi-part work |

## Plugins (enabled for this project)
- Supabase (default DB when the project stores data): `claude plugin install supabase@supabase-agent-skills --scope project`. Local-only tools: SQLite instead.

## Skill routing
- UI work: see Design stack above
- DB: 
- Docs/versions: context7

## Current state
- (Claude updates this after major work; details go in .claude/memory.md)

## How we work here (Project Workflow v3, details in ~/.claude/CLAUDE.md)
- docs/PRODUCT.md = the goal in the owner's words (compass). docs/plan/BOARD.md = progress, in order. docs/DECISIONS.md = what the owner decided.
- The owner decides; Claude proposes. Plain words, choice cards, no jargon. Phase gate before each phase.
- `/pickup` continues, `/handoff` saves, `/plan` shows/changes the plan, `/project-sync` brings this project up to the current template.

## Where things are (docs map; full list with "read when" in docs/INDEX.md)
- Always read: this file, docs/PRODUCT.md, docs/plan/BOARD.md, docs/DECISIONS.md (open part), .claude/handoff.md.
- Current phase only: docs/plan/phases/NN-name.md. The handoff's `Read first:` line and the step's `Needs:` name the rest for the next step.
- Big projects: one file per area in docs/design/ (each starts with a `Read when:` line). Open only the area you work on; find it with `node ~/.claude/hooks/docs-find.mjs "<topic>"`.
- On demand: docs/reference/ (ARCHITECTURE, DESIGN, TESTING, TASKS, SECURITY_CHECKLIST, AUDIT, PRIOR_ART). History: .claude/memory.md (this month), .claude/memory/YYYY-MM.md (older).
- Root of the project = code + this file + README.md only. New doc? Put it in docs/ and add a row to docs/INDEX.md.

## Tools (Claude starts these itself; paid ones are optional extras)
- Security: Claude's own review + local probing (free, default). Strix only if configured (paid API).
- Long sessions: Headroom. Model fallback: OmniRoute.
- Audit: docs/reference/AUDIT.md (project-audit skill) lists open findings with fix prompts.
See ~/.claude/TOOLS.md.
