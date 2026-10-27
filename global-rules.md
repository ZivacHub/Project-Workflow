## Project Workflow (installed by the Project Workflow installer; your own text outside this block is never touched)
The person you work with is "the owner" (their name is in ~/.claude/project-workflow-config.json and is printed by the session start-up check). The skills, the start-up check and these rules come from the Project Workflow; `node ~/.claude/hooks/project-workflow-status.mjs` shows its state.

### How to ask the owner
- **Plain words.** No project jargon, no acronyms, no unexplained terms. If a term is unavoidable, explain it in one clause the first time and give an example.
- **Choice card** for every decision. Use AskUserQuestion when available (each option's description = what it means + what the owner would notice); otherwise: the question in one plain sentence, why it matters, options A/B/C (what each means, what the owner would see, cost/risk), your recommendation (never presented as decided), and "say 'your call' and I'll use X and mark it as my proposal".
- Max 3-4 questions at once. Give a concrete example for anything abstract. Never ask "is X OK?" without saying what X is and what happens if the answer is no.
- **The owner decides, Claude proposes.** A decision exists only when the owner said it. Don't record as decided, or write "Decision:" in your own voice, for something they didn't choose. Vague answers ("depends", "whatever") become `[proposed]` in DECISIONS.md, restated in one sentence for a yes. Small defaults are listed as "defaults I'd use, say 'accept all' or name the ones to change".
- Log every decision in the project's DECISIONS.md with the owner's own words and the date.

### Keeping on track (PRODUCT, the plan board, DECISIONS)
- **PRODUCT.md** = the goal in the owner's words. Re-read at every session start. If your next action doesn't serve it, stop and ask.
- **The plan's Status board** = `[ ]` / `[~]` / `[x]` / `[-]` per phase and step; the only progress tracker. Next step = first unticked step of the first unfinished phase. Skipping ahead, reordering or dropping needs the owner's OK and a Change log line. Tick with proof, in the same change set as the work.
- **Phase gate** before every phase: plain-words preview, a VISIBLE skills + repos search result (never just "nothing found": say what was checked), the phase's open decisions as choice cards, the owner's go. **Phase close:** show what works, tick the phase, `handoff`.
- A session-start hook re-injects these rules, the goal, the plan progress, open decisions and the handoff, and computes warnings (stale handoff, plan/handoff mismatch). Take its warnings seriously.

### Project docs layout and reading tiers
Documents live in `docs/` (layout v3); older projects have them in the project root (layout v2). A project is v3 when `docs/INDEX.md` exists. The scripts read both; skills must too.
| What | v3 | v2 (old) |
|---|---|---|
| Goal | docs/PRODUCT.md | PRODUCT.md |
| Plan: status board + rules + change log | docs/plan/BOARD.md | PLAN.md (its Status board section) |
| Detail of one phase | docs/plan/phases/NN-name.md | inside PLAN.md |
| Decisions | docs/DECISIONS.md (open ones on top) | DECISIONS.md |
| Background: DESIGN, ARCHITECTURE, TESTING, TASKS, GATES, SECURITY_CHECKLIST, AUDIT, PRIOR_ART | docs/reference/<NAME>.md | <NAME>.md in the root |
| Index of every doc with "read when" | docs/INDEX.md | none |
| Handoff and history | .claude/handoff.md; .claude/memory.md (this month) + .claude/memory/YYYY-MM.md | .claude/handoff.md; .claude/memory.md |
A v3 project's root holds only the code, CLAUDE.md and README.md; its CLAUDE.md ends with a short docs map. **Reading tiers:** always = CLAUDE.md, PRODUCT, BOARD, open decisions, handoff; for the next step = the current phase file and the files on the handoff's `Read first:` line (1-4 files); on demand = reference/, older memory, other phases. A pickup should open at most about 30 KB whole. New doc? Put it in docs/ and add a row to docs/INDEX.md. **Big projects (a game with many mechanics):** one file per area in `docs/design/<area>.md`, each starting with a `Read when:` line and kept under about 12 KB; plan steps name the areas they need with `Needs:`; a chat opens only those (`docs-find.mjs "<topic>"` finds them, `/docs split` splits a doc that grew too big).

### Building blocks (each works on its own, in any project)
| Command / words | Skill | Does |
|---|---|---|
| /new-project, "plan this idea", "put this project on the right path" | new-project | Interview, research, choices, then a phased plan (stops for approval). Also for projects that already exist: reads the code first, skips what the files answer, plans only what remains |
| /info | info | Lists these commands and how to use each one, in any chat |
| /docs, "which docs are about X", "split this doc" | docs | Finds the 1-4 docs a topic needs (so a chat opens only those), splits a huge document into small area files in docs/design/ with a proof that no line is lost, and checks for big or unlabelled docs |
| /overview, "where are we", "show the state" | overview | Short plain summary plus a picture page: phases in a row, the step you are on highlighted, decisions waiting, last handoff, git. From the projects folder: every project. Read-only |
| /delegate, "grade the steps", "save tokens" | delegate | Grades every plan step (light / standard / strong) and runs light and standard steps in helpers on a cheaper model; the result is checked before ticking |
| /project-audit, "what's wrong" | project-audit | Audit with evidence and fix prompts; sets up folders that have code but no CLAUDE.md |
| /prior-art, "how do others do X" | prior-art | GitHub search for similar repos; plain-words report, licence-checked |
| /plan, "where are we in the plan" | plan | Show progress, add/drop/reorder phases, tick steps, run phase gate/close |
| /handoff, "wrap up" | handoff | Rewrite the handoff from scratch (script-checked) and log to memory |
| /pickup, "continue" | pickup | Reload goal/plan/decisions/handoff, verify, brief in plain words, continue in plan order |
| /project-sync, "sync projects" | project-sync | Bring existing projects up to the current template and prove it |
| "update workflow" | update-workflow | Show what changed in a newer version of this workflow and update it, on the owner's OK |
| `node ~/.claude/hooks/project-workflow-status.mjs` | script | Table of every project: git, template version, plan progress, decisions waiting, handoff age |

### Model delegation (grade every plan step)
**Grade every task BEFORE starting it** (`light` / `standard` / `strong`), on the spot, even when the plan already shows a grade (a plan's grade is a first guess; every step written or edited in a plan gets one: `plan`, `new-project`). Say it in one line ("Step 2.3: light, helper on haiku, low effort"). The `delegate` skill holds the rubric, the ONE model-and-effort table and the rules. Default mode "mixed": light and standard tasks that are clearly described run in a helper on the cheaper model and effort, strong tasks and anything that needs the owner stay in the main chat, and the result is checked against the step's Test before ticking. The owner approving a plan that shows the grades is the permission to start helpers; nothing else starts them. xhigh/max/ultracode are never chosen automatically. Never switch the chat's own model or effort; never claim token savings.

### Sessions, handoff, opening a project
- Each project keeps `.claude/handoff.md` (plan position, numbered next steps, what waits on the owner; REWRITTEN from scratch, checked by `handoff-lint`) and `.claude/memory.md` (everything done, append-only). The start-up hook loads the handoff into every new session; continue from its "Next steps" unless the owner says otherwise.
- `/pickup` finds the project, runs `pickup-context.mjs`, opens only what matters by the reading tiers, verifies against git, briefs the owner in plain words ending with "Files read: ...", and continues in plan order. Whether it also switches Remote Control on and renames the chat depends on the owner's options in project-workflow-config.json (`remoteControl`, `renameChat`).
- Run `handoff` after each milestone, when the owner says wrap up / new session, when the hook says context was compacted, and when the conversation is getting long. A handoff Claude starts itself never touches Remote Control and never asks about it: it goes off only when the owner types `/handoff` themselves (and only if that option is on).
- The start-up hook prints a "[Project Workflow check]" line saying what state the project is in. Follow it: not set up or no audit yet -> `project-audit`; TEMPLATE marker -> resume `new-project`; otherwise read the "always" files, the current phase and the handoff's `Read first:` files.

### Lifecycle of a project folder
1. Empty folder: the owner describes the idea -> `new-project`. 2. Folder with code: `project-audit` (and `new-project` in existing-project mode to put it on the right path). 3. Before real work: git repo, first commit, private GitHub repo. **Before ANY commit or push of a folder you haven't been working in:** list every file that would go out, READ small text/config files (a random-looking string in a note can be a password), scan for key-looking text, and exclude data, env files, browser profiles and personal documents; do this as its own step before `git add`. Never publish credentials without the owner's explicit OK; make new repos private. 4. Work: follow the plan board (phase gate before each phase); `handoff` at milestones.
- After a major feature, schema change or new dependency: append a dated entry to the project's .claude/memory.md. Keep each CLAUDE.md under ~150 lines.
