---
name: project-audit
description: First-run audit of an existing workflow project that already has code. Writes AUDIT.md listing what's wrong, which rule or skill it breaks, and a ready-to-use fix prompt per item. Also sets up projects with no CLAUDE.md. Use when the SessionStart project check asks for it, or when the owner says "audit", "check the project", "what's wrong", or "fix the audit".
---

# Project audit

Read-only on project code. May write: `docs/reference/AUDIT.md` (v2 project: `AUDIT.md` in the root), CLAUDE.md and template docs (setup only), .claude/memory.md, screenshots in `.claude/audit/`. File locations depend on the docs layout (v3 = `docs/`, v2 = root): see "Project docs layout and reading tiers" in ~/.claude/CLAUDE.md. A folder that is being set up now gets layout v3 straight away; an existing v2 project is moved only by `project-sync`, never here.

## 1. Setup (only if there's no CLAUDE.md): onboarding an existing folder
- Read the code first (manifests, entry points, README, folder layout), so questions are specific.
- **Short interview, nothing assumed** (choice cards, plain words, 3-4 questions at a time): what is this project and what was it meant to do; is it still alive or an old experiment; what does the owner want to do with it now; what must not change. Write the owner's answers into `docs/PRODUCT.md` (DRAFT until the owner confirms) and any real choice into `docs/DECISIONS.md` (`[decided]` only if the owner chose).
- Copy missing files from `<projects folder>/_template` (the projects folder is `root=` in the output of `node ~/.claude/hooks/pickup-context.mjs --options`) (layout v3: `CLAUDE.md`; `docs/{INDEX,PRODUCT,DECISIONS}.md`, `docs/plan/BOARD.md`, `docs/reference/{DESIGN,ARCHITECTURE,TESTING,TASKS,SECURITY_CHECKLIST}.md`; `.claude/{handoff,memory,project-workflow}`). Never overwrite existing files, and never move the folder's own docs (README, notes, its own `docs/`) without asking: point to them from CLAUDE.md's docs map and from `docs/INDEX.md` instead. Fill CLAUDE.md from the real code: stack, commands, conventions, and the docs map.
- Run `find-skills` (`npx skills find <keyword>`) and `prior-art`, and SHOW both reports in plain words (see those skills). Write only the approved ones into CLAUDE.md "Skills"; install only what the owner approves.
- If it isn't a git repo: offer `git init`, `.gitignore` (secrets, data, big/binary files), first commit, and a private GitHub repo after a secrets scan and the owner's OK.
- The plan: don't invent one. After the audit, the "Fix plan" becomes the first phase(s) of the board in `docs/plan/BOARD.md` (each with its phase file; `plan` skill); the larger plan comes from the owner's answers.

## 2. Collect the rules
The standard to audit against is: the project's CLAUDE.md, docs/reference/DESIGN.md, docs/reference/TESTING.md (v2: root), plus every skill listed in CLAUDE.md "Design stack" / "Skills" (read their SKILL.md). Note the rules that apply.

## 3. Check each area
0. Foundations first: is it a git repo with a sane .gitignore (no data/secrets/vendored clones)? Do CLAUDE.md and the template docs match reality? These block safe fixing, so rank them high.
1. Setup: does it install and start with the documented commands?
2. Tests: run them; note failures and untested core flows.
3. Visual/design: start the app locally (throwaway data dir, spare port), playwright-cli screenshots at 375/768/1280, console errors. Then a FULL design pass, not spot checks: go screen by screen against DESIGN.md and each design skill in the Design stack (hierarchy, spacing grid, type scale, color, states, motion, focus, generic/template look). Each violation is its own finding quoting the skill's rule.
4. Readability: dead code, duplication, unclear names, huge files, missing docs.
5. Errors: bad input, empty states, failed network calls, logging.
6. Security: follow the "Security" section of the global CLAUDE.md (own app, localhost only). Strix only if TOOLS.md says it's configured. Walk through `_template/docs/reference/SECURITY_CHECKLIST.md` (the 19-point security checklist) and mark each as pass / fail / not applicable.
7. Accessibility, performance, scalability: quick pass, note the biggest risks.
8. Prior art: if docs/reference/PRIOR_ART.md (v2: PRIOR_ART.md) is missing or older than ~3 months, run the `prior-art` skill. Turn its approved ideas into findings marked [idea] (separate from bugs) with a fix prompt each.
Stop any server you started.

## 4. Write AUDIT.md
Keep it SMALL to read: open findings on top, fixed ones archived. In layout v3 the file is `docs/reference/AUDIT.md` and a finding that is fixed (ticked `[x]`) is moved, whole, to `docs/reference/archive/AUDIT-fixed.md` (create it; keep the ID), leaving one line `- A-03 fixed <date>: <title>` under "## Fixed (details in archive/AUDIT-fixed.md)". Nothing is deleted. In a v2 project keep the old single file.
```
# Audit: <project> (<date>)
Summary: counts by severity, top 3 problems.

## Findings (open)
### A-01 [high] <short title>
- Where: file:line or screen
- Rule broken: <source> says "<the rule>"   (e.g. apple-design skill, DESIGN.md, TESTING.md)
- Evidence: what you saw (screenshot path, test output, request/response)
- Fix prompt: "<one self-contained instruction Claude can run to fix it>"
- Status: [ ] open
```
Rules for findings:
- One problem per finding. Never bundle unrelated issues.
- "Rule broken" must quote a rule that actually covers the problem. If none does, say "general <area> practice" rather than stretching an unrelated rule.
- Mark evidence as "reproduced" or "code-read". Only real, checked findings. No guesses.
- Severity by impact, not by area: critical = data loss/takeover now; high = data loss risk, security hole, or anything that blocks safe fixing (no git, no tests on the path); medium = wrong behavior users hit; low = polish, docs, dead code.

After the findings, add a "## Fix plan" section: steps in order, grouped into batches by the files they touch. Findings that share a file go in one sequential batch; batches touching different files can run in parallel. Big changes (data model, storage moves) get "plan first, the owner approves" as their step.
Also list "Not checked" (what was skipped and why) and "What passed".

## 5. After the audit
Log it in .claude/memory.md and update .claude/handoff.md (handoff skill). Show the owner the summary IN PLAIN WORDS (no finding IDs without a one-line meaning; say what each problem means for the owner: "anyone on your Wi-Fi could create an account") and ask as a choice card: follow the fix plan / fix critical+high only / pick items, with what each means and your recommendation.
Re-audits: keep fixed items for history (v3: in the archive file, see step 4), add new findings with new IDs, update the summary counts and the fix plan.
When fixing: work item by item using its fix prompt (independent items can run as parallel subagents), re-check each, tick `[x]` with a one-line note and, in v3, archive it. Re-run the affected checks at the end.
