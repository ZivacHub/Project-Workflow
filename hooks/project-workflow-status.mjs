// project-workflow-status: one table for every project + a check that the shared workflow is installed.
// Run from any terminal: project-workflow-status   (no model, no network: reads files and git only)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { collectProjects, currentTemplateVersion, read, HOME_CLAUDE, PROJECTS_ROOT } from "./lib/project-workflow.mjs";

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const rows = collectProjects(); const cur = currentTemplateVersion();

// ---- is the shared workflow installed? ----
const settings = read(join(HOME_CLAUDE, "settings.json"));
const needSkills = ["new-project", "project-audit", "handoff", "pickup", "plan", "project-sync", "prior-art", "find-skills"];
const checks = [
  ["Global rules (~/.claude/CLAUDE.md)", existsSync(join(HOME_CLAUDE, "CLAUDE.md"))],
  ["SessionStart hook registered", /project-check\.mjs/.test(settings)],
  ["Working-rules digest", existsSync(join(HOME_CLAUDE, "hooks", "rules-digest.md"))],
  ...needSkills.map((s) => [`Skill: ${s}`, existsSync(join(HOME_CLAUDE, "skills", s, "SKILL.md"))]),
  [`Template (_template/VERSION = ${cur})`, existsSync(join(PROJECTS_ROOT, "_template", "VERSION"))],
];
console.log("\nSHARED WORKFLOW (applies to every project automatically)");
for (const [n, ok] of checks) console.log(`  ${ok ? "OK  " : "MISSING"}  ${n}`);

console.log(`\nPROJECTS  (current template version: v${cur})`);
console.log(pad("Project", 26) + pad("Git/GitHub", 14) + pad("Setup", 12) + pad("Template", 10) + pad("Docs", 6) + pad("Plan", 18) + pad("Waiting", 9) + pad("Handoff", 18));
console.log("-".repeat(113));
const todo = [];
for (const r of rows) {
  const git = !r.isGit ? "no git" : r.remote ? "git+GitHub" : "git only";
  const setup = !r.hasClaudeMd ? (r.hasCode ? "NOT SET UP" : "no code yet") : r.isTemplate ? "planning" : "ready";
  const tpl = !r.hasClaudeMd ? "-" : r.version >= cur ? `v${r.version} ok` : `v${r.version || 0} OLD`;
  const plan = r.plan ? `${r.plan.phasesDone}/${r.plan.phasesTotal} phases` : r.hasPlanFile ? "no board" : "-";
  const wait = r.decisions.open.length + r.decisions.proposed.length;
  const ho = !r.handoff.exists ? "none" : `${r.handoff.ageDays.toFixed(0)}d old` + (r.handoff.warnings.length ? ` (${r.handoff.warnings.length} warn)` : "");
  const docs = !r.hasClaudeMd ? "-" : `v${r.layout}`;
  console.log(pad(r.name, 26) + pad(git, 14) + pad(setup, 12) + pad(tpl, 10) + pad(docs, 6) + pad(plan, 18) + pad(wait || "-", 9) + pad(ho, 18));
  if (r.hasClaudeMd && r.version < cur) todo.push(`${r.name}: template v${r.version || 0} -> v${cur}  (open it and say "sync", or run project-sync from the projects root)`);
  if (r.hasClaudeMd && r.hasPlanFile && !r.plan) todo.push(`${r.name}: PLAN.md has no Status board`);
  for (const w of r.handoff.warnings.slice(0, 3)) todo.push(`${r.name}: handoff: ${w}`);
  if (r.plan) for (const w of r.plan.warnings) todo.push(`${r.name}: plan: ${w}`);
  for (const w of r.layoutWarnings) todo.push(`${r.name}: docs: ${w}`);
  if (r.hasCode && !r.isGit) todo.push(`${r.name}: has code but no git`);
}
if (todo.length) { console.log("\nNEEDS ATTENTION"); for (const t of todo) console.log("  - " + t); }
else console.log("\nAll projects match the current workflow.");
console.log("");
