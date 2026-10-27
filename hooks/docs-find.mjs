#!/usr/bin/env node
// Which documents of this project are about a topic? So a chat opens ONLY those, not the whole docs/ folder.
//   node ~/.claude/hooks/docs-find.mjs "combat damage"            best matches in the project of the current folder
//   node ~/.claude/hooks/docs-find.mjs "combat" --project "<folder>" [--limit 4]
//   node ~/.claude/hooks/docs-find.mjs --check [--project "<folder>"]   docs hygiene: big docs, design areas without "Read when:", missing Needs files
// It reads titles, the "Read when:" line, the INDEX row and the text; it changes nothing. Ranking is plain keyword scoring (no AI, no network).
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { locate, read, safeReaddir, kb, layoutOf, lintLayout, oversizedDocs } from "./lib/project-workflow.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const val = (n) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const valued = new Set(["--project", "--limit"]);
const topic = argv.filter((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1])).join(" ").trim();
const where = locate(resolve(val("project") || process.cwd()));
if (where.kind !== "project") { console.log(`Not inside a project folder (kind: ${where.kind}). Use --project "<folder>".`); process.exit(1); }
const root = where.root, LIMIT = Math.max(1, Number(val("limit")) || 4);

if (flag("check")) {
  const w = lintLayout(root), big = oversizedDocs(root);
  console.log(`Docs check for ${where.name} (layout v${layoutOf(root)})`);
  if (!w.length && !big.length) console.log("  OK: every doc is listed, design areas have a Read when line, nothing is over 12 KB.");
  for (const x of w) console.log("  ! " + x);
  for (const b of big) console.log(`  ! ${b.file} is ${b.kb} KB: split it so a chat opens only the part it needs (/docs split <file>)`);
  process.exit(0);
}
if (!topic) { console.log('Give a topic, for example: docs-find.mjs "combat damage".  (--check shows docs hygiene.)'); process.exit(1); }

const STOP = new Set("the a an of to and or for in on at by with how what why when where do does is are it its this that work working works step steps doc docs file files about".split(" "));
const stem = (w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
const words = [...new Set(topic.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length >= 2 && !STOP.has(w)).map(stem))];
if (!words.length) { console.log("The topic has no usable words."); process.exit(1); }

// every document: docs/** (all of it), and for a layout-v2 project the loose .md files in the root
const files = [];
const walk = (dir, rel) => { for (const n of safeReaddir(dir)) { const p = join(dir, n); let st; try { st = statSync(p); } catch { continue; } if (st.isDirectory()) walk(p, rel + n + "/"); else if (/\.md$/i.test(n)) files.push({ rel: rel + n, abs: p, bytes: st.size }); } };
walk(join(root, "docs"), "docs/");
if (layoutOf(root) !== 3) for (const n of safeReaddir(root)) { const p = join(root, n); try { if (statSync(p).isFile() && /\.md$/i.test(n) && !/^(README|CLAUDE)\.md$/i.test(n)) files.push({ rel: n, abs: p, bytes: statSync(p).size }); } catch {} }

const indexRows = new Map();   // basename -> text of its INDEX row
for (const line of read(join(root, "docs", "INDEX.md")).split("\n")) { const m = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|?\s*$/.exec(line.trim()); if (m) indexRows.set(basename(m[1]).toLowerCase(), m[2]); }
const tok = (s) => new Set(String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean).map(stem));

const scored = [];
for (const f of files) {
  if (f.rel === "docs/INDEX.md") continue;
  const text = read(f.abs), lines = text.split("\n");
  const heading = (/^#\s+(.+)$/m.exec(text) || [])[1] || "";
  const readWhen = (lines.slice(0, 15).find((l) => /^Read when:/i.test(l)) || "").replace(/^Read when:\s*/i, "");
  const related = (lines.slice(0, 15).find((l) => /^Related:/i.test(l)) || "").replace(/^Related:\s*/i, "");
  const row = indexRows.get(basename(f.rel).toLowerCase()) || "";
  const nameT = tok(f.rel.replace(/\.md$/i, "")), rwT = tok(readWhen), rowT = tok(row), headT = tok(heading), subT = tok(lines.filter((l) => /^#{2,4}\s/.test(l)).join(" "));
  const body = text.toLowerCase();
  let score = 0; const why = new Set();
  for (const w of words) {
    if (nameT.has(w)) { score += 4; why.add("file name"); }
    if (rwT.has(w)) { score += 3; why.add("Read when"); }
    if (rowT.has(w)) { score += 3; why.add("index"); }
    if (headT.has(w)) { score += 2; why.add("title"); }
    if (subT.has(w)) { score += 1; why.add("section titles"); }
    const n = body.split(w).length - 1; if (n > 0) { score += Math.min(3, Math.log2(1 + n)); why.add("text"); }
  }
  if (!score) continue;
  if (/\/archive\//.test(f.rel)) score *= 0.3; else if (/\/phases\//.test(f.rel)) score *= 0.7;
  scored.push({ ...f, score, why: [...why], readWhen: readWhen || row, related, heading });
}
scored.sort((a, b) => b.score - a.score);
// old versions in archive/ are only shown when nothing else matches (or with --archive)
const live = scored.filter((d) => !/\/archive\//.test(d.rel));
const pool = flag("archive") || !live.length ? scored : live;
const top = pool.slice(0, LIMIT);
if (!top.length) { console.log(`No document in ${where.name} matches "${topic}". Read docs/INDEX.md, or ask the owner which doc covers it.`); process.exit(0); }
console.log(`Docs about "${topic}" in ${where.name} (best first; open only these, nothing else is needed for this topic):`);
top.forEach((d, i) => console.log(`  ${i + 1}. ${d.rel}  (${kb(d.bytes)} KB)  [matched: ${d.why.join(", ")}]${d.readWhen ? "\n     Read when: " + d.readWhen.slice(0, 160) : ""}${d.related ? "\n     Related: " + d.related.slice(0, 160) : ""}`));
console.log(`Total to read: ${kb(top.reduce((n, d) => n + d.bytes, 0))} KB.${pool.length > top.length ? ` ${pool.length - top.length} more weaker match(es): use --limit ${Math.min(pool.length, LIMIT + 4)}.` : ""}`);
