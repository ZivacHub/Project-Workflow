# Docs index
Every file in docs/ is listed here with WHEN to read it. A script checks that none is missing. If you are a Claude instance that just landed in this project: read the "Always" rows, then only what the next step needs.

## Always (start of every session; the start-up check and pickup load these)
| File | What it is |
|---|---|
| ../CLAUDE.md | Rules, commands, stack, skills for this project (short). |
| PRODUCT.md | The goal in the owner's own words. The compass. |
| plan/BOARD.md | Status board: what is done, what is next, and the change log. |
| DECISIONS.md | What the owner decided; the open and proposed ones are at the top. |
| ../.claude/handoff.md | Where the last session stopped, numbered next steps, and the `Read first:` line. |

## For the current phase only
| File | Read when |
|---|---|
| plan/phases/NN-name.md | You work on that phase (one file per phase; read only the current one). |

## On demand (read only when the step touches it)
| File | Read when |
|---|---|
| reference/ARCHITECTURE.md | Changing the stack, data model, scaling or security design. |
| reference/DESIGN.md | Doing any UI work. |
| reference/TESTING.md | Writing or running tests, or deciding what "verified" means. |
| reference/TASKS.md | Splitting work between parallel agents; quality checklist. |
| reference/SECURITY_CHECKLIST.md | Before a deploy or in the security phase. |
| reference/AUDIT.md | Fixing audit findings (open items on top). Created by `project-audit`. |
| reference/PRIOR_ART.md | Choosing how to build a feature (similar repos). Created by `prior-art`. |
| ../.claude/memory.md | Digging into recent history (current month). Older months: ../.claude/memory/YYYY-MM.md. |

## Rules for this folder
- New doc? Put it in the right place (goal/decisions/plan at the top, background in reference/) and add a row here in the same change.
- Keep the "Always" files small. If one grows past about 8 KB, split it (phase detail -> plan/phases/, finished history -> archive).
- The root of the project holds only CLAUDE.md, README.md and the code.
