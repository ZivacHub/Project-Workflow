# <Area name>, for example "Combat"   (this is the EXAMPLE: copy it as docs/design/<area>.md, one file per big part of the project)
Read when: <the work that needs this file, in one line, e.g. "any step that touches combat rules, damage, enemy attacks or armour">
Related: <other area files this one depends on and why, e.g. design/items.md (weapon stats), design/enemies.md (enemy health)>
Status: DRAFT | CONFIRMED <date, the owner's words>
Decisions: <D-ids in docs/DECISIONS.md that shaped this area, or none>

Why areas exist: in a big project (a game with combat, items, map, enemies...) one chat should open ONLY the area it works on. The plan step names it with `Needs: \`docs/design/<area>.md\``, and `docs-find.mjs "<topic>"` finds the right files when nobody wrote that down. Keep each area under about 12 KB; split it when it grows.

## What it is, in plain words
<two or three sentences the owner would recognise>

## How it should work (the rules, numbers, examples)
<the rules. Exact numbers and examples, so a step can be built and tested from this file alone>

## What it must never do
<the limits and non-goals of this area>

## Open questions
<anything the owner still has to decide; the moment it needs an answer, move it to docs/DECISIONS.md as [open]>
