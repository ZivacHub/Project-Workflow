// SessionStart hook: tells Claude what state a workflow project is in and re-loads what keeps it on track
// (working rules, north star, plan progress, open decisions, last handoff). Computed by code, not recalled.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { locate, read, projectState, planSummary, collectProjects, lintHandoff, fillOwner, HOME_CLAUDE } from "./lib/project-workflow.mjs";

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "").trim() || "{}"); } catch {}
const cwd = input.cwd || process.cwd();
const source = input.source || "startup";
const where = locate(cwd);
if (where.kind === "outside" || where.kind === "workshop") process.exit(0);

// Claude Code replaces hook output over 10,000 characters with a 2,000-character preview, so everything must fit.
const LIMIT = 9400;
function fitHandoff(text, avail) {
  if (text.length <= avail) return text;
  const parts = text.split(/^(?=## )/m); // [header block, "## ..." sections]
  const head = parts[0]; const secs = parts.slice(1);
  const prio = (t) => /next steps/i.test(t) ? 0 : /waiting/i.test(t) ? 1 : /where we are/i.test(t) ? 2 : /last session/i.test(t) ? 3 : /building/i.test(t) ? 4 : /gotchas/i.test(t) ? 5 : 6;
  const keep = new Set(secs.map((_, i) => i)); const dropped = [];
  const size = () => head.length + [...keep].reduce((n, i) => n + secs[i].length, 0);
  while (size() > avail && keep.size) {
    const worst = [...keep].sort((a, b) => prio(secs[b]) - prio(secs[a]))[0];
    keep.delete(worst); dropped.push(secs[worst].split("\n")[0].replace(/^##\s*/, ""));
  }
  let body = head + secs.filter((_, i) => keep.has(i)).join("");
  if (body.length > avail) body = body.slice(0, avail);
  return body.trim() + `\n\n(Left out to fit the 10,000-character hook limit: ${dropped.join("; ") || "tail"}. Read .claude/handoff.md for the full file.)`;
}
const digest = read(join(HOME_CLAUDE, "hooks", "rules-digest.md")).trim();
// Only where the installer ran (it writes project-workflow-install.json): once a day, is a newer workflow version out? One line, or "".
let updateLine = "";
if (existsSync(join(HOME_CLAUDE, "project-workflow-install.json"))) { try { updateLine = await (await import("./lib/update-check.mjs")).updateNotice(); } catch {} }
const out = [];
// Chat title: "<Project> · <next step> · 15 Oct 10:52" so chats are told apart (only for brand-new chats, not resume/compact).
let title = "";
const stamp = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const shorten = (t, n) => { t = String(t || "").replace(/\s*\(.*$/, "").trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; };
const emit = () => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: fillOwner(out.join("\n")), ...(title && source === "startup" ? { sessionTitle: title } : {}) } }));

// ---- projects root: the workshop for templates and workflow ----
if (where.kind === "root") {
  const rows = collectProjects();
  out.push("[Workflow workshop] You are in the projects root: this is where {{OWNER}} edits templates (_template), the shared workflow (global skills, hooks, CLAUDE.md) and checks all projects. Project work belongs in each project's own folder.",
    "Project overview (computed just now; run `project-workflow-status` in a terminal for the same table):");
  for (const r of rows) {
    const bits = [r.isGit ? (r.remote ? "git+remote" : "git(no remote)") : "no git", r.hasClaudeMd ? `template v${r.version || "?"}/${r.current}` : "no CLAUDE.md",
      r.plan ? `plan ${r.plan.phasesDone}/${r.plan.phasesTotal} phases` : (r.hasPlanFile ? "plan w/o board" : "no plan"),
      r.decisions.open.length + r.decisions.proposed.length ? `${r.decisions.open.length + r.decisions.proposed.length} decisions waiting` : "",
      r.handoff.exists ? `handoff ${r.handoff.ageDays.toFixed(0)}d old` : "no handoff"].filter(Boolean);
    out.push(`  - ${r.name}: ${bits.join(", ")}`);
  }
  out.push("After changing a template or shared skill: bump _template/VERSION and run the `project-sync` skill so existing projects are brought up to date (with {{OWNER}}'s OK).");
  if (updateLine) out.push(updateLine);
  if (digest) out.push("", digest);
  const wh = lintHandoff(where.root, null);
  if (wh.exists) {
    if (wh.warnings.length) out.push("", "WORKSHOP HANDOFF CHECK (computed by script):", ...wh.warnings.map((w) => "  ! " + w));
    out.push("", "Workshop handoff (.claude/handoff.md): where the workflow work stopped.", "", fitHandoff(wh.text.trim(), LIMIT - out.join("\n").length - 420));
  }
  title = `Workflow workshop · ${stamp()}`;
  emit(); process.exit(0);
}

// ---- a project folder ----
const s = projectState(where.root);
out.push(`[Project Workflow check] Project: ${where.name}`);

if (source === "compact") {
  out.push("Context was just compacted. The working rules, plan position and open decisions are repeated below so they aren't lost. Before continuing, run the `handoff` skill (rewrite .claude/handoff.md, append finished work to .claude/memory.md), then carry on. This chat continues, so do NOT switch Remote Control off.");
} else if (!s.hasClaudeMd && !s.hasCode && s.topEntries > 2) {
  out.push("This folder has files but no code and no CLAUDE.md (documents, notes?). Ask {{OWNER}} what the folder is for before setting anything up; use the `new-project` skill if it becomes a project, and never publish it to GitHub without his explicit OK.");
} else if (!s.hasClaudeMd && !s.hasCode) {
  out.push("Empty/new project with no CLAUDE.md. When {{OWNER}} describes the idea, use the `new-project` skill (detailed interview, no decisions without {{OWNER}}, then PLAN.md).");
} else if (!s.hasClaudeMd && s.hasCode) {
  out.push("Existing code but NOT set up (no CLAUDE.md). Before other work, tell {{OWNER}} in one line, then run the `project-audit` skill in onboarding mode: it writes CLAUDE.md from the template, runs find-skills + prior-art, and produces AUDIT.md.");
} else if (s.isTemplate) {
  out.push("CLAUDE.md still has the TEMPLATE marker: resume the `new-project` skill where it stopped.");
} else if (s.hasCode && !s.hasAudit) {
  out.push("Project has code but no AUDIT.md yet. Before other work, tell {{OWNER}} in one line, then run the `project-audit` skill (first-run audit).");
} else {
  out.push("Set up. Skills listed in CLAUDE.md are approved for this project: use them, don't refuse or skip them. If {{OWNER}} says continue/pickup, run the `pickup` skill.");
}

if (!s.isGit) out.push("NOT a git repo yet. Offer to `git init` + first commit (push only after {{OWNER}} names the repo/visibility).");
else if (!s.remote) out.push("Git repo has no GitHub remote yet: offer to create a private one (`gh repo create`), after a secrets check.");
if (s.hasClaudeMd && s.version < s.current) out.push(`Template drift: this project is on workflow template v${s.version || 0}, current is v${s.current}. Offer the \`project-sync\` skill (shows what changes, applies after {{OWNER}}'s OK).`);
if (s.hasClaudeMd && !s.hasPriorArt && source !== "compact") out.push("No PRIOR_ART.md yet: offer (one line) to run the `prior-art` skill.");

if (s.layout === 3 && s.hasClaudeMd) {
  out.push("DOCS LAYOUT v3: this project's documents are in docs/ (docs/INDEX.md says what each file is and when to read it). Read only what is loaded here + the current phase file (docs/plan/phases/) + the files on the handoff's \"Read first:\" line; everything else on demand.");
  for (const w of s.layoutWarnings.slice(0, 3)) out.push("  ! " + w);
}

if (updateLine) out.push(updateLine);
if (digest) out.push("", digest);

if (s.product.trim() && !s.product.includes("<project")) {
  let p = s.product.trim();
  if (p.length > 2300) p = p.slice(0, 2300).replace(/\n[^\n]*$/, "") + "\n...(rest in PRODUCT.md)";
  out.push("", "NORTH STAR (PRODUCT.md, first lines): re-read before choosing what to do next.", p);
}

if (s.hasPlanFile) {
  out.push("", planSummary(s.plan));
  if (s.plan?.next && !s.plan.next.phaseOnly) out.push(`Plan order rule: next = ${s.plan.next.title}. Anything else needs {{OWNER}}'s OK.`);
}
const waiting = [...s.decisions.open, ...s.decisions.proposed];
if (waiting.length) {
  out.push("", `Decisions waiting on {{OWNER}} (${waiting.length}): ` + waiting.map((d) => `${d.id} ${d.title} [${d.status}]`).join("; ") + ". Present them as choice cards when relevant; never treat them as decided.");
}

if (source !== "compact") {
  if (s.handoff.exists) {
    if (s.handoff.warnings.length) out.push("", "HANDOFF CHECK (computed by script):", ...s.handoff.warnings.map((w) => "  ! " + w));
    const used = out.join("\n").length;
    const avail = LIMIT - used - 420;
    out.push("", "Last session's handoff (.claude/handoff.md). Verify it against the plan and git, then continue from 'Next steps' unless {{OWNER}} says otherwise:", "", fitHandoff(s.handoff.text.trim(), avail));  } else if (s.hasClaudeMd) {
    out.push("", "No handoff saved yet. Run the `handoff` skill at milestones and before the session ends.");
  }
}
title = `${where.name} · ${s.plan && s.plan.next ? shorten(s.plan.next.title, 34) : (s.hasClaudeMd ? "work" : "set up")} · ${stamp()}`;
emit();
