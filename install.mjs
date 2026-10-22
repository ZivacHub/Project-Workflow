#!/usr/bin/env node
// Project Workflow installer.
//   node install.mjs [install|update|check|uninstall] [--root <projects folder>] [--owner <name>] [--yes] [--dry-run]
//        [--force] [--claude-dir <dir>] [--remote-control] [--rename-chat] [--no-update-check]
// What it does (nothing else): copies the skills, scripts and the project template; adds the session start-up check to
// settings.json; adds a marked rules block to CLAUDE.md; writes project-workflow-config.json; remembers what it owns in project-workflow-install.json.
// Every file it replaces is copied to <claude dir>/project-workflow-backup/<time>/ first. Files you edited are never overwritten
// (unless --force); files you already had with the same name stop the install until you say --force.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { homedir, userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(readFileSync(join(HERE, "manifest.json"), "utf8"));
const VERSION = readFileSync(join(HERE, "VERSION"), "utf8").trim();
const BEGIN = /<!-- PROJECT-WORKFLOW:BEGIN[^>]*-->/, END = "<!-- PROJECT-WORKFLOW:END -->";

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const val = (n) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const CMD = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--root", "--owner", "--claude-dir"].includes(argv[i - 1]))) || "install";
const CLAUDE = resolve(val("claude-dir") || process.env.PROJECT_WORKFLOW_CLAUDE_DIR || join(homedir(), ".claude"));
const DRY = flag("dry-run"), YES = flag("yes"), FORCE = flag("force");
const INSTALL_FILE = join(CLAUDE, "project-workflow-install.json"), CONFIG_FILE = join(CLAUDE, "project-workflow-config.json"), SETTINGS_FILE = join(CLAUDE, "settings.json"), RULES_FILE = join(CLAUDE, "CLAUDE.md");

// ---------- helpers ----------
const say = (...a) => console.log(...a);
const fail = (msg, code = 2) => { console.error("\n" + msg); process.exit(code); };
const slash = (p) => p.replace(/\\/g, "/");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const readText = (f) => readFileSync(f, "utf8").replace(/^﻿/, "");
const readJson = (f) => { try { return JSON.parse(readText(f)); } catch { return null; } };
const isNewer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
function* walk(dir, base = dir) { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) yield* walk(p, base); else yield [p, relative(base, p)]; } }
const rl = () => createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, def) {
  if (!process.stdin.isTTY) return def;
  const r = rl(); const a = (await r.question(`${question}${def ? ` [${def}]` : ""} `)).trim(); r.close(); return a || def;
}
async function confirm(question) {
  if (YES) return true;
  if (!process.stdin.isTTY) fail(`${question}\nNothing was changed. Run it again with --yes to confirm without being asked.`);
  const r = rl(); const a = (await r.question(`${question} [y/N] `)).trim().toLowerCase(); r.close(); return a === "y" || a === "yes";
}

// ---------- what the package contains ----------
function packageItems(root) {
  const items = [];
  const add = (src, dest) => items.push({ dest: resolve(dest), content: readFileSync(src) });
  for (const s of MANIFEST.skills) for (const [p, rel] of walk(join(HERE, s.src))) add(p, join(CLAUDE, "skills", s.name, rel));
  for (const h of MANIFEST.hooks) add(join(HERE, h.src), join(CLAUDE, "hooks", h.dest));
  for (const [p, rel] of walk(join(HERE, MANIFEST.template))) {
    items.push({ dest: resolve(root, "_template", rel), content: rel === "VERSION" ? Buffer.from(String(MANIFEST.templateVersion) + "\n") : readFileSync(p) });
  }
  items.push({ dest: resolve(root, "README.md"), content: Buffer.from(`# My projects\n\nEvery folder here is one project. \`_template\` is what new projects start from.\nStart Claude Code inside a project folder and type /pickup (continue), /new-project (start), /handoff (save progress).\nSet up by the Project Workflow installer; \`node ~/.claude/hooks/project-workflow-status.mjs\` shows all projects.\n`), once: true });
  return items;
}
const hookCommand = () => `node "${slash(join(CLAUDE, "hooks", "project-check.mjs"))}"`;
const blockText = () => `<!-- PROJECT-WORKFLOW:BEGIN v${VERSION} -->\n${readText(join(HERE, MANIFEST.rules)).trim()}\n${END}`;

// ---------- settings.json and CLAUDE.md edits (pure functions: easy to test, easy to undo) ----------
function withHook(settings) {
  const s = structuredClone(settings); s.hooks ??= {}; s.hooks.SessionStart ??= [];
  const cmd = hookCommand();
  if (s.hooks.SessionStart.some((e) => (e.hooks || []).some((h) => h.command === cmd))) return s;
  s.hooks.SessionStart.push({ hooks: [{ type: "command", command: cmd, timeout: 15, statusMessage: "Checking project setup" }] });
  return s;
}
function withoutHook(settings, cmd) {
  const s = structuredClone(settings); const list = s.hooks?.SessionStart; if (!list) return s;
  s.hooks.SessionStart = list.map((e) => ({ ...e, hooks: (e.hooks || []).filter((h) => h.command !== cmd) })).filter((e) => (e.hooks || []).length);
  if (!s.hooks.SessionStart.length) delete s.hooks.SessionStart; if (!Object.keys(s.hooks).length) delete s.hooks;
  return s;
}
function withBlock(text) {
  const block = blockText();
  const b = text.search(BEGIN), e = text.indexOf(END);
  if (b >= 0 && e > b) return text.slice(0, b) + block + text.slice(e + END.length);
  if (!text.trim()) return block + "\n";
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}
function withoutBlock(text) {
  const b = text.search(BEGIN), e = text.indexOf(END); if (b < 0 || e < b) return text;
  const before = text.slice(0, b).replace(/\s*$/, ""), after = text.slice(e + END.length).replace(/^\n/, "");
  return before ? before + "\n" + (after ? "\n" + after : "") : after;
}

// ---------- backups ----------
let backupDir = null; const backupIndex = [];
function backup(file) {
  if (!existsSync(file)) return;
  backupDir ??= join(CLAUDE, "project-workflow-backup", new Date().toISOString().replace(/[:.]/g, "-"));
  const name = slash(file).replace(/[:/]/g, "_"); mkdirSync(backupDir, { recursive: true }); cpSync(file, join(backupDir, name));
  backupIndex.push({ original: slash(file), backup: name });
}
function write(file, content) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }

// ---------- install / update ----------
async function install(update) {
  const old = readJson(INSTALL_FILE);
  if (update && !old) fail("Nothing is installed yet here, so there is nothing to update. Run: node install.mjs");
  const cfgOld = readJson(CONFIG_FILE) || {};
  let root = val("root") || cfgOld.root || old?.root;
  if (!root) { root = await ask("Which folder holds your projects? (it is created if missing)", join(homedir(), "Projects")); }
  if (!root) fail("I need the folder that holds your projects: run again with --root <folder>.");
  root = resolve(root);
  let owner = val("owner") || cfgOld.owner;
  if (!owner) owner = await ask("What name should Claude call you?", userInfo().username);

  // preflight: read everything, decide everything, change nothing yet
  let settings = {}; if (existsSync(SETTINGS_FILE)) { settings = readJson(SETTINGS_FILE); if (!settings || typeof settings !== "object") fail(`${SETTINGS_FILE} is not valid JSON, so I will not touch it. Fix or rename it, then run again. Nothing was changed.`, 3); }
  const items = packageItems(root); const owned = old?.files || {};
  const toWrite = [], kept = [], foreign = [];
  for (const it of items) {
    const key = slash(it.dest), want = sha(it.content);
    if (!existsSync(it.dest)) { if (!(it.once && old?.files && key in owned)) toWrite.push({ ...it, key, why: "new" }); continue; }
    const have = sha(readFileSync(it.dest));
    if (have === want) { toWrite.push({ ...it, key, why: "same", skip: true }); continue; }
    if (key in owned) { if (owned[key] === have) toWrite.push({ ...it, key, why: "update" }); else if (FORCE) toWrite.push({ ...it, key, why: "forced" }); else kept.push(it.dest); }
    else if (it.once) kept.push(it.dest);
    else if (FORCE) toWrite.push({ ...it, key, why: "forced" }); else foreign.push(it.dest);
  }
  const stale = update ? Object.keys(owned).filter((k) => !items.some((i) => slash(i.dest) === k) && existsSync(k) && sha(readFileSync(k)) === owned[k]) : [];
  if (foreign.length) {
    say(`\nThese ${foreign.length} file(s) already exist and are not from this installer:`); foreign.slice(0, 12).forEach((f) => say("  " + f)); if (foreign.length > 12) say(`  ... and ${foreign.length - 12} more`);
    fail("I did not change anything. If you want them replaced (a backup copy is kept), run again with --force.");
  }
  const newSettings = withHook(settings), newBlockText = withBlock(existsSync(RULES_FILE) ? readText(RULES_FILE) : "");
  const settingsChanged = JSON.stringify(newSettings) !== JSON.stringify(settings) || !existsSync(SETTINGS_FILE);
  const rulesChanged = !existsSync(RULES_FILE) || newBlockText !== readText(RULES_FILE);
  const cfg = { ...cfgOld, root: slash(root), owner };
  cfg.remoteControl = flag("remote-control") ? true : (cfgOld.remoteControl ?? false);
  cfg.renameChat = flag("rename-chat") ? true : (cfgOld.renameChat ?? false);
  if (flag("no-update-check")) cfg.updateCheck = false;

  const writes = toWrite.filter((w) => !w.skip);
  say(`\nProject Workflow v${VERSION}: ${update ? "update" : "install"}${DRY ? " (dry run, nothing will be written)" : ""}`);
  say(`  projects folder : ${root}${existsSync(root) ? "" : "  (will be created)"}`);
  say(`  Claude folder   : ${CLAUDE}`);
  say(`  owner name      : ${owner}      Remote Control: ${cfg.remoteControl ? "on" : "off"}   chat renaming: ${cfg.renameChat ? "on" : "off"}`);
  say(`  files           : ${writes.filter((w) => w.why === "new").length} new, ${writes.filter((w) => w.why !== "new").length} replaced, ${toWrite.length - writes.length} already up to date${stale.length ? `, ${stale.length} no longer needed (removed)` : ""}`);
  say(`  settings.json   : ${settingsChanged ? "add the session start-up check" : "already has it"}`);
  say(`  CLAUDE.md       : ${rulesChanged ? "add/refresh the marked PROJECTS_ROOT block (your own text stays)" : "block already current"}`);
  if (kept.length) { say(`  kept as you left them (you edited them): ${kept.length}`); kept.slice(0, 8).forEach((f) => say("    " + f)); }
  if (DRY) return;
  if (!(await confirm("Go ahead?"))) fail("Cancelled. Nothing was changed.", 1);

  // do it
  mkdirSync(root, { recursive: true });
  for (const w of writes) { backup(w.dest); write(w.dest, w.content); }
  for (const k of stale) { backup(k); rmSync(k); }
  if (settingsChanged) { backup(SETTINGS_FILE); write(SETTINGS_FILE, JSON.stringify(newSettings, null, 2) + "\n"); }
  if (rulesChanged) { backup(RULES_FILE); write(RULES_FILE, newBlockText); }
  write(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n");
  const files = { ...(old?.files || {}) }; for (const k of stale) delete files[k];
  for (const w of toWrite) if (existsSync(w.dest)) files[w.key] = sha(readFileSync(w.dest)); // files the user edited (kept) stay recorded with the old hash, so they are still treated as theirs
  write(INSTALL_FILE, JSON.stringify({ version: VERSION, installedAt: old?.installedAt || new Date().toISOString(), updatedAt: new Date().toISOString(), claudeDir: slash(CLAUDE), root: slash(root), sourceDir: slash(HERE), updateUrl: MANIFEST.updateUrl, hookCommand: hookCommand(), files, backup: backupDir ? slash(backupDir) : old?.backup || null }, null, 2) + "\n");
  if (backupDir) write(join(backupDir, "index.json"), JSON.stringify(backupIndex, null, 2) + "\n");
  say(`\nDone. ${update ? "Updated to" : "Installed"} v${VERSION}.${backupDir ? `\nCopies of everything replaced are in ${backupDir}` : ""}`);
  if (update) { printChangelog(old.version); }
  say(`\nNext: open Claude Code inside any folder under ${root} and type /pickup, or /new-project in an empty one.`);
  say(`To check everything at any time: node "${slash(join(HERE, "install.mjs"))}" check`);
}
function printChangelog(since) {
  const f = join(HERE, "CHANGELOG.md"); if (!existsSync(f)) return;
  const sections = readText(f).split(/^(?=## v)/m).filter((s) => /^## v\d/.test(s)).filter((s) => isNewer(/^## v([\d.]+)/.exec(s)[1], since));
  if (sections.length) say("\nWhat is new:\n" + sections.join("").trim());
}

// ---------- check ----------
async function check() {
  const problems = [], notes = []; const ok = (m) => say("  OK   " + m), bad = (m, fix) => { problems.push(m); say("  FIX  " + m + (fix ? "   -> " + fix : "")); };
  say(`Project Workflow check (package v${VERSION}, Claude folder ${CLAUDE})`);
  const major = parseInt(process.versions.node, 10); major >= 18 ? ok(`Node.js ${process.versions.node}`) : bad(`Node.js ${process.versions.node} is too old`, "install Node.js 18 or newer");
  const inst = readJson(INSTALL_FILE);
  if (!inst) { bad("nothing is installed here", "run: node install.mjs"); return finish(); }
  ok(`installed version v${inst.version}` + (isNewer(VERSION, inst.version) ? `   (this copy is v${VERSION}: run  node install.mjs update )` : ""));
  let missing = 0, edited = 0; for (const [k, h] of Object.entries(inst.files || {})) { if (!existsSync(k)) { missing++; if (missing <= 5) bad(`missing file ${k}`, "run: node install.mjs update --force"); } else if (sha(readFileSync(k)) !== h) edited++; }
  if (!missing) ok(`${Object.keys(inst.files || {}).length} files present` + (edited ? ` (${edited} edited by you: they are kept on update)` : ""));
  const st = readJson(SETTINGS_FILE); st && JSON.stringify(st).includes(inst.hookCommand ? inst.hookCommand.replace(/"/g, '\\"') : "project-check.mjs") ? ok("session start-up check is in settings.json") : bad("session start-up check is not in settings.json", "run: node install.mjs update");
  existsSync(RULES_FILE) && BEGIN.test(readText(RULES_FILE)) ? ok("rules block is in CLAUDE.md") : bad("rules block is missing from CLAUDE.md", "run: node install.mjs update");
  const cfg = readJson(CONFIG_FILE); cfg?.root && existsSync(cfg.root) ? ok(`projects folder ${cfg.root}`) : bad("project-workflow-config.json missing or its projects folder does not exist", "run: node install.mjs --root <folder>");
  if (cfg?.root && !existsSync(join(cfg.root, "_template"))) bad("the projects folder has no _template", "run: node install.mjs update");
  try { const o = execFileSync("node", [join(CLAUDE, "hooks", "pickup-context.mjs"), "--options"], { encoding: "utf8", env: { ...process.env, PROJECT_WORKFLOW_CLAUDE_DIR: CLAUDE, PROJECT_WORKFLOW_ROOT: "" }, timeout: 15000 }).trim(); /owner=/.test(o) ? ok(`scripts run (${o})`) : bad("scripts ran but printed something unexpected: " + o); } catch (e) { bad("the scripts do not run: " + String(e.message).split("\n")[0], "run: node install.mjs update --force"); }
  return finish();
  function finish() { say(problems.length ? `\n${problems.length} thing(s) to fix.` : "\nAll good."); process.exitCode = problems.length ? 1 : 0; }
}

// ---------- uninstall ----------
async function uninstall() {
  const inst = readJson(INSTALL_FILE); if (!inst) fail("Nothing is installed here.", 1);
  const keep = [];
  say(`\nUninstall Project Workflow v${inst.version} from ${CLAUDE}${DRY ? " (dry run)" : ""}`);
  say("  I remove: the skills, scripts and template files I installed (not the ones you edited), the start-up check in settings.json, the marked block in CLAUDE.md, my settings files.");
  say("  I do NOT touch: your projects, your own text in CLAUDE.md, your other settings, the backups.");
  if (DRY) return;
  if (!(await confirm("Go ahead?"))) fail("Cancelled. Nothing was changed.", 1);
  for (const [k, h] of Object.entries(inst.files || {})) { if (!existsSync(k)) continue; if (sha(readFileSync(k)) === h) { backup(k); rmSync(k); } else keep.push(k); }
  const protect = new Set([CLAUDE, resolve(inst.root)]);   // never remove these two folders, even when they end up empty
  for (const dir of new Set(Object.keys(inst.files || {}).map((k) => resolve(dirname(k))))) { let d = dir; while (d.length > 3 && existsSync(d) && !protect.has(d) && !readdirSync(d).length) { rmdirSync(d); d = dirname(d); } }
  const st = readJson(SETTINGS_FILE); if (st) { backup(SETTINGS_FILE); write(SETTINGS_FILE, JSON.stringify(withoutHook(st, inst.hookCommand), null, 2) + "\n"); }
  if (existsSync(RULES_FILE)) { const t = readText(RULES_FILE), n = withoutBlock(t); if (n !== t) { backup(RULES_FILE); if (n.trim()) write(RULES_FILE, n); else rmSync(RULES_FILE); } }
  for (const f of [CONFIG_FILE, INSTALL_FILE, join(CLAUDE, "project-workflow-update.json")]) if (existsSync(f)) { backup(f); rmSync(f); }
  if (backupDir) write(join(backupDir, "index.json"), JSON.stringify(backupIndex, null, 2) + "\n");
  say("\nDone. The workflow is removed." + (keep.length ? `\nKept because you edited them (${keep.length}):\n  ` + keep.join("\n  ") : "") + (backupDir ? `\nBackups: ${backupDir}` : ""));
}

// ---------- go ----------
if (CMD === "install") await install(false);
else if (CMD === "update") await install(true);
else if (CMD === "check") await check();
else if (CMD === "uninstall") await uninstall();
else fail(`Unknown command "${CMD}". Use: install, update, check or uninstall.`);
