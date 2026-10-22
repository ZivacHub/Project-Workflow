// usage: node memory-rotate.mjs <project folder> [--apply]
// Moves old months out of .claude/memory.md into .claude/memory/YYYY-MM.md (layout v3 history rule).
// Default is a dry run (prints what would move). Nothing is ever deleted: every moved entry is written to
// its month file first, and the move is checked entry by entry before memory.md is rewritten.
// Kept in memory.md: the current month, the newest 3 dated entries (so a new month never starts empty),
// and every entry whose heading has no date ("## Current state" etc.).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const apply = process.argv.includes("--apply");
const root = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) || process.cwd());
const file = join(root, ".claude", "memory.md");
if (!existsSync(file)) { console.log(`no .claude/memory.md in ${root}`); process.exit(1); }

const text = readFileSync(file, "utf8");
const parts = text.split(/^(?=## )/m); // [header, entry, entry, ...] exactly as written (no newline changes)
const header = parts[0].startsWith("## ") ? "" : parts.shift();
const dated = (p) => /^## (\d{4}-\d{2})-\d{2}/.exec(p)?.[1] || null;
const now = new Date(); const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const datedIdx = parts.map((p, i) => (dated(p) ? i : -1)).filter((i) => i >= 0);
const newest3 = new Set(datedIdx.slice(-3));
const move = new Map(); // month -> entries
parts.forEach((p, i) => { const m = dated(p); if (m && m < thisMonth && !newest3.has(i)) { if (!move.has(m)) move.set(m, []); move.get(m).push(p); } });
const moving = [...move.values()].reduce((n, a) => n + a.length, 0);
console.log(`memory.md: ${parts.length} entries, ${Math.round(text.length / 102.4) / 10} KB. Current month ${thisMonth}.`);
if (!moving) { console.log("nothing to archive."); process.exit(0); }
for (const [m, a] of [...move].sort()) console.log(`  ${m}: ${a.length} entr${a.length === 1 ? "y" : "ies"} -> .claude/memory/${m}.md`);
if (!apply) { console.log(`dry run: ${moving} entries would move. Run again with --apply to do it.`); process.exit(0); }

const dir = join(root, ".claude", "memory"); mkdirSync(dir, { recursive: true });
const countEntries = (t) => (t.match(/^## /gm) || []).length;
for (const [m, entries] of move) {
  const f = join(dir, `${m}.md`);
  const before = existsSync(f) ? readFileSync(f, "utf8") : `# Project memory: ${m} (archived from .claude/memory.md, append only)\n\n`;
  const after = (before.endsWith("\n") ? before : before + "\n") + entries.map((e) => (e.endsWith("\n") ? e : e + "\n")).join("");
  writeFileSync(f, after);
  if (countEntries(readFileSync(f, "utf8")) !== countEntries(before) + entries.length) { console.log(`ABORT: ${m}.md does not hold all moved entries; memory.md left untouched`); process.exit(2); }
}
const keep = parts.filter((p) => !(dated(p) && move.get(dated(p))?.includes(p)));
writeFileSync(file, header + keep.join(""));
console.log(`moved ${moving} entries; memory.md now has ${keep.length}. Nothing deleted.`);
