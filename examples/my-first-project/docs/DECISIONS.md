# Decisions

Rule: a decision is **decided** only when the owner said it. Anything Claude suggested is **proposed** until the owner answers.
Never delete: replace with `[superseded by D<n>]`. Status line format (read by a script): `## D<n> — <title>   [decided <date>]` or `[open]` / `[proposed]` / `[superseded by D<n>]`.

## Waiting on the owner (open and proposed)

## D2 — Should the page also show a picture (coat, T-shirt)?   [open]
**Question:** words only, or a small icon next to the advice?
**Why it matters:** icons make it friendlier but add images to maintain.
**Options:**
- A) Words only: simplest. You'd notice: plain text. Cost/risk: none.
- B) Icons: friendlier. You'd notice: a small picture next to the advice. Cost/risk: a little more work in phase 2.
**Recommendation:** A for now, B if you still like the page after a week.

## Decided (newest at the bottom)

## D1 — One HTML file, no framework   [decided 2026-01-05]
**The owner said:** "Keep it simple, just one page."
**Result:** index.html with a few lines of JavaScript.
