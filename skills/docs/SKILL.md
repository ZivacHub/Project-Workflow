---
name: docs
description: Open only the documents the work needs. Finds the right docs for a topic, splits a huge document into small area files (docs/design/<area>.md) with a proof that no line is lost, and checks the docs folder for big or unlabelled files. Use when the owner types /docs or says "which docs are about X", "only read what is relevant", "this doc is too big", "split this document", "split my game design", "docs check".
---

# Docs: a big project must not be read whole

Why: in a big project (a game with combat, items, map, enemies...) every mechanic can have pages of rules. A chat working on combat must open the combat file and nothing else. The layout makes that possible: each area is its own file in `docs/design/` that starts with a `Read when:` line, `docs/INDEX.md` lists every file, a plan step names the area docs it needs with `Needs:`, and the tools below find or create the right small files.

## /docs <topic>: find what to open
1. Run `node ~/.claude/hooks/docs-find.mjs "<topic>" --project "<project folder>"` (add `--limit 6` for more). It ranks the project's docs by file name, `Read when:` line, index row, titles and text, shows the size, and hides old versions in `archive/` unless nothing else matches.
2. Tell the owner in plain words which 1-4 files you will open and why; open only those. If the next plan step has a `Needs:` line, those files come first.
3. No match: say so, read `docs/INDEX.md`, or ask the owner which doc covers it. Never "read everything to be safe".

## /docs split <file>: split a huge document into areas
For a doc that grew too big (over about 12 KB) or a design written as one long file, in a layout-v3 project (an old layout is moved first by `project-sync`).
1. **Dry run:** `node ~/.claude/hooks/split-doc.mjs "<project folder>" "<doc, relative to the project>"`. It splits at the document's own headings, keeps sections of 1.5 KB or more as their own file, joins tiny sections to the file before them, and runs the proof (every line of the original must be found again).
2. **Show the owner the table** in plain words: which sections land in which area file. If the grouping is wrong, write a small map (`{"combat": ["Combat", "Damage and armour"], "_rest": "misc"}`) and pass it with `--map areas.json`; every section must be mapped or go to `_rest`, so nothing is dropped.
3. **Apply only on the owner's OK:** the same command with `--apply`. It needs a clean git tree (another chat may be mid-work: stop and ask). The original is kept unchanged in `docs/reference/archive/<name>-before-split.md`; rows are added to `docs/INDEX.md`; nothing is committed.
4. **Finish the job by hand** (the script only writes placeholders): in every new area file replace the automatic `Read when:` line with one precise sentence (when should a chat open this file?) and fill `Related:` with the other areas it depends on; check the index rows; name the area docs in the plan steps that need them (`Needs:`, through the `plan` skill with the owner's OK).
5. **Prove it:** `node ~/.claude/hooks/docs-find.mjs --check` (no warnings left) and `node ~/.claude/hooks/handoff-lint.mjs "<project folder>"`; then commit as its own commit ("Split <doc> into design areas") and push only if the project allows it.

## /docs check
Run `node ~/.claude/hooks/docs-find.mjs --check` and report in plain words: docs over 12 KB, design areas without a `Read when:` line or with the automatic one, plan steps that need a file that does not exist, docs missing from the index. Offer `/docs split` for the big ones.

## Starting a big project (used by `new-project`)
Ask for the big parts early ("what are the areas that each need their own rules written down? for a game: combat, items, map, enemies, quests, UI...") and create one `docs/design/<area>.md` per area from `_template/docs/design/_area-example.md` (status DRAFT until the owner confirms). Each area stays under about 12 KB; split it again when it grows. Small projects need no `docs/design/` at all.

## Rules
- You never decide what an area says; you only organise the owner's words and decisions. Open questions go to `docs/DECISIONS.md`.
- Nothing is deleted: the split keeps the original, and the proof must show 0 lines lost.
- Never open a big doc whole "just in case": find it, open the part, say what you opened.
