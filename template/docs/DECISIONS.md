# Decisions

Rule: a decision is **decided** only when the owner said it. Anything Claude suggested is **proposed** until the owner answers.
A vague answer ("depends", "whatever") is not a decision: write Claude's reading as `[proposed]` and ask the owner to confirm.
Never delete: replace with `[superseded by D<n>]`. Status line format (read by a script): `## D<n> — <title>   [decided <date>]` or `[open]` / `[proposed]` / `[superseded by D<n>]`.
Layout: the two sections below. When a decision is answered, move its block from "Waiting on the owner" to the bottom of "Decided" (so the top of this file is always what is still open).

## Waiting on the owner (open and proposed)

## D<n> — <short title in plain words>   [open]   (example: delete this block when you add the first real decision)
**Question:** <what has to be chosen, in one plain sentence>
**Why it matters:** <what changes for the owner>
**Options:**
- A) <name>: <what it means in plain words>. You'd notice: <concrete effect>. Cost/risk: <...>
- B) ...
**Recommendation:** <A/B> because <plain reason>
**The owner said:** (the owner's words, with date)
**Result:** (filled when decided; what we do now)
**Affects:** <plan step IDs / files>

## Decided (newest at the bottom)
