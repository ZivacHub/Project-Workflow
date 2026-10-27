// usage: node pickup-context.mjs "<project folder>"
// Everything a fresh chat needs about one project, in one go (used by the pickup skill, which must also
// list the files it read). Unlike the SessionStart hook this is not limited to 10,000 characters.
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { OWNER, OPTIONS, fillOwner, locate, read, projectState, planSummary, git, PROJECTS_ROOT, collectProjects, lintHandoff, currentTemplateVersion, docPath, phaseFile, readFirstFiles, safeReaddir, sizeOf, kb, HOME_CLAUDE, stepNeeds, oversizedDocs } from "./lib/project-workflow.mjs";

// the owner and the personal options (read by the pickup/handoff skills before they do anything else)
if (process.argv.includes("--options")) { console.log(`owner=${OWNER} root=${PROJECTS_ROOT} remoteControl=${OPTIONS.remoteControl ? "on" : "off"} renameChat=${OPTIONS.renameChat ? "on" : "off"}`); process.exit(0); }

const folder = resolve(process.argv[2] || process.cwd());
const where = locate(folder);

// The projects root (or _template / _workflow) is the workshop, not a project: no PRODUCT.md or plan board,
// so show the project table, the workshop handoff, the template changelog and the shared-workflow documents.
if (where.kind === "root" || where.kind === "workshop") {
  const root = PROJECTS_ROOT;
  const wo = [];
  const trim = (t, n) => (t.length > n ? t.slice(0, n) + "\n...(cut, read the file)" : t);
  const isGit = !!git(root, ["rev-parse", "--is-inside-work-tree"]);
  wo.push(`PROJECT: Workflow workshop (templates + shared workflow, not a project)   folder: ${root}`);
  wo.push(`Template: current v${currentTemplateVersion()}.  Git: ${isGit ? (git(root, ["remote", "get-url", "origin"]) || "no remote") : "no git"}.`);
  wo.push("", read(join(HOME_CLAUDE, "hooks", "rules-digest.md")).trim());

  wo.push("", "=== PROJECTS (computed now) ===");
  for (const r of collectProjects()) {
    const bits = [r.isGit ? (r.remote ? "git+remote" : "git(no remote)") : "no git", r.hasClaudeMd ? `template v${r.version || "?"}/${r.current}` : "no CLAUDE.md",
      r.plan ? `plan ${r.plan.phasesDone}/${r.plan.phasesTotal} phases` : (r.hasPlanFile ? "plan w/o board" : "no plan"),
      r.decisions.open.length + r.decisions.proposed.length ? `${r.decisions.open.length + r.decisions.proposed.length} decisions waiting` : "",
      r.handoff.exists ? `handoff ${r.handoff.ageDays.toFixed(0)}d old` : "no handoff"].filter(Boolean);
    wo.push(`  - ${r.name}: ${bits.join(", ")}`);
  }

  const wh = lintHandoff(root, null);
  if (wh.exists) {
    wo.push("", "=== HANDOFF CHECK (script) ===", ...(wh.warnings.length ? wh.warnings.map((w) => "  ! " + w) : ["  OK"]));
    wo.push("", "=== .claude/handoff.md (workshop) ===", trim(wh.text.trim(), 9000));
  } else wo.push("", "=== .claude/handoff.md: none ===");

  const wmem = read(join(root, ".claude", "memory.md")).trim();
  if (wmem) { const parts = wmem.split(/^(?=## )/m).filter((p) => p.startsWith("##")); wo.push("", `=== .claude/memory.md: last 2 of ${parts.length} entries ===`, trim(parts.slice(-2).join("\n"), 3500)); }

  const cl = read(join(root, "_template", "CHANGELOG.md")).trim();
  if (cl) wo.push("", "=== _template/CHANGELOG.md (top) ===", trim(cl, 2500));

  if (isGit) wo.push("", "=== GIT ===", git(root, ["status", "-sb"]) || "", git(root, ["log", "--oneline", "-6"]) || "");

  const wdocs = [];
  const addW = (dir, rel = "") => { try { for (const n of readdirSync(dir)) { const st = statSync(join(dir, n)); if (st.isFile() && /\.(md|txt)$/i.test(n)) wdocs.push({ rel: rel + n, kb: Math.round(st.size / 102.4) / 10, days: Math.round((Date.now() - st.mtimeMs) / 864e5) }); } } catch {} };
  addW(root); addW(join(root, ".claude"), ".claude/"); addW(join(root, "_template"), "_template/"); addW(join(root, "_workflow"), "_workflow/"); addW(join(root, "_workflow", "claude"), "_workflow/claude/");
  wo.push("", `=== DOCUMENTS in the workshop (${wdocs.length}): read the ones that touch the next step ===`);
  for (const d of wdocs.sort((a, b) => a.rel.localeCompare(b.rel))) wo.push(`  ${d.rel}  (${d.kb} KB, changed ${d.days}d ago)`);
  wo.push("  (also: global rules ~/.claude/CLAUDE.md, ~/.claude/TOOLS.md, skills in ~/.claude/skills, hooks in ~/.claude/hooks)");

  wo.push("", "NEXT: the workshop has no plan board; the next step is step 1 of the handoff's \"Next steps\". Read the files above that matter for it, then brief {{OWNER}} and END the briefing with a line `Files read: ...` listing what you actually opened.");
  console.log(fillOwner(trim(wo.join("\n"), 26000)));
  process.exit(0);
}

if (where.kind !== "project") { console.log(`Not a workflow project folder: ${folder} (kind: ${where.kind}).`); process.exit(1); }
const root = where.root;
const s = projectState(root);
const out = [];
const cap = (t, n) => (t.length > n ? t.slice(0, n) + "\n...(cut, read the file)" : t);
const sh = (n) => `${n}`;
/** INDEX.md as short lines "file - when to read it", cut at a row boundary (never in the middle of a row), so a big project's index is not lost to a character cap. */
function compactIndex(text, limit) {
  const lines = []; let skip = false, total = 0, dropped = 0;
  for (const raw of text.split("\n")) {
    const l = raw.replace(/\r$/, "").trim(); if (!l || /^\|[\s|:-]+\|$/.test(l) || /^\|\s*File\s*\|/i.test(l)) continue;
    if (/^#{1,3}\s/.test(l)) { skip = /^#{2,3}\s+Rules/i.test(l); if (!skip && !/^#\s/.test(l)) lines.push(l.replace(/^#+\s*/, "")); continue; }
    if (skip) continue;
    const m = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|?$/.exec(l); if (!m) continue;
    const row = `  ${m[1]} - ${m[2].replace(/\s*\|\s*$/, "").slice(0, 120)}`;
    if (total + row.length > limit) { dropped++; continue; }
    lines.push(row); total += row.length + 1;
  }
  if (dropped) lines.push(`  (+${dropped} more rows: open docs/INDEX.md, or find by topic: node ~/.claude/hooks/docs-find.mjs "<topic>")`);
  return lines.join("\n");
}

out.push(`PROJECT: ${where.name}   folder: ${root}`);
out.push(`Template: v${s.version || 0} (current v${s.current}).  Docs layout: v${s.layout}${s.layout === 3 ? " (documents in docs/)" : " (documents in the project root)"}.  Git: ${s.isGit ? (s.remote || "no remote") : "no git"}.`);
out.push("", read(join(HOME_CLAUDE, "hooks", "rules-digest.md")).trim());

if (s.product.trim()) out.push("", "=== PRODUCT.md (the goal) ===", cap(s.product.trim(), 6000));
else out.push("", "=== PRODUCT.md: MISSING ===");

out.push("", "=== PLAN PROGRESS (computed from PLAN.md Status board) ===", planSummary(s.plan));

// the detail of the next step: layout v3 = the current phase's own file; layout v2 = cut out of the big PLAN.md
const planText = read(docPath(root, "PLAN.md"));
const rel = (p) => relative(root, p).replace(/\\/g, "/");
const phasePath = s.layout === 3 && s.plan?.now ? phaseFile(root, s.plan.now.title) : null;
if (phasePath) out.push("", `=== PHASE FILE for the current phase (${rel(phasePath)}) ===`, cap(read(phasePath).trim(), 7000));
else if (s.layout === 3 && s.plan?.now) out.push("", `=== no phase file found for "${s.plan.now.title}": create docs/plan/phases/NN-name.md (plan skill) ===`);
else if (s.plan?.next && !s.plan.next.phaseOnly && planText) {
  const id = /^\S+/.exec(s.plan.next.title)?.[0];
  const after = planText.split(/^## Rules for this plan/m).slice(1).join("\n") || planText;
  const lines = after.split("\n"); const esc = id.replace(/\./g, "\\.");
  const i = lines.findIndex((l) => new RegExp(`(^|[\\s*\\-|])${esc}(\\b|[ .*])`).test(l) && !/^\s*- \[/.test(l));
  if (i >= 0) out.push("", `=== PLAN detail for the next step (${id}) ===`, cap(lines.slice(i, i + 5).join("\n"), 1600));
}

// what the handoff says to open first for the next step (layout v3), and how much a pickup reads whole
const readFirst = s.handoff.exists ? readFirstFiles(s.handoff.text) : [];
if (readFirst.length) out.push("", "=== READ FIRST (named by the handoff for the next step) ===", ...readFirst.map((f) => `  ${f}  (${existsSync(join(root, f)) ? kb(sizeOf(join(root, f))) + " KB" : "MISSING"})`));
// the docs the next board step names with `Needs:` (layout v3): open these, not the whole docs/ folder
const needs = s.layout === 3 ? stepNeeds(root, s.plan) : null;
if (needs && needs.files.length) out.push("", `=== NEXT STEP ${needs.id} NEEDS (named in its phase file with Needs:) ===`, ...needs.files.map((f) => `  ${f}  (${existsSync(join(root, f)) ? kb(sizeOf(join(root, f))) + " KB" : "MISSING"})`));
else if (needs && s.layout === 3 && existsSync(join(root, "docs", "design"))) out.push("", `=== NEXT STEP ${needs.id} names no docs (no Needs: on its line): ask which area docs it touches with: node ~/.claude/hooks/docs-find.mjs "<topic>" ===`);
const always = ["CLAUDE.md", rel(docPath(root, "PRODUCT.md")), rel(docPath(root, "PLAN.md")), rel(docPath(root, "DECISIONS.md")), ".claude/handoff.md"].filter((f) => existsSync(join(root, f)));
const nextStep = [...new Set([phasePath ? rel(phasePath) : null, ...readFirst, ...(needs ? needs.files : [])].filter((f) => f && existsSync(join(root, f))))];
const sum = (files) => files.reduce((n, f) => n + sizeOf(join(root, f)), 0);
out.push("", "=== READ BUDGET (documents a pickup opens whole; target <= 30 KB) ===",
  `  always: ${kb(sum(always))} KB  (${always.map((f) => f.split("/").pop()).join(", ")})`,
  `  for the next step: ${kb(sum(nextStep))} KB  (${nextStep.length ? nextStep.map((f) => f.split("/").pop()).join(", ") : "none named"})`,
  `  total: ${kb(sum(always) + sum(nextStep))} KB` + (s.layout === 3 ? "" : "   [layout v2: the whole plan file counts because phase detail lives inside it]"));


const waiting = [...s.decisions.open, ...s.decisions.proposed];
out.push("", `=== DECISIONS waiting on {{OWNER}}: ${waiting.length} ===`);
for (const d of waiting) out.push(`  ${d.id} [${d.status}] ${d.title}`);
out.push(`  (decided: ${s.decisions.decided})`);

if (s.handoff.exists) {
  out.push("", "=== HANDOFF CHECK (script) ===", ...(s.handoff.warnings.length ? s.handoff.warnings.map((w) => "  ! " + w) : ["  OK"]));
  out.push("", "=== .claude/handoff.md ===", cap(s.handoff.text.trim(), 9000));
} else out.push("", "=== .claude/handoff.md: none ===");

const mem = read(join(root, ".claude", "memory.md")).trim();
if (mem) { const parts = mem.split(/^(?=## )/m).filter((p) => p.startsWith("##")); out.push("", `=== .claude/memory.md: last 2 of ${parts.length} entries ===`, cap(parts.slice(-2).join("\n"), 3500)); }
const archived = safeReaddir(join(root, ".claude", "memory")).filter((n) => n.endsWith(".md")).sort();
if (archived.length) out.push(`  (older months are archived in .claude/memory/: ${archived.join(", ")}; read one only when digging into the past)`);

if (s.isGit) {
  out.push("", "=== GIT ===", git(root, ["status", "-sb"]) || "", git(root, ["log", "--oneline", "-6"]) || "");
}



// inventory of project documents so nothing relevant is overlooked
const docs = [];
const add = (dir, rel = "", deep = false) => { try { for (const n of readdirSync(dir)) { const p = join(dir, n); const st = statSync(p); if (st.isFile() && /\.(md|txt)$/i.test(n)) docs.push({ rel: (rel + n), kb: Math.round(st.size / 102.4) / 10, days: Math.round((Date.now() - st.mtimeMs) / 864e5) }); else if (deep && st.isDirectory()) add(p, rel + n + "/", deep); } } catch {} };
add(root); add(join(root, "docs"), "docs/", s.layout === 3); add(join(root, ".claude"), ".claude/");
if (s.layout === 3) {
  out.push("", "=== docs/INDEX.md, compact (file - when to read it; the full list is the file itself) ===", compactIndex(read(join(root, "docs", "INDEX.md")), 4500) || "(missing)");
  if (s.layoutWarnings.length) out.push("", "=== DOCS LAYOUT CHECK (script) ===", ...s.layoutWarnings.map((w) => "  ! " + w));
  const big = oversizedDocs(root);
  if (big.length) out.push("", "=== BIG DOCS (over 12 KB: split them so a chat opens only the part it needs: /docs split <file>) ===", ...big.slice(0, 6).map((b) => `  ${b.file}  (${b.kb} KB)`));
}
if (s.layout === 3) out.push("", `=== DOCUMENTS: ${docs.filter((d) => d.rel.startsWith("docs/")).length} files under docs/ (all listed in docs/INDEX.md). Find the right ones for a topic: node ~/.claude/hooks/docs-find.mjs "<topic>" ===`);
else {
  out.push("", `=== DOCUMENTS in the project (${docs.length}): read the ones that touch the next step ===`);
  for (const d of docs.sort((a, b) => a.rel.localeCompare(b.rel))) out.push(`  ${d.rel}  (${d.kb} KB, changed ${d.days}d ago)`);
}

// files the handoff / plan next-step / open decisions point at
const pointers = new Set();
const scan = (t) => { for (const m of t.matchAll(/[A-Za-z0-9_][A-Za-z0-9_\-./]*\.(?:md|json|txt|bat|mjs|py|js|html|yml|yaml|toml)\b/g)) pointers.add(m[0].replace(/^\.\//, "")); };
scan(s.handoff.text || ""); scan(waiting.map((d) => d.title).join(" "));
const refs = [...pointers].filter((f) => existsSync(join(root, f)) && !/^(PRODUCT|PLAN|DECISIONS)\.md$|^\.claude\/(handoff|memory)\.md$/.test(f));
if (refs.length) out.push("", "=== FILES NAMED in the handoff (also read the relevant ones) ===", ...refs.slice(0, 25).map((f) => "  " + f));

out.push("", "NEXT: read the files above that matter for the next step, then brief {{OWNER}} and END the briefing with a line `Files read: ...` listing what you actually opened.");
console.log(fillOwner(cap(out.join("\n"), 26000)));
