// usage: node handoff-lint.mjs <project folder>   — checks .claude/handoff.md against the plan board and git.
import { resolve, join } from "node:path";
import { lintHandoff, parsePlan, read, docPath } from "./lib/project-workflow.mjs";

const root = resolve(process.argv[2] || process.cwd());
const plan = parsePlan(read(docPath(root, "PLAN.md")));
const r = lintHandoff(root, plan);
if (!r.exists) { console.log(r.placeholder ? "handoff.md still has the template placeholder" : "no .claude/handoff.md"); process.exit(1); }
if (!r.warnings.length) { console.log("handoff OK: format, numbering, git hash and plan position all check out."); process.exit(0); }
console.log(`handoff has ${r.warnings.length} warning(s):`);
for (const w of r.warnings) console.log("  - " + w);
process.exit(2);
