// Checks that the example project (examples/my-first-project) is a valid layout-v3 project for the shipped scripts:
// no layout warnings, handoff check OK, the right phase file and a small pickup. Runs on a copy in a throwaway folder.
// run: node tests/test_example.mjs   (workshop repo: node _workflow/tests/test_example.mjs)
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FLAT = !existsSync(join(resolve(HERE, "..", ".."), "_workflow", "installer"));
const ROOT = FLAT ? resolve(HERE, "..") : resolve(HERE, "..", "..");
const EXAMPLE = FLAT ? join(ROOT, "examples", "my-first-project") : join(ROOT, "_workflow", "installer", "public", "examples", "my-first-project");
const HOOKS = FLAT ? join(ROOT, "hooks") : join(ROOT, "_workflow", "claude", "hooks");
const TMP = mkdtempSync(join(tmpdir(), "project-workflow-test-example-"));
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "   -> " + String(d).slice(0, 400)}`); };
const claude = join(TMP, "claude"), projects = join(TMP, "projects"), app = join(projects, "my-first-project");
const env = { ...process.env, PROJECT_WORKFLOW_CLAUDE_DIR: claude, PROJECT_WORKFLOW_ROOT: projects, PROJECT_WORKFLOW_OWNER: "" };
const run = (script, args, input) => { try { return { code: 0, out: execFileSync("node", [join(HOOKS, script), ...args], { encoding: "utf8", env, input, stdio: ["pipe", "pipe", "pipe"] }) }; } catch (e) { return { code: e.status, out: (e.stdout || "") + (e.stderr || "") }; } };
try {
  check("the example project exists", existsSync(join(EXAMPLE, "docs", "INDEX.md")), EXAMPLE);
  mkdirSync(join(claude, "hooks"), { recursive: true }); cpSync(join(HOOKS, "rules-digest.md"), join(claude, "hooks", "rules-digest.md"));
  cpSync(EXAMPLE, app, { recursive: true });
  let r = run("pickup-context.mjs", [app]);
  check("pickup-context runs on it", r.code === 0, r.out);
  check("it is layout v3", /Docs layout: v3/.test(r.out));
  check("no docs layout warnings", !r.out.includes("DOCS LAYOUT CHECK"), (r.out.match(/DOCS LAYOUT CHECK[\s\S]{0,300}/) || [""])[0]);
  check("handoff check inside pickup is OK", /HANDOFF CHECK \(script\) ===\s+OK/.test(r.out), (r.out.match(/HANDOFF CHECK[\s\S]{0,200}/) || [""])[0]);
  check("current phase file is phase 1", r.out.includes("PHASE FILE for the current phase (docs/plan/phases/01-first-page.md)"));
  check("Read first files exist", /READ FIRST[\s\S]*docs\/plan\/phases\/01-first-page\.md\s+\(\d/.test(r.out) && !r.out.includes("MISSING"));
  const total = Number((/total: ([\d.]+) KB/.exec(r.out) || [])[1]);
  check("pickup budget is small (< 30 KB)", total > 0 && total < 30, String(total));
  check("the open decision is listed", /D2 \[open\]/.test(r.out));
  r = run("handoff-lint.mjs", [app]);
  check("handoff-lint says OK", r.code === 0 && r.out.includes("handoff OK"), r.out);
  r = run("project-workflow-status.mjs", []);
  check("status table shows it as v3 with 1/3 phases", r.code === 0 && /my-first-project\s.*v3\s+1\/3 phases/.test(r.out), r.out.split("\n").filter((l) => l.includes("my-first")).join(" | "));
  r = run("project-check.mjs", [], JSON.stringify({ cwd: app, source: "startup" }));
  let ctx = ""; try { ctx = JSON.parse(r.out).hookSpecificOutput.additionalContext; } catch { ctx = r.out; }
  check("start-up check shows the goal, the plan and the open decision", ctx.includes("I never know what to wear") && ctx.includes("1/3 phases") && ctx.includes("D2"), ctx.slice(0, 200));
  r = run("memory-rotate.mjs", [app]);
  check("month archive has nothing to do on a fresh project", r.code === 0 && r.out.includes("nothing to archive"), r.out);
} finally {
  rmSync(TMP, { recursive: true, force: true });
  console.log(existsSync(TMP) ? "CLEANUP FAILED" : "cleanup: throwaway folders removed");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
