#!/usr/bin/env node
// Splits ONE big markdown document into small "area" files (docs/design/<area>.md), so a chat opens only the area it works on.
//   node ~/.claude/hooks/split-doc.mjs "<project folder>" "<doc, relative to the project>"                 dry run: shows the plan and runs the proof, writes nothing
//   node ~/.claude/hooks/split-doc.mjs "<project folder>" "<doc>" --apply [--map areas.json] [--into docs/design] [--level 2]
// Default grouping: split at the `##` headings (or `#` / `###` when that is where the sections are) and merge tiny neighbours (< 1.5 KB) into one file.
// --map areas.json decides the grouping yourself: {"combat": ["Combat", "Damage and armour"], "items": ["Items"], "_rest": "misc"}
//   (heading names, case-insensitive start match; every section must be mapped or go to "_rest", otherwise it stops: nothing is ever dropped).
// Safety: layout v3 project, clean git tree for --apply, the original is `git mv`'d to docs/reference/archive/<name>-before-split.md unchanged,
// and the split stops unless every line of the original is found again in the new files. Rows are added to docs/INDEX.md. It does not commit.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { layoutOf, kb } from "./lib/project-workflow.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const val = (n) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith("--") && !["--map", "--into", "--level"].includes(argv[i - 1]));
const ROOT = resolve(pos[0] || ""), DOC = (pos[1] || "").replaceAll("\\", "/");
const APPLY = flag("apply"), TODAY = new Date().toISOString().slice(0, 10), INTO = (val("into") || "docs/design").replace(/\/+$/, "");
const die = (m) => { console.error("\nSPLIT STOPPED: " + m); process.exit(1); };
const say = (m = "") => console.log(m);
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
if (!pos[0] || !pos[1]) die('usage: split-doc.mjs "<project folder>" "<doc relative to the project>" [--apply] [--map areas.json]');
if (!existsSync(join(ROOT, ".git"))) die("the project is not a git repo.");
if (layoutOf(ROOT) !== 3) die("this project is still on the old docs layout: run the project-sync move first.");
if (!existsSync(join(ROOT, DOC))) die(`${DOC} does not exist in the project.`);
if (!git("ls-files", "--", DOC).trim()) die(`${DOC} is not tracked by git.`);
if (APPLY && git("status", "--porcelain").trim()) die("the working tree is not clean (another chat may be mid-work). Commit or /handoff there first.\n" + git("status", "--porcelain"));

const norm = (l) => l.replace(/\r$/, "").trim().replace(/^#+\s*/, "").replace(/\]\([^)]*\)/g, "](x)");
const old = readFileSync(join(ROOT, DOC), "utf8"), NL = old.includes("\r\n") ? "\r\n" : "\n", L = old.split("\n");

// headings outside code fences
let fence = false; const heads = [];
L.forEach((l, i) => { if (/^\s*```/.test(l)) fence = !fence; else if (!fence) { const m = /^(#{1,6})\s+(.+?)\s*$/.exec(l.replace(/\r$/, "")); if (m) heads.push({ i, level: m[1].length, text: m[2] }); } });
const level = Number(val("level")) || [2, 1, 3, 4].find((lv) => heads.filter((h) => h.level === lv).length >= 2);
if (!level) die("the document has no heading level with at least two sections to split at (try --level N).");
const cuts = heads.filter((h) => h.level === level);
const sections = cuts.map((h, k) => ({ title: h.text, lines: L.slice(h.i, cuts[k + 1] ? cuts[k + 1].i : L.length) }));
const pre = L.slice(0, cuts[0].i);
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 5).join("-") || "area";
const bytes = (ls) => ls.join("\n").length;

// grouping
let groups = [];   // {name, titles[], lines[]}
const preText = pre.join("\n").trim();
if (val("map")) {
  const map = JSON.parse(readFileSync(resolve(val("map")), "utf8")), rest = map._rest; const used = new Set();
  for (const [name, titles] of Object.entries(map)) { if (name === "_rest") continue; const g = { name, titles: [], lines: [] };
    for (const t of titles) { const s = sections.find((x, k) => !used.has(k) && x.title.toLowerCase().startsWith(t.toLowerCase())); if (!s) die(`mapped heading "${t}" was not found (or is mapped twice).`); used.add(sections.indexOf(s)); g.titles.push(s.title); g.lines.push(...s.lines); }
    groups.push(g); }
  const left = sections.filter((_, k) => !used.has(k));
  if (left.length) { if (!rest) die(`these sections are not mapped: ${left.map((s) => `"${s.title}"`).join(", ")}. Map them or add "_rest": "<file name>" so nothing is dropped.`); groups.push({ name: rest, titles: left.map((s) => s.title), lines: left.flatMap((s) => s.lines) }); }
  // keep the document's own order for the files
  groups.sort((a, b) => sections.findIndex((s) => s.title === a.titles[0]) - sections.findIndex((s) => s.title === b.titles[0]));
} else {
  // a section of 1.5 KB or more gets its own file; a tiny one joins the file before it (a note usually belongs to what precedes it), or the next one when it comes first
  let carry = null;
  for (const s of sections) {
    const tiny = bytes(s.lines) < 1500;
    if (tiny && groups.length) { const g = groups[groups.length - 1]; g.titles.push(s.title); g.lines.push(...s.lines); }
    else if (tiny) carry = carry ? { titles: [...carry.titles, s.title], lines: [...carry.lines, ...s.lines] } : { titles: [s.title], lines: [...s.lines] };
    else { const g = { name: slug(s.title), titles: [s.title], lines: [...s.lines] }; if (carry) { g.titles = [...carry.titles, ...g.titles]; g.lines = [...carry.lines, ...g.lines]; carry = null; } groups.push(g); }
  }
  if (carry) groups.push({ name: slug(carry.titles[0]), titles: carry.titles, lines: carry.lines });
}
if (preText.length > 120 || (preText && !groups.length)) groups.unshift({ name: "overview", titles: ["Overview (text before the first section)"], lines: pre });
else if (preText && groups.length) groups[0].lines = [...pre, ...groups[0].lines];
const taken = new Set(); for (const g of groups) { let n = slug(g.name) || "area", base = n, c = 2; while (taken.has(n)) n = `${base}-${c++}`; taken.add(n); g.file = `${INTO}/${n}.md`; if (existsSync(join(ROOT, g.file))) die(`${g.file} already exists: choose another --into folder or rename.`); }

// files
const docName = basename(DOC, ".md"), ARCH = `docs/reference/archive/${docName}-before-split.md`;
if (existsSync(join(ROOT, ARCH))) die(`${ARCH} already exists.`);
const readWhen = (g) => `work touches ${g.titles.slice(0, 4).map((t) => `"${t.replace(/[`*_]/g, "")}"`).join(", ")}${g.titles.length > 4 ? ` and ${g.titles.length - 4} more` : ""} (from ${basename(DOC)}; make this line more precise if you can).`;
const fileText = (g) => [`# ${g.titles[0].replace(/^Overview.*$/, "Overview")}`, `Read when: ${readWhen(g)}`, "Related: (none written yet)", `(split from ${DOC} on ${TODAY}; the text below is unchanged)`, "", ...g.lines.map((l) => l.replace(/\r$/, ""))].join("\n").replace(/\n+$/, "\n");
const outFiles = groups.map((g) => ({ file: g.file, text: fileText(g), g }));
const have = new Set(outFiles.flatMap((f) => f.text.split("\n").map(norm).filter(Boolean)));
const lost = old.split("\n").map(norm).filter((l) => l && !have.has(l));

say(`Split ${DOC} (${kb(old.length)} KB, ${sections.length} sections at level ${level}) into ${groups.length} area file(s)   (${APPLY ? "APPLY" : "dry run"})\n`);
for (const f of outFiles) say(`  ${f.file.padEnd(48)} ${String(kb(f.text.length)).padStart(5)} KB   ${f.g.titles.slice(0, 3).join(" | ")}${f.g.titles.length > 3 ? " | ..." : ""}`);
say(`  original -> ${ARCH}  (unchanged, git mv)`);
say(`\nProof: ${lost.length === 0 ? "every line of the original is in the new files (0 lost)" : lost.length + " line(s) lost, e.g. " + lost.slice(0, 3).join(" | ")}`);
if (lost.length) die("the proof failed, nothing was written.");
const refs = (() => { try { return git("grep", "-l", "-F", basename(DOC), "--", "*.md").split("\n").filter((f) => f && f !== DOC); } catch { return []; } })();
if (refs.length) say(`Other docs mention ${basename(DOC)} (left as they are; they still find it through INDEX.md): ${refs.slice(0, 6).join(", ")}${refs.length > 6 ? ", ..." : ""}`);
if (!APPLY) { say("\nDry run: nothing was written. Add --apply to do it (or --map areas.json to group the sections yourself)."); process.exit(0); }

// apply
mkdirSync(join(ROOT, dirname(ARCH)), { recursive: true }); git("mv", DOC, ARCH);
mkdirSync(join(ROOT, INTO), { recursive: true });
for (const f of outFiles) writeFileSync(join(ROOT, f.file), NL === "\r\n" ? f.text.replace(/\r?\n/g, "\r\n") : f.text);
const ip = join(ROOT, "docs", "INDEX.md"); let idx = readFileSync(ip, "utf8"); const inl = idx.includes("\r\n") ? "\r\n" : "\n"; idx = idx.replace(/\r\n/g, "\n");
const rel = (f) => f.replace(/^docs\//, "");
const rows = outFiles.map((f) => `| ${rel(f.file)} | ${f.g.titles[0].replace(/^Overview.*$/, "Overview")}${f.g.titles.length > 1 ? " (+" + (f.g.titles.length - 1) + " more sections)" : ""}. Read when: ${readWhen(f.g)} |`);
const oldRow = new RegExp(`^\\|\\s*[^|]*${basename(DOC).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|.*$`, "m");
idx = idx.replace(oldRow, `| ${rel(ARCH)} | Full text of ${basename(DOC)} before it was split into the design areas. Read only to dig into history. |`);
// put a block before "## Rules for this folder" when the index has that section, otherwise at the end
const put = (block) => { idx = /\n## Rules for this folder/.test(idx) ? idx.replace(/\n## Rules for this folder/, "\n" + block + "\n\n## Rules for this folder") : idx.replace(/\s*$/, "") + "\n\n" + block + "\n"; };
if (!idx.includes(rel(ARCH))) put(`## Before the split (history only)\n| File | Read when |\n|---|---|\n| ${rel(ARCH)} | Full text of ${basename(DOC)} before it was split into the design areas. Read only to dig into history. |`);
const head = "## Design areas (read only the area you are working on; find one by topic with docs-find.mjs)";
if (idx.includes("## Design areas")) idx = idx.replace(/(## Design areas[^\n]*\n\|[^\n]*\n\|[-| ]*\n(?:\|[^\n]*\n)*)/, (m) => m + rows.join("\n") + "\n");
else put(`${head}\n| File | Read when |\n|---|---|\n${rows.join("\n")}`);
writeFileSync(ip, inl === "\r\n" ? idx.replace(/\n/g, "\r\n") : idx);
git("add", "-A");
say(`\nDone (not committed). Next: check the "Read when:" lines, name the area docs in the plan steps that need them (Needs:), run docs-find.mjs --check, then commit.`);
