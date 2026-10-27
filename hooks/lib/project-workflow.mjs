// Shared helpers for the Project Workflow (used by the SessionStart hook and project-workflow-status).
// Everything here is plain file parsing so the numbers come from code, not from a model's memory.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";

// Where things live. PROJECTS_ROOT = the folder that holds all projects (plus _template and _workflow).
// Order: env PROJECT_WORKFLOW_ROOT (used by tests) > "root" in ~/.claude/project-workflow-config.json (what the installer writes for other
// people) > ~/Projects.
export const HOME_CLAUDE = resolve(process.env.PROJECT_WORKFLOW_CLAUDE_DIR || join(homedir(), ".claude"));
function configuredRoot() {
  if (process.env.PROJECT_WORKFLOW_ROOT) return process.env.PROJECT_WORKFLOW_ROOT;
  try {
    const root = JSON.parse(readFileSync(join(HOME_CLAUDE, "project-workflow-config.json"), "utf8").replace(/^\uFEFF/, "")).root;
    if (typeof root === "string" && root.trim()) return root.trim();
  } catch {}
  return join(homedir(), "Projects");
}
export const PROJECTS_ROOT = resolve(configuredRoot());
// The person using the workflow ("the owner") and their options. Defaults: no name, both habits off. The
// installer writes explicit values for other people into ~/.claude/project-workflow-config.json: {"owner":"Sam","remoteControl":false,"renameChat":false}.
const settings = (() => { try { return JSON.parse(readFileSync(join(HOME_CLAUDE, "project-workflow-config.json"), "utf8").replace(/^﻿/, "")); } catch { return {}; } })();
export const OWNER = process.env.PROJECT_WORKFLOW_OWNER || (typeof settings.owner === "string" && settings.owner.trim()) || "the owner";
export const OPTIONS = { remoteControl: settings.remoteControl === true, renameChat: settings.renameChat === true };
/** Messages are written with {{OWNER}} / {{OWNER_UPPER}}; this puts the owner's name in just before they are printed. */
export const fillOwner = (text) => String(text).replaceAll("{{OWNER_UPPER}}", OWNER.toUpperCase()).replaceAll("{{OWNER}}", OWNER);
const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|html|css|cs|lua|luau|go|rs|java|kt|swift|vue|svelte|php|rb)$/i;
const SKIP_DIR = new Set(["node_modules", ".git", ".claude", "venv", ".venv", "dist", "build", ".next", "__pycache__"]);

export const read = (p) => { try { return readFileSync(p, "utf8").replace(/^\uFEFF/, ""); } catch { return ""; } };

// ---------- where a project keeps its documents ----------
// Layout v3 keeps them under docs/ (see _template/docs/INDEX.md); layout v2 kept them in the project root.
// Every reader asks docPath(), which prefers the v3 place and falls back to the v2 place, so a project works before and after it moves.
const DOC_HOME = { "PRODUCT.md": "docs/PRODUCT.md", "DECISIONS.md": "docs/DECISIONS.md", "PLAN.md": "docs/plan/BOARD.md" };
export function docPath(root, name) {
  const v3 = DOC_HOME[name] || `docs/reference/${name}`;
  return existsSync(join(root, v3)) ? join(root, v3) : join(root, name);
}
export const layoutOf = (root) => (existsSync(join(root, "docs", "INDEX.md")) || existsSync(join(root, "docs", "plan", "BOARD.md")) ? 3 : 2);
export const safeReaddir = (dir) => { try { return readdirSync(dir); } catch { return []; } };
export const sizeOf = (p) => { try { return statSync(p).size; } catch { return 0; } };
export const kb = (bytes) => Math.round(bytes / 102.4) / 10;

/** Phase detail file for a board phase title like "Phase 4 — Screens" (layout v3: docs/plan/phases/04-screens.md), or null. */
export function phaseFile(root, phaseTitle) {
  const id = (/Phase\s+(\d+[a-z]?)/i.exec(phaseTitle || "") || [])[1]?.toLowerCase();
  if (!id) return null;
  const dir = join(root, "docs", "plan", "phases");
  for (const n of safeReaddir(dir)) { const m = /^0*(\d+[a-z]?)[-_ ]/i.exec(n); if (m && m[1].toLowerCase() === id && n.endsWith(".md")) return join(dir, n); }
  return null;
}

/** Files named on "Read first:" lines inside the handoff's "Next steps" section (paths from the project root). */
export function readFirstFiles(handoffText) {
  const ns = /^##\s+[^\n]*next steps[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(handoffText || "");
  if (!ns) return [];
  const files = [];
  for (const m of ns[1].matchAll(/Read first:\s*([^\n]+)/gi)) {
    if (m[1].includes("<")) continue; // the template's placeholder line
    for (const part of m[1].split(/[,;]/)) { const f = part.replace(/[`*]/g, "").replace(/\(.*?\)/g, "").trim(); if (/\.[a-z]{2,4}$/i.test(f) && !/\s/.test(f)) files.push(f.replace(/^\.\//, "")); }
  }
  return [...new Set(files)];
}

const STRAY_ROOT_DOC = /^(PRODUCT|PLAN|DECISIONS|DESIGN|ARCHITECTURE|TESTING|TASKS|GATES|AUDIT|PRIOR_ART|SECURITY_CHECKLIST)\.md$/;
/** Layout v3 housekeeping (returns [] for layout v2): INDEX.md lists every doc, no loose doc files in the root, CLAUDE.md points to the index. */
export function lintLayout(root) {
  if (layoutOf(root) !== 3) return [];
  const w = []; const index = read(join(root, "docs", "INDEX.md"));
  if (!index) w.push("docs/INDEX.md is missing: every doc must be listed there with \"read when\"");
  const files = [];
  const walk = (dir, rel) => { for (const n of safeReaddir(dir)) {
    let st; try { st = statSync(join(dir, n)); } catch { continue; }
    if (st.isDirectory()) { if (n !== "phases" && n !== "archive") walk(join(dir, n), rel + n + "/"); }
    else if (/\.md$/i.test(n) && !(rel === "" && n === "INDEX.md")) files.push(rel + n);
  } };
  walk(join(root, "docs"), "");
  if (index) { const missing = files.filter((f) => !index.includes(f.split("/").pop())); if (missing.length) w.push(`docs/INDEX.md does not list: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ""}`); }
  const stray = safeReaddir(root).filter((n) => STRAY_ROOT_DOC.test(n));
  if (stray.length) w.push(`loose doc file(s) in the project root, move into docs/: ${stray.join(", ")}`);
  const claude = read(join(root, "CLAUDE.md"));
  if (claude && !claude.includes("docs/INDEX.md")) w.push("CLAUDE.md does not point to docs/INDEX.md (other Claude instances won't know where the docs are)");
  // design areas (docs/design/*.md): each starts with a "Read when:" line so a chat knows when to open it
  for (const f of files.filter((x) => x.startsWith("design/") && !/^design\/_/.test(x))) {
    const head = read(join(root, "docs", f)).split("\n").slice(0, 15).join("\n");
    if (!/^Read when:/im.test(head)) w.push(`docs/${f} has no "Read when:" line near the top (say when a chat should open it)`);
    else if (/make this line more precise/i.test(head)) w.push(`docs/${f}: its "Read when:" line is still the automatic one from the split: write when a chat really needs this file`);
  }
  // a step's "Needs:" must name files that exist
  const pdir = join(root, "docs", "plan", "phases");
  for (const n of safeReaddir(pdir).filter((x) => /\.md$/i.test(x) && !x.startsWith("_"))) for (const m of read(join(pdir, n)).matchAll(NEEDS_RE)) for (const f of m[1].matchAll(/`([^`]+)`/g)) if (!existsSync(join(root, f[1]))) w.push(`${n}: a step needs ${f[1]}, which does not exist`);
  return w;
}

// "Needs: `docs/design/combat.md`, `docs/design/items.md`." on a plan step: the docs that step must open (paths from the project root)
const NEEDS_RE = /Needs:((?:\s*`[^`]+`\s*,?)+)/g;
/** The docs the NEXT board step names with `Needs:` in its phase file (layout v3), or null when there is no such step. */
export function stepNeeds(root, plan) {
  if (!plan || !plan.next || plan.next.phaseOnly) return null;
  const id = (/^\S+/.exec(plan.next.title) || [])[0]; if (!id) return null;
  const phase = plan.phases.find((p) => p.steps.includes(plan.next)); const pf = phase && phaseFile(root, phase.title);
  if (!pf) return { id, files: [] };
  const line = new RegExp("\\*\\*\\s*" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b[^\\n]*").exec(read(pf));
  const files = []; if (line) for (const m of line[0].matchAll(NEEDS_RE)) for (const f of m[1].matchAll(/`([^`]+)`/g)) files.push(f[1].replace(/^\.\//, ""));
  return { id, files: [...new Set(files)] };
}

/** Documents in docs/ that are too big to open "just in case" (the always-read ones, phases, archive and INDEX have their own rules). */
export function oversizedDocs(root, limitBytes = 12 * 1024) {
  const out = [];
  const walk = (dir, rel) => { for (const n of safeReaddir(dir)) {
    let st; try { st = statSync(join(dir, n)); } catch { continue; }
    if (st.isDirectory()) { if (n !== "phases" && n !== "archive") walk(join(dir, n), rel + n + "/"); }
    else if (/\.md$/i.test(n) && !/^(INDEX|PRODUCT|DECISIONS)\.md$/.test(n) && rel !== "plan/" && st.size > limitBytes) out.push({ file: "docs/" + rel + n, kb: kb(st.size) });
  } };
  if (layoutOf(root) === 3) walk(join(root, "docs"), "");
  return out.sort((a, b) => b.kb - a.kb);
}

export function git(root, args) {
  try { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 6000, stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

export function currentTemplateVersion() {
  const v = parseInt(read(join(PROJECTS_ROOT, "_template", "VERSION")).trim(), 10);
  return Number.isFinite(v) ? v : 1;
}

export function projectVersion(root) {
  try { return JSON.parse(read(join(root, ".claude", "project-workflow.json"))).template ?? 0; } catch { return 0; }
}

export function hasCode(dir, depth = 0) {
  if (depth > 4) return false;
  let entries; try { entries = readdirSync(dir); } catch { return false; }
  for (const name of entries) {
    const p = join(dir, name); let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (!SKIP_DIR.has(name) && hasCode(p, depth + 1)) return true; }
    else if (CODE_EXT.test(name)) return true;
  }
  return false;
}

/** Which workflow project (if any) does this folder belong to? */
export function locate(cwd) {
  const rel = relative(PROJECTS_ROOT, resolve(cwd));
  if (rel === "") return { kind: "root", root: PROJECTS_ROOT, name: "projects folder" };
  if (rel.startsWith("..") || rel.includes(":")) return { kind: "outside" };
  const name = rel.split(sep)[0];
  if (name.startsWith(".")) return { kind: "outside" };
  if (name === "_template" || name === "_workflow") return { kind: "workshop", root: join(PROJECTS_ROOT, name), name };
  return { kind: "project", root: join(PROJECTS_ROOT, name), name };
}

// ---------- PLAN.md status board ----------
const MARK = { " ": "todo", "~": "doing", x: "done", "-": "dropped" };

/** Parses the "## Status board" section: top-level "- [ ] Phase ..." and nested "  - [x] 1.2 ..." lines. */
export function parsePlan(text) {
  const m = /^##\s+Status board[^\n]*\n([\s\S]*?)(?=^##\s|\s*$(?![\s\S]))/m.exec(text);
  if (!m) return null;
  const phases = []; let cur = null;
  for (const line of m[1].split("\n")) {
    const top = /^- \[( |~|x|-)\]\s+(.+?)\s*$/.exec(line);
    const sub = /^\s{2,}- \[( |~|x|-)\]\s+(.+?)\s*$/.exec(line);
    if (top) { cur = { mark: top[1], status: MARK[top[1]], title: top[2], steps: [] }; phases.push(cur); }
    else if (sub && cur) cur.steps.push({ mark: sub[1], status: MARK[sub[1]], title: sub[2] });
  }
  if (!phases.length) return null;
  const focus = (/^Focus:\s*(.+)$/m.exec(m[1]) || [])[1] || null;
  const open = (s) => s === "todo" || s === "doing";
  const curPhase = phases.find((p) => open(p.status)) || null;
  const nextStep = curPhase ? (curPhase.steps.find((s) => open(s.status)) || null) : null;
  const countable = phases.filter((p) => p.status !== "dropped");
  const stepsAll = phases.flatMap((p) => p.steps).filter((s) => s.status !== "dropped");
  const warnings = [];
  for (const p of phases) {
    const real = p.steps.filter((s) => s.status !== "dropped");
    if (p.status === "done" && real.some((s) => open(s.status))) warnings.push(`"${p.title}" is ticked done but has unfinished steps`);
    if (open(p.status) && real.length && real.every((s) => s.status === "done")) warnings.push(`all steps of "${p.title}" are done: tick the phase`);
  }
  return {
    focus, phases, now: curPhase, next: nextStep || (curPhase ? { title: curPhase.title, phaseOnly: true } : null),
    phasesDone: countable.filter((p) => p.status === "done").length, phasesTotal: countable.length,
    stepsDone: stepsAll.filter((s) => s.status === "done").length, stepsTotal: stepsAll.length, warnings,
  };
}

export function planSummary(plan) {
  if (!plan) return "No Status board in PLAN.md yet (run the `plan` skill to add one).";
  const out = [`Plan progress: ${plan.phasesDone}/${plan.phasesTotal} phases done` + (plan.stepsTotal ? `, ${plan.stepsDone}/${plan.stepsTotal} steps` : "") + "."];
  for (const p of plan.phases) {
    const real = p.steps.filter((s) => s.status !== "dropped"); const d = real.filter((s) => s.status === "done").length;
    out.push(`  [${p.mark}] ${p.title}` + (real.length ? `  (${d}/${real.length})` : ""));
  }
  if (plan.focus) out.push(`Focus set in the plan (parallel workstreams, {{OWNER}}-approved): ${plan.focus}`);
  if (plan.now) out.push(`First unfinished: ${plan.now.title}. Next step by board order: ${plan.next ? plan.next.title : "(none listed)"}.`);
  else out.push("Every phase is done or dropped.");
  for (const w of plan.warnings) out.push(`  ! ${w}`);
  return out.join("\n");
}

// ---------- DECISIONS.md ----------
/** Headings like "## D3 - Title   [decided 2026-10-07]" / "[open]" / "[proposed]" / "[superseded by D9]". */
export function parseDecisions(text) {
  const items = [];
  for (const m of text.matchAll(/^#{2,3}\s+((?:D|Q)\d+[a-z]?)\s*[-—–:.]*\s*(.+?)\s*\[(decided|open|proposed|superseded)([^\]]*)\]\s*$/gim))
    items.push({ id: m[1], title: m[2].trim(), status: m[3].toLowerCase(), note: m[4].trim() });
  return {
    items, open: items.filter((i) => i.status === "open"), proposed: items.filter((i) => i.status === "proposed"),
    decided: items.filter((i) => i.status === "decided").length,
  };
}

// ---------- handoff.md ----------
const SECTIONS = [["plan", /where we are in the plan|plan position/i], ["building", /what we.?re building/i], ["last", /last session/i],
  ["next", /next steps/i], ["waiting", /waiting on/i], ["gotchas", /gotchas/i]];

// files whose changes alone do not make a handoff "stale" (layout v2 root files and layout v3 docs/ files)
const BOOKKEEPING = /^(\.claude\/(handoff|memory|project-workflow)\.(md|json)|\.claude\/memory\/[^/]+\.md|PLAN\.md|DECISIONS\.md|PRODUCT\.md|AUDIT\.md|CLAUDE\.md|docs\/(INDEX|PRODUCT|DECISIONS)\.md|docs\/plan\/.+|docs\/reference\/(AUDIT\.md|archive\/.+))$/;

export function lintHandoff(root, plan) {
  const text = read(join(root, ".claude", "handoff.md")); const w = [];
  if (!text.trim()) return { exists: false, warnings: [], text: "" };
  if (text.includes("<project>")) return { exists: false, warnings: [], text: "", placeholder: true };
  const lines = text.split("\n");
  if (lines.length > 95) w.push(`handoff is ${lines.length} lines (limit ~90): rewrite it shorter, move history to memory.md`);
  const missing = SECTIONS.filter(([, rx]) => !lines.some((l) => /^##\s/.test(l) && rx.test(l))).map(([k]) => k);
  if (missing.length) w.push(`handoff is in the old format (missing sections: ${missing.join(", ")}): rewrite it with the handoff skill`);
  const ns = /^##\s+[^\n]*next steps[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(text);
  if (ns) {
    const nums = [...ns[1].matchAll(/^\s*(-?\d+)\.\s/gm)].map((x) => Number(x[1]));
    if (!nums.length) w.push("Next steps has no numbered list");
    else if (nums[0] !== 1 || nums.some((n, i) => n !== i + 1)) w.push(`Next steps numbering is ${nums.join(",")} (must be 1,2,3..: rewrite the list, don't stack patches)`);
  }
  if (layoutOf(root) === 3) {
    const rf = readFirstFiles(text);
    if (!rf.length) w.push('Next steps has no "Read first:" line (layout v3): name the 1-4 files the next session must open, e.g. "Read first: docs/plan/phases/04-screens.md"');
    for (const f of rf) if (!existsSync(join(root, f))) w.push(`"Read first:" names ${f}, which does not exist`);
    if (rf.length > 5) w.push(`"Read first:" names ${rf.length} files: keep it to 1-4 so the pickup stays small`);
  }
  const g = /^Git:.*$/im.exec(text);
  if (!g) w.push('handoff has no "Git:" line (branch @ hash)');
  else if (existsSync(join(root, ".git"))) {
    const h = /@\s*([0-9a-f]{7,40})/i.exec(g[0]);
    if (!h) w.push('Git: line has no "@ <hash>"');
    else {
      const head = git(root, ["rev-parse", "--short", "HEAD"]);
      if (head && !head.startsWith(h[1].slice(0, 7)) && !h[1].startsWith(head)) {
        const n = git(root, ["rev-list", "--count", `${h[1]}..HEAD`]);
        const files = git(root, ["diff", "--name-only", `${h[1]}..HEAD`]);
        // commits that only touch the workflow bookkeeping files (handoff, memory, plan board, decisions...) are not "work since"
        const docsOnly = files !== null && files.split("\n").filter(Boolean).every((f) => BOOKKEEPING.test(f));
        const subj = git(root, ["log", "--format=%s", "-3", `${h[1]}..HEAD`]);
        if (n === null) w.push(`handoff names commit ${h[1]} which is not in this repo's history`);
        else if (!docsOnly) w.push(`${n} commit(s) since the handoff was written${subj ? " (latest: " + subj.split("\n").join(" | ") + ")" : ""}: read them before trusting "Next steps"`);
      }
    }
  }
  const dirty = git(root, ["status", "--porcelain"]);
  if (dirty) w.push(`${dirty.split("\n").length} uncommitted file(s) in the working tree`);
  if (plan && !plan.focus && plan.next && !plan.next.phaseOnly && ns) {
    const id = /^\S+/.exec(plan.next.title)?.[0];
    if (id && !ns[1].includes(id) && !/why|because|reorder|decid/i.test(ns[1])) w.push(`plan's next step is "${plan.next.title}" but Next steps doesn't mention ${id}: say why it differs (decision/change log) or fix the order`);
  }
  const mtime = statSync(join(root, ".claude", "handoff.md")).mtimeMs;
  return { exists: true, warnings: w, text, ageDays: (Date.now() - mtime) / 864e5 };
}

// ---------- whole-project state ----------
export function projectState(root) {
  const claude = read(join(root, "CLAUDE.md"));
  const planText = read(docPath(root, "PLAN.md"));
  const plan = parsePlan(planText);
  const decisions = parseDecisions(read(docPath(root, "DECISIONS.md")));
  const ho = lintHandoff(root, plan);
  // some projects keep their repo in a subfolder (e.g. AI_Orcestration/ai_company): .claude/project-workflow.json {"repoPath": "ai_company"}
  let repoPath = ""; try { repoPath = JSON.parse(read(join(root, ".claude", "project-workflow.json"))).repoPath || ""; } catch {}
  const gitRoot = repoPath ? join(root, repoPath) : root;
  const isGit = existsSync(join(gitRoot, ".git"));
  return {
    root, hasClaudeMd: !!claude, isTemplate: claude.includes("<!-- TEMPLATE"), hasCode: hasCode(root),
    topEntries: (() => { try { return readdirSync(root).filter((n) => !n.startsWith(".")).length; } catch { return 0; } })(),
    hasAudit: existsSync(docPath(root, "AUDIT.md")), hasPriorArt: existsSync(docPath(root, "PRIOR_ART.md")),
    hasPlanFile: !!planText, plan, decisions, handoff: ho, isGit,
    remote: isGit ? git(gitRoot, ["remote", "get-url", "origin"]) : null,
    version: projectVersion(root), current: currentTemplateVersion(),
    product: read(docPath(root, "PRODUCT.md")),
    layout: layoutOf(root), layoutWarnings: lintLayout(root),
  };
}

/** One row per project folder, for the dashboard. */
export function collectProjects() {
  const rows = [];
  for (const name of readdirSync(PROJECTS_ROOT)) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const root = join(PROJECTS_ROOT, name); let st; try { st = statSync(root); } catch { continue; }
    if (!st.isDirectory()) continue;
    const s = projectState(root);
    let last = ""; if (s.isGit) last = git(root, ["log", "-1", "--format=%cs"]) || "";
    rows.push({ name, ...s, last });
  }
  return rows;
}
