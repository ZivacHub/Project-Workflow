// Tests the Project Workflow installer (install.mjs; in the workshop repo _workflow/installer/install.mjs) end to end, only in throwaway folders:
// a fake ~/.claude (--claude-dir) and a fake projects folder (--root). Nothing of the real ~/.claude or projects folder is touched.
// run: node tests/test_installer.mjs   (workshop repo: node _workflow/tests/test_installer.mjs)
import { execFile, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
// two layouts: the workshop repo (_workflow/installer, _workflow/claude, _template) and the flat public package (install.mjs at the top)
const FLAT = !existsSync(join(resolve(HERE, "..", ".."), "_workflow", "installer"));
const ROOT = FLAT ? resolve(HERE, "..") : resolve(HERE, "..", "..");
const execFileAsync = promisify(execFile);
const TMP = mkdtempSync(join(tmpdir(), "project-workflow-test-installer-"));
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "   -> " + String(d).slice(0, 400)}`); };
const j = (f) => JSON.parse(readFileSync(f, "utf8"));
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const snap = (dir) => { const m = {}; if (!existsSync(dir)) return m; const w = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) w(p); else m[relative(dir, p).replace(/\\/g, "/")] = sha(p); } }; w(dir); return m; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// a private copy of the package, laid out like the workshop repo (the manifest uses ../claude and ../../_template)
const PKG = join(TMP, "pkg");
for (const p of FLAT ? ["install.mjs", "manifest.json", "VERSION", "CHANGELOG.md", "global-rules.md", "skills", "hooks", "template"] : ["_workflow/installer", "_workflow/claude/skills", "_workflow/claude/hooks", "_template"]) cpSync(join(ROOT, p), join(PKG, p), { recursive: true });
const inPkg = (name) => (FLAT ? join(PKG, name) : join(PKG, "_workflow", "installer", name));   // installer files: VERSION, CHANGELOG.md, manifest.json
const skillInPkg = (name) => (FLAT ? join(PKG, "skills", name, "SKILL.md") : join(PKG, "_workflow", "claude", "skills", name, "SKILL.md"));
const INSTALLER = inPkg("install.mjs");
const run = (args, env = {}) => { try { return { code: 0, out: execFileSync("node", [INSTALLER, ...args], { encoding: "utf8", env: { ...process.env, PROJECT_WORKFLOW_CLAUDE_DIR: "", PROJECT_WORKFLOW_ROOT: "", ...env }, stdio: ["ignore", "pipe", "pipe"] }) }; } catch (e) { return { code: e.status, out: (e.stdout || "") + (e.stderr || "") }; } };
const world = (name) => { const base = join(TMP, name); const claude = join(base, "claude"), root = join(base, "projects"); mkdirSync(base, { recursive: true }); return { base, claude, root, args: (...more) => ["--claude-dir", claude, "--root", root, "--owner", "Sam", "--yes", ...more] }; };
const SKILLS = ["pickup", "handoff", "plan", "new-project", "project-audit", "project-sync", "prior-art", "info", "update-workflow"];

try {
  // ---------- 1. fresh install ----------
  const w1 = world("fresh");
  let r = run(["install", ...w1.args()]);
  check("fresh install exits 0", r.code === 0, r.out);
  check("all 8 skills installed", SKILLS.every((s) => existsSync(join(w1.claude, "skills", s, "SKILL.md"))));
  check("scripts installed (incl. update check)", ["project-check.mjs", "pickup-context.mjs", "handoff-lint.mjs", "project-workflow-status.mjs", "memory-rotate.mjs", "rules-digest.md", "lib/project-workflow.mjs", "lib/update-check.mjs"].every((f) => existsSync(join(w1.claude, "hooks", f))));
  check("template copied into their projects folder with VERSION 3", existsSync(join(w1.root, "_template", "docs", "INDEX.md")) && readFileSync(join(w1.root, "_template", "VERSION"), "utf8").trim() === "3");
  check("short README created in their projects folder", existsSync(join(w1.root, "README.md")));
  const st = j(join(w1.claude, "settings.json"));
  check("settings.json has the start-up check exactly once", st.hooks.SessionStart.length === 1 && st.hooks.SessionStart[0].hooks[0].command.includes("project-check.mjs"), JSON.stringify(st));
  const claudeMd = readFileSync(join(w1.claude, "CLAUDE.md"), "utf8");
  check("CLAUDE.md has the rules block once, without a personal name", (claudeMd.match(/PROJECT-WORKFLOW:BEGIN/g) || []).length === 1 && claudeMd.includes("PROJECT-WORKFLOW:END") && !/Alex/.test(claudeMd));
  const cfg = j(join(w1.claude, "project-workflow-config.json"));
  check("config: owner, root, both personal habits off", cfg.owner === "Sam" && cfg.root.replace(/\\/g, "/") === w1.root.replace(/\\/g, "/") && cfg.remoteControl === false && cfg.renameChat === false, JSON.stringify(cfg));
  const inst = j(join(w1.claude, "project-workflow-install.json"));
  check("install record: version and owned files with hashes", inst.version === readFileSync(inPkg("VERSION"), "utf8").trim() && Object.keys(inst.files).length > 20, Object.keys(inst.files).length);
  const env1 = { PROJECT_WORKFLOW_CLAUDE_DIR: w1.claude, PROJECT_WORKFLOW_ROOT: "" };
  const opt = execFileSync("node", [join(w1.claude, "hooks", "pickup-context.mjs"), "--options"], { encoding: "utf8", env: { ...process.env, ...env1 } }).trim();
  check("installed scripts run and know the owner and the folder", /^owner=Sam root=.*projects remoteControl=off renameChat=off$/.test(opt), opt);
  const hook = execFileSync("node", [join(w1.claude, "hooks", "project-check.mjs")], { encoding: "utf8", input: JSON.stringify({ cwd: w1.root, source: "startup" }), env: { ...process.env, ...env1 } });
  const ctx = JSON.parse(hook).hookSpecificOutput.additionalContext;
  check("installed start-up check works at their root and never says Alex", ctx.includes("[Workflow workshop]") && ctx.includes("Sam") && !/Alex/.test(ctx.replace(/Users[\\/]+Alex/g, "")), ctx.slice(0, 200));
  const before = { c: snap(w1.claude), r: snap(w1.root) };

  // ---------- 2. idempotent, check, dry run ----------
  r = run(["install", ...w1.args()]);
  check("second install changes nothing", r.code === 0 && same(before.r, snap(w1.root)) && Object.keys(before.c).filter((k) => !k.startsWith("project-workflow-")).every((k) => before.c[k] === snap(w1.claude)[k]), r.out);
  const st2 = j(join(w1.claude, "settings.json")), md2 = readFileSync(join(w1.claude, "CLAUDE.md"), "utf8");
  check("still one hook entry and one rules block", st2.hooks.SessionStart.length === 1 && (md2.match(/PROJECT-WORKFLOW:BEGIN/g) || []).length === 1);
  r = run(["check", "--claude-dir", w1.claude]);
  check("check says all good", r.code === 0 && r.out.includes("All good."), r.out);
  const w0 = world("dry");
  r = run(["install", ...w0.args("--dry-run")]);
  check("dry run prints the plan and writes nothing", r.code === 0 && r.out.includes("dry run") && !existsSync(w0.claude) && !existsSync(w0.root), r.out);

  // ---------- 3. check finds problems ----------
  rmSync(join(w1.claude, "skills", "plan", "SKILL.md"));
  r = run(["check", "--claude-dir", w1.claude]);
  check("check reports a missing file and exits 1", r.code === 1 && r.out.includes("missing file") && r.out.includes("plan"), r.out);
  r = run(["update", ...w1.args("--force")]);
  check("update --force puts it back", r.code === 0 && existsSync(join(w1.claude, "skills", "plan", "SKILL.md")), r.out);

  // ---------- 4. the person already has their own settings, notes and files ----------
  const w2 = world("existing"); mkdirSync(w2.claude, { recursive: true });
  const theirSettings = { permissions: { allow: ["Bash(ls:*)"] }, model: "opus", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo hi" }] }], SessionStart: [{ hooks: [{ type: "command", command: "echo mine" }] }] } };
  writeFileSync(join(w2.claude, "settings.json"), JSON.stringify(theirSettings, null, 4));
  const theirMd = "# My own rules\n\nAlways answer in Spanish.\n";
  writeFileSync(join(w2.claude, "CLAUDE.md"), theirMd);
  mkdirSync(join(w2.claude, "skills", "my-skill"), { recursive: true }); writeFileSync(join(w2.claude, "skills", "my-skill", "SKILL.md"), "mine");
  r = run(["install", ...w2.args()]);
  check("install next to their own setup exits 0", r.code === 0, r.out);
  const s2 = j(join(w2.claude, "settings.json"));
  check("their settings are all still there, their own hooks too", s2.permissions.allow[0] === "Bash(ls:*)" && s2.model === "opus" && s2.hooks.PreToolUse.length === 1 && s2.hooks.SessionStart.length === 2 && s2.hooks.SessionStart[0].hooks[0].command === "echo mine", JSON.stringify(s2));
  const m2 = readFileSync(join(w2.claude, "CLAUDE.md"), "utf8");
  check("their CLAUDE.md text is untouched, block added after it", m2.startsWith(theirMd) && m2.includes("PROJECT-WORKFLOW:BEGIN"));
  check("their own skill is untouched", readFileSync(join(w2.claude, "skills", "my-skill", "SKILL.md"), "utf8") === "mine");
  const bdir = join(w2.claude, "project-workflow-backup");
  check("originals were backed up first", existsSync(bdir) && readdirSync(bdir).length === 1 && readdirSync(join(bdir, readdirSync(bdir)[0])).length >= 3);
  // edit one of our files, then uninstall
  appendFileSync(join(w2.claude, "skills", "plan", "SKILL.md"), "\nMy own note.\n");
  r = run(["uninstall", "--claude-dir", w2.claude, "--yes"]);
  check("uninstall exits 0 and says which edited file it kept", r.code === 0 && r.out.includes("Kept because you edited") && r.out.includes("plan"), r.out);
  check("uninstall restores their settings exactly (as data)", same(j(join(w2.claude, "settings.json")), theirSettings), readFileSync(join(w2.claude, "settings.json"), "utf8"));
  check("uninstall restores their CLAUDE.md text exactly", readFileSync(join(w2.claude, "CLAUDE.md"), "utf8") === theirMd, readFileSync(join(w2.claude, "CLAUDE.md"), "utf8"));
  check("uninstall removed our skills and records, kept their skill and the edited one", !existsSync(join(w2.claude, "skills", "pickup")) && !existsSync(join(w2.claude, "project-workflow-install.json")) && !existsSync(join(w2.claude, "project-workflow-config.json")) && existsSync(join(w2.claude, "skills", "my-skill", "SKILL.md")) && readFileSync(join(w2.claude, "skills", "plan", "SKILL.md"), "utf8").includes("My own note"));
  check("uninstall leaves their projects folder", existsSync(w2.root));

  // ---------- 5. a file with the same name that is not ours ----------
  const w3 = world("conflict"); mkdirSync(join(w3.claude, "skills", "pickup"), { recursive: true }); writeFileSync(join(w3.claude, "skills", "pickup", "SKILL.md"), "THEIRS");
  r = run(["install", ...w3.args()]);
  check("a same-named foreign file stops the install (exit 2) before anything is written", r.code === 2 && r.out.includes("--force") && !existsSync(join(w3.claude, "settings.json")) && !existsSync(join(w3.claude, "hooks")) && readFileSync(join(w3.claude, "skills", "pickup", "SKILL.md"), "utf8") === "THEIRS" && !existsSync(w3.root), r.out);
  r = run(["install", ...w3.args("--force")]);
  const bk = join(w3.claude, "project-workflow-backup"); const bkFiles = existsSync(bk) ? readdirSync(join(bk, readdirSync(bk)[0])) : [];
  check("--force replaces it but keeps a backup copy", r.code === 0 && readFileSync(join(w3.claude, "skills", "pickup", "SKILL.md"), "utf8") !== "THEIRS" && bkFiles.some((f) => readFileSync(join(bk, readdirSync(bk)[0], f), "utf8") === "THEIRS"), r.out);

  // ---------- 6. broken settings.json ----------
  const w4 = world("broken"); mkdirSync(w4.claude, { recursive: true }); writeFileSync(join(w4.claude, "settings.json"), "{ not json");
  r = run(["install", ...w4.args()]);
  check("invalid settings.json: exit 3, nothing touched", r.code === 3 && readFileSync(join(w4.claude, "settings.json"), "utf8") === "{ not json" && !existsSync(join(w4.claude, "hooks")) && !existsSync(w4.root), r.out);

  // ---------- 7. update ----------
  const w5 = world("update");
  run(["install", ...w5.args()]);
  appendFileSync(join(w5.claude, "skills", "handoff", "SKILL.md"), "\nMy handoff note.\n");   // the person edited one of ours
  writeFileSync(inPkg("VERSION"), "0.2.0\n");
  appendFileSync(skillInPkg("pickup"), "\nNEW IN 0.2.0\n");
  appendFileSync(skillInPkg("handoff"), "\nNEW HANDOFF TEXT\n");
  writeFileSync(inPkg("CHANGELOG.md"), "# changes\n\n## v0.2.0\nPickup got better.\n\n## v0.1.0 (pre-release)\nFirst.\n");
  const mf = j(inPkg("manifest.json")); mf.hooks = mf.hooks.filter((h) => h.dest !== "memory-rotate.mjs"); writeFileSync(inPkg("manifest.json"), JSON.stringify(mf, null, 2));
  r = run(["update", ...w5.args()]);
  check("update exits 0 and shows what is new", r.code === 0 && r.out.includes("What is new") && r.out.includes("Pickup got better") && !r.out.includes("First."), r.out);
  check("update replaced our unchanged skill", readFileSync(join(w5.claude, "skills", "pickup", "SKILL.md"), "utf8").includes("NEW IN 0.2.0"));
  check("update kept the skill the person edited (and said so)", readFileSync(join(w5.claude, "skills", "handoff", "SKILL.md"), "utf8").includes("My handoff note.") && !readFileSync(join(w5.claude, "skills", "handoff", "SKILL.md"), "utf8").includes("NEW HANDOFF TEXT") && r.out.includes("kept as you left them"), r.out);
  check("update removed a script that is no longer in the package", !existsSync(join(w5.claude, "hooks", "memory-rotate.mjs")));
  check("rules block shows the new version, still only one", readFileSync(join(w5.claude, "CLAUDE.md"), "utf8").includes("BEGIN v0.2.0") && (readFileSync(join(w5.claude, "CLAUDE.md"), "utf8").match(/PROJECT-WORKFLOW:BEGIN/g) || []).length === 1);
  check("install record says 0.2.0", j(join(w5.claude, "project-workflow-install.json")).version === "0.2.0");
  r = run(["check", "--claude-dir", w5.claude]);
  check("check after update: all good, mentions the edited file", r.code === 0 && r.out.includes("edited by you"), r.out);

  // ---------- 8. the once-a-day "new version" line ----------
  let hits = 0, reply = "9.9.9", status = 200;
  const server = createServer((req, res) => { hits++; res.statusCode = status; res.end(reply); });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${server.address().port}/VERSION`;
  const w6 = world("notice"); run(["install", ...w6.args()]);   // installs 0.2.0 (the package copy is 0.2.0 now)
  const hookAt = async (w, extraEnv = {}) => { const p = execFileAsync("node", [join(w.claude, "hooks", "project-check.mjs")], { encoding: "utf8", env: { ...process.env, PROJECT_WORKFLOW_CLAUDE_DIR: w.claude, PROJECT_WORKFLOW_ROOT: "", PROJECT_WORKFLOW_UPDATE_URL: url, ...extraEnv } }); p.child.stdin.end(JSON.stringify({ cwd: w.root, source: "startup" })); const { stdout } = await p; return JSON.parse(stdout).hookSpecificOutput.additionalContext; };
  let c = await hookAt(w6);
  check("newer version out: one UPDATE AVAILABLE line with both versions", c.includes("UPDATE AVAILABLE") && c.includes("v9.9.9") && c.includes("v0.2.0") && c.includes("update workflow") && hits === 1, `hits=${hits} ${c.slice(0, 150)}`);
  c = await hookAt(w6);
  check("second session the same day: line again, but no new request (cached)", c.includes("UPDATE AVAILABLE") && hits === 1, `hits=${hits}`);
  const stateFile = join(w6.claude, "project-workflow-update.json");
  writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5, latest: "9.9.9" }));
  reply = "0.2.0"; c = await hookAt(w6);
  check("a day later it asks again; same version as installed = no line", hits === 2 && !c.includes("UPDATE AVAILABLE"), `hits=${hits}`);
  writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5 })); reply = "<html>not a version</html>"; c = await hookAt(w6);
  check("garbage answer: no line, no crash", !c.includes("UPDATE AVAILABLE") && c.includes("[Workflow workshop]"));
  writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5 })); status = 500; c = await hookAt(w6);
  check("server error: no line, no crash", !c.includes("UPDATE AVAILABLE") && c.includes("[Workflow workshop]"));
  const before2 = hits; status = 200; reply = "9.9.9";
  c = await hookAt(w6);
  check("after a failure it waits an hour before asking again", hits === before2 && !c.includes("UPDATE AVAILABLE"), `hits=${hits} before=${before2}`);
  writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5 }));
  const cfg6 = j(join(w6.claude, "project-workflow-config.json")); cfg6.updateCheck = false; writeFileSync(join(w6.claude, "project-workflow-config.json"), JSON.stringify(cfg6));
  const before3 = hits; c = await hookAt(w6);
  check("updateCheck:false = no request and no line", hits === before3 && !c.includes("UPDATE AVAILABLE"));
  rmSync(join(w6.claude, "project-workflow-install.json"));   // like a machine where the installer never ran (Alex's)
  const before4 = hits; c = await hookAt(w6);
  check("without an install record there is never a request", hits === before4 && !c.includes("UPDATE AVAILABLE"));
  await new Promise((ok) => server.close(ok));
  writeFileSync(join(w6.claude, "project-workflow-install.json"), JSON.stringify({ ...j(join(w5.claude, "project-workflow-install.json")), claudeDir: w6.claude }));
  cfg6.updateCheck = true; writeFileSync(join(w6.claude, "project-workflow-config.json"), JSON.stringify(cfg6)); writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5 }));
  const t0 = Date.now(); c = await hookAt(w6);
  check("server down: no line, no crash, fast", !c.includes("UPDATE AVAILABLE") && c.includes("[Workflow workshop]") && Date.now() - t0 < 6000, `${Date.now() - t0} ms`);
  // a server that accepts the connection but never answers: the 2.5 s timeout must end it cleanly (exit code 0, no Node abort on Windows)
  const slow = createServer(() => {}); await new Promise((ok) => slow.listen(0, "127.0.0.1", ok));
  writeFileSync(stateFile, JSON.stringify({ checkedAt: Date.now() - 2 * 864e5 }));
  const t1 = Date.now(); c = await hookAt(w6, { PROJECT_WORKFLOW_UPDATE_URL: `http://127.0.0.1:${slow.address().port}/VERSION` });
  check("server that never answers: gives up after about 2.5 s, no line, hook still exits 0", !c.includes("UPDATE AVAILABLE") && c.includes("[Workflow workshop]") && Date.now() - t1 < 6000, `${Date.now() - t1} ms`);
  slow.closeAllConnections?.(); await new Promise((ok) => slow.close(ok));
} finally {
  rmSync(TMP, { recursive: true, force: true });
  console.log(existsSync(TMP) ? "CLEANUP FAILED" : "cleanup: throwaway folders removed");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
