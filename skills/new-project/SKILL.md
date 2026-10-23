---
name: new-project
description: Guided, detailed planning of a new workflow project (or a folder that still has the TEMPLATE marker), and also the way to put a project that ALREADY exists on the right path (goal, decisions, a plan of what remains). A multi-round interview where nothing is decided without the owner, a visible skills + similar-repos search, one-by-one stack choices, then a phased plan (a [ ]/[x] status board plus one small file per phase) and a DECISIONS log, all in the project's docs/ folder. Stops at approval gates; no scaffolding, installs or code until the owner approves the plan. Use when the owner says "create/make/start a new project", "new app", "plan this idea", "put this project on the right path", "plan what is next for this project", or opens an empty folder and describes an idea; also when /new-project is typed inside a project that already has code or notes.
---

# New project: interview, research, decisions, plan (in that order)

Template: `<projects folder>/_template` (docs layout v3: everything except CLAUDE.md and README.md goes in `docs/`; see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md). Projects live in `<projects folder>/<Name>`; the projects folder is `root=` in the output of `node ~/.claude/hooks/pickup-context.mjs --options`.
Style for every question: choice cards, plain words, no jargon (global CLAUDE.md "How to ask the owner"). Tools: ~/.claude/TOOLS.md.

## Building blocks
If the owner wants only a piece, run only that piece and stop: "find similar repos" -> `prior-art`; "which skills" -> `find-skills`; "just define the idea" -> Rounds 1-5 + PRODUCT.md; "just the plan" -> Phase E on what's already decided; "what's wrong" -> `project-audit`; "save" -> `handoff`; "continue" -> `pickup`.

## Existing project (already created: has code, notes, a half-made plan, or none of the workflow files)
`/new-project` is also how an existing project gets back on the right path. Detect it first: the folder (or the chat's project) already holds code or documents, or has no goal file / plan board. Say in one plain line that you are in "existing project" mode, then follow Phases A to F with these differences:
1. **Read before asking:** manifests, entry points, README, folder layout, `git log`, and any of PRODUCT / DECISIONS / plan board / handoff / memory that exist. Tell the owner in plain words what you found ("here is what this project looks like to me"). Questions become specific, and anything the files already answer is skipped with a quote ("your PRODUCT.md already says X").
2. **Set up what is missing, never overwrite:** if there is no `CLAUDE.md`, do the onboarding of `project-audit` step 1 (copy the missing template files, fill CLAUDE.md from the real code, `git init` / private GitHub repo only in Phase F after the plan is approved, with a secrets scan first). Existing files and the owner's own docs stay where they are; point to them from CLAUDE.md's docs map and `docs/INDEX.md`. An old-layout project is moved to `docs/` only by `project-sync`, never here.
3. **Goal and decisions:** an existing `PRODUCT.md` is kept: only add what is missing, as DRAFT until the owner confirms. Decisions already visible in the code or docs are recorded as `[open]` or `[proposed]` for the owner to confirm, never as decided.
4. **The plan covers what REMAINS:** finished work is not re-planned. Mark a step or phase `[x]` only with evidence (a test, a screenshot, a commit), `[~]` when unsure (`plan` skill, section F). The first phase is often "fix what is broken" taken from `project-audit` if the owner wants an audit; offer it, do not force it. The owner's answers decide the rest.
5. **No code is touched.** Phase F writes docs, the handoff and (with approval) the board; building starts only at the owner's go.
`/new-project` answers "where should this project go?"; `/project-audit` answers "what is wrong with it?". Offer the second after the first.

## Non-negotiable rules
1. **Nothing is decided without the owner.** Not the name, stack, hosting, look, order of phases, or "obvious" defaults. If the owner hasn't said it, it's a question, or an assumption listed for the owner's veto, never a fact.
2. **No scaffolding before approval:** no git init, no installs, no project code. Writing `docs/PRODUCT.md`, `docs/DECISIONS.md`, `docs/plan/BOARD.md` (+ `docs/plan/phases/*.md`), `docs/INDEX.md` and `docs/reference/PRIOR_ART.md` in the project folder is allowed (create the folder if needed).
3. **Everything is written down as it happens:** the owner's words into docs/PRODUCT.md / docs/DECISIONS.md, so a new chat can pick up mid-interview. Run `handoff` at each gate.
4. **Ask a lot.** A thin brief makes a bad plan. Prefer 5 rounds of 3-4 good questions over guessing. It is fine to take an hour.
5. **Gates:** after each phase below, show what you wrote and wait for a yes. A "no" or a change goes back into the file, and you show it again.

## Phase A: Interview (5 rounds; AskUserQuestion, 3-4 questions per call, options explained)
Skip only what the owner already told you in this chat or in existing files (and say what you skipped: "you already told me X"). Quote the owner, don't paraphrase. When the owner says "I don't know", that's a valid answer: offer to research it, or record it as an open question.
- **Round 1, the idea:** what is it in the owner's own words; who is it for (just the owner / friends / customers); what problem does it solve and how does the owner deal with it today; the single thing it must do well; what would make the owner say "this was worth it" (a measurable success, e.g. "15 minutes a day"); what the owner's seen that's close (apps, sites, repos).
- **Round 2, the experience:** where it runs (website, desktop app, phone, script, bot, game); the 3-5 things a user does from start to finish, step by step; look and feel (reference sites/apps the owner likes and dislikes, mood, light/dark, language of the UI); what it must never do or feel like.
- **Round 3, data and connections:** what information it stores; does it need accounts/logins; any personal, payment or sensitive data; which outside services it talks to (APIs, social platforms, email); what the free path is for each, what costs money, and whether a paid part is acceptable at all (rule: nothing essential may need a paid key).
- **Round 4, running it:** local-only or on the internet; who and how many will use it; does it need to run while the owner's PC is off; backups; how much of the owner's time per day or week the owner wants it to take; deadline or first milestone; what the owner can do himself (create accounts, supply files) vs what must be automatic.
- **Round 5, priorities and limits:** must-have vs nice-to-have vs not-now (let the owner sort a list you propose from rounds 1-4); quality bars (speed, accuracy, polish, privacy); legal or licence worries; things already tried that failed; what the owner is most afraid will go wrong.
After each round: update `docs/PRODUCT.md` (quotes, non-negotiables, success, not-doing) and open a `docs/DECISIONS.md` entry for every real choice that came up (`[decided]` only if the owner chose; otherwise `[open]`, kept under "Waiting on the owner").

## Phase B: Say it back (gate 1)
Write docs/PRODUCT.md as DRAFT. Show it in plain words: "Here is what I understood". Add a list **"Things I assumed (veto any)"**. Wait for the owner: confirm or correct. On yes: `Status: CONFIRMED <date>`.

## Phase C: Research, visible (gate 2)
1. `prior-art` in project mode: popular repos/products solving the same problem. Present the plain-words report (what each does, what's worth borrowing, licence in one sentence, what's our edge). Adoption of any idea or component = a choice card, logged in DECISIONS.md.
2. `find-skills` (`npx skills find <keyword>` for the stack, domain and the design role). Present: skill name, what it does in one plain sentence, where it would be used, install size/risk if known, verdict. One design skill per role (global CLAUDE.md). If nothing fits say so and list what you searched.
3. Check current versions of any framework you intend to propose with context7.
Both reports go into docs/reference/PRIOR_ART.md and CLAUDE.md "Skills" only after the owner picks.

## Phase D: Technical choices, one by one (gate 3)
List the real choices (UI approach, backend, database, hosting, auth, how it runs automatically, testing approach). For each important one use a choice card with 2-3 options, explained for a non-programmer, with your recommendation and what it costs the owner later if the owner changes the owner's mind. Minor ones can go in one block: "Defaults I would use. Say 'accept all' or name the ones to change." Defaults count as decided only after the owner accepts. Database default for data apps: Supabase unless the app is local-only (then SQLite), still the owner's call.
Write each to docs/DECISIONS.md with the owner's words.

## Phase E: The plan (gate 4 then gate 5)
1. **Phase list first (gate 4):** propose the phases in order, each with its purpose in one plain sentence and what the owner will see at the end. Start from: foundation, data/backend, UI, integrations, tests, security, performance, learning loop, launch; drop what doesn't apply, add what does. Ask the owner to reorder, merge, split or cut. Also propose milestones ("after phase 3 you can already try X").
2. **Then the steps (gate 5):** write `docs/plan/BOARD.md` from `_template/docs/plan/BOARD.md`: Status board (all `[ ]`), rules, change log. Then ONE file per phase, `docs/plan/phases/NN-name.md` from `_template/docs/plan/phases/_example.md` (NN = phase number, two digits): purpose in plain words, "Read first" files for that phase, per step Use (skill/tool), Done when (something observable), Test, Decisions needed, and that phase's risks. The parallel agent plan (disjoint OWNS paths) and the quality checklist with an owner phase per line go into `docs/reference/TASKS.md`. Do NOT copy decisions, the skills list or the work split into the plan: they live in DECISIONS.md, CLAUDE.md and TASKS.md. Show it phase by phase if long.
3. Every step must name its proof. No step says "implement X" without a way to see it works.
4. Ask: "Is anything missing, too big, or in the wrong order?" Apply edits with a Change log line.

## Phase F: Stop, then build only after approval
Write the handoff now (`handoff` skill, with its `Read first:` line) with "Waiting on the owner: approve the plan (docs/plan/BOARD.md)". Tell the owner in plain words what happens next and what you will do first. Only after the owner's explicit approval:
- Set the board's `Status: APPROVED <date>`; copy the rest of `_template` (CLAUDE.md filled from decisions with its docs map, `docs/INDEX.md` with a row for every file that now exists, docs/reference/{DESIGN,ARCHITECTURE,TESTING,TASKS,SECURITY_CHECKLIST}.md, `.claude/project-workflow.json`, `.claude/memory.md`; the project root keeps only code + CLAUDE.md + README.md), `git init` + first commit with a `.gitignore` that excludes secrets and data. Create the GitHub repo (private) when the owner picks the name.
- Install only the skills/plugins the owner approved. Remove the TEMPLATE marker from CLAUDE.md.
- Start at Phase 0 with its phase gate (`plan` skill), tick the board as steps complete, `handoff` after each phase.
