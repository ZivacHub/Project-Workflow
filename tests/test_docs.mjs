// Big-project docs: design areas (docs/design/<area>.md with "Read when:"), the step field "Needs:", the compact index in the pickup,
// the topic finder docs-find.mjs and the splitter split-doc.mjs (with its proof that no line is lost). Only throwaway folders.
// run: node tests/test_docs.mjs   (workshop repo: node _workflow/tests/test_docs.mjs)
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FLAT = !existsSync(join(resolve(HERE, "..", ".."), "_workflow", "installer"));
const ROOT = FLAT ? resolve(HERE, "..") : resolve(HERE, "..", "..");
const EXAMPLE = FLAT ? join(ROOT, "examples", "my-first-project") : join(ROOT, "_workflow", "installer", "public", "examples", "my-first-project");
const HOOKS = FLAT ? join(ROOT, "hooks") : join(ROOT, "_workflow", "claude", "hooks");
const TMP = mkdtempSync(join(tmpdir(), "project-workflow-test-docs-"));
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "   -> " + String(d).slice(0, 500)}`); };
const claude = join(TMP, "claude"), projects = join(TMP, "projects"), app = join(projects, "game");
const env = { ...process.env, PROJECT_WORKFLOW_CLAUDE_DIR: claude, PROJECT_WORKFLOW_ROOT: projects, PROJECT_WORKFLOW_OWNER: "" };
const run = (script, args) => { try { return { code: 0, out: execFileSync("node", [join(HOOKS, script), ...args], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }) }; } catch (e) { return { code: e.status, out: (e.stdout || "") + (e.stderr || "") }; } };
const git = (...a) => execFileSync("git", ["-C", app, "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const w = (rel, text) => { mkdirSync(dirname(join(app, rel)), { recursive: true }); writeFileSync(join(app, rel), text); };
const area = (title, when, n) => `# ${title}\nRead when: ${when}\nRelated: (none)\n\n## ${title}\n\n${("The ${title.toLowerCase()} rules say how it works. ").repeat(n)}\n`;

try {
  mkdirSync(join(claude, "hooks"), { recursive: true }); cpSync(join(HOOKS, "rules-digest.md"), join(claude, "hooks", "rules-digest.md"));
  cpSync(EXAMPLE, app, { recursive: true });
  // a big project: three area docs, one of them wrongly without a "Read when:" line
  w("docs/design/combat.md", area("Combat", "any step about combat rules, damage, armour or enemy attacks", 30));
  w("docs/design/items.md", area("Items", "any step about weapons, potions, loot or the inventory", 30));
  w("docs/design/map.md", "# Map\nzones and travel\n\n" + "The map is made of zones. ".repeat(30));
  const ix = readFileSync(join(app, "docs", "INDEX.md"), "utf8");
  w("docs/INDEX.md", ix.replace(/\s*$/, "\n") + "\n## Design areas\n| File | Read when |\n|---|---|\n| design/combat.md | Combat rules. Read when: combat. |\n| design/items.md | Items. Read when: items. |\n| design/map.md | The map. |\n");

  let r = run("docs-find.mjs", ["--check", "--project", app]);
  check("lint: a design area without a Read when line is reported, the others are not", /design\/map\.md has no "Read when:"/.test(r.out) && !/design\/combat\.md has no/.test(r.out), r.out);

  // Needs: on the next step
  const phase = join(app, "docs", "plan", "phases", "01-first-page.md"), ph = readFileSync(phase, "utf8");
  writeFileSync(phase, ph.replace(/^(\*\*1\.2 [^\n]*?)(\s—\s)/m, (m, a, b) => `${a}${b}Needs: \`docs/design/combat.md\`, \`docs/design/items.md\`. `));
  r = run("pickup-context.mjs", [app]);
  check("pickup: the next step's Needs docs are listed with their sizes", /NEXT STEP 1\.2 NEEDS/.test(r.out) && /docs\/design\/combat\.md\s+\(\d/.test(r.out) && /docs\/design\/items\.md\s+\(\d/.test(r.out), (r.out.match(/NEXT STEP[\s\S]{0,300}/) || [r.out.slice(0, 300)])[0]);
  check("pickup: the read budget counts them", /for the next step: [\d.]+ KB\s+\(.*combat\.md.*items\.md/.test(r.out), (r.out.match(/READ BUDGET[\s\S]{0,400}/) || [""])[0]);
  writeFileSync(phase, readFileSync(phase, "utf8").replace("`docs/design/items.md`", "`docs/design/missing-area.md`"));
  r = run("docs-find.mjs", ["--check", "--project", app]);
  check("lint: a step that needs a file that does not exist is reported", /a step needs docs\/design\/missing-area\.md, which does not exist/.test(r.out), r.out);
  writeFileSync(phase, ph);

  // compact index: 70 rows must neither be cut in the middle nor lose the "Always" rows
  const rows = Array.from({ length: 70 }, (_, i) => `| design/area-${i}.md | Area number ${i}. Read when: work touches area ${i} and its long description that keeps going to make the row wide. |`).join("\n");
  const ixPath = join(app, "docs", "INDEX.md"), keep = readFileSync(ixPath, "utf8");
  writeFileSync(ixPath, keep.replace(/\s*$/, "\n") + "\n" + rows + "\n");
  r = run("pickup-context.mjs", [app]);
  const sec = (/=== docs\/INDEX\.md, compact[\s\S]*?(?=\n=== )/.exec(r.out) || [""])[0];
  check("pickup: a 70-row index is shown compactly, cut at a row boundary, with a pointer to the finder", sec.length > 0 && sec.length < 5200 && /\+\d+ more rows/.test(sec) && /plan\/BOARD\.md/.test(sec) && !/\| design\/area/.test(sec), sec.slice(-300));
  check("pickup: no long document inventory in a layout-v3 project", /DOCUMENTS: \d+ files under docs\//.test(r.out) && !/=== DOCUMENTS in the project/.test(r.out));
  writeFileSync(ixPath, keep);

  // the topic finder
  r = run("docs-find.mjs", ["armour and damage", "--project", app]);
  check("docs-find: 'armour and damage' puts the combat area first", r.code === 0 && /1\. docs\/design\/combat\.md/.test(r.out), r.out);
  r = run("docs-find.mjs", ["weapons loot", "--project", app]);
  check("docs-find: 'weapons loot' puts the items area first (matches the Read when line)", /1\. docs\/design\/items\.md/.test(r.out) && /Read when:/.test(r.out), r.out);
  r = run("docs-find.mjs", ["zeppelin quantum", "--project", app]);
  check("docs-find: a topic nothing matches says so and exits 0", r.code === 0 && /No document in game matches/.test(r.out), r.out);
  r = run("docs-find.mjs", ["--check", "--project", app]);
  check("docs-find --check: reports the unlabelled area", /design\/map\.md has no "Read when:"/.test(r.out), r.out);

  // the splitter on a big design doc
  const sec2 = (t, n) => `## ${t}\n\n${("Rules about " + t.toLowerCase() + ". The numbers matter here: 12, 40 and 7. ").repeat(n)}\n\n`;
  const big = "# Whole game design\n\nA small action game about a fox. This text comes before the first section. " + "x".repeat(160) + "\n\n" + sec2("Quests", 40) + sec2("Crafting", 35) + sec2("Tiny note", 1) + sec2("Sound", 40) + sec2("Menus", 2);
  w("docs/reference/WHOLE.md", big);
  const ix2 = readFileSync(ixPath, "utf8"); writeFileSync(ixPath, ix2.replace(/\s*$/, "\n") + "\n## Reference\n| File | Read when |\n|---|---|\n| reference/WHOLE.md | The whole design in one file. Read when: any work. |\n");
  git("init", "-q", "-b", "main"); git("add", "-A"); git("commit", "-q", "-m", "start");
  r = run("docs-find.mjs", ["--check", "--project", app]);
  check("docs --check: the 10 KB+ doc is not yet over the limit but the later split must still work", r.code === 0);
  r = run("split-doc.mjs", [app, "docs/reference/WHOLE.md"]);
  check("split-doc dry run: shows the groups, proof says 0 lost, writes nothing", r.code === 0 && /0 lost/.test(r.out) && /quests\.md/.test(r.out) && !existsSync(join(app, "docs", "design", "quests.md")), r.out);
  writeFileSync(join(app, "dirty.txt"), "x");
  r = run("split-doc.mjs", [app, "docs/reference/WHOLE.md", "--apply"]);
  check("split-doc --apply refuses a dirty working tree", r.code !== 0 && /not clean/.test(r.out) && !existsSync(join(app, "docs", "design", "quests.md")), r.out);
  rmSync(join(app, "dirty.txt"));
  writeFileSync(join(TMP, "bad.json"), JSON.stringify({ quests: ["Quests"] }));
  r = run("split-doc.mjs", [app, "docs/reference/WHOLE.md", "--map", join(TMP, "bad.json"), "--apply"]);
  check("split-doc with a map that leaves sections out stops and names them (nothing dropped)", r.code !== 0 && /not mapped/.test(r.out) && /Crafting/.test(r.out) && !existsSync(join(app, "docs", "design", "quests.md")), r.out);
  writeFileSync(join(TMP, "ok.json"), JSON.stringify({ quests: ["Quests"], "crafting-and-sound": ["Crafting", "Sound"], _rest: "misc" }));
  r = run("split-doc.mjs", [app, "docs/reference/WHOLE.md", "--map", join(TMP, "ok.json"), "--apply"]);
  check("split-doc --apply with a map: done, not committed", r.code === 0 && /Done \(not committed\)/.test(r.out), r.out);
  const files = ["quests", "crafting-and-sound", "misc", "overview"].map((n) => join(app, "docs", "design", n + ".md"));
  check("the area files exist and start with a title and a Read when line", files.every((f) => existsSync(f)) && files.every((f) => /^# .+\nRead when: /.test(readFileSync(f, "utf8"))), files.map((f) => existsSync(f)).join());
  const joined = files.map((f) => readFileSync(f, "utf8")).join("\n");
  check("every line of the original text is in the area files", big.split("\n").map((l) => l.trim().replace(/^#+\s*/, "")).filter(Boolean).every((l) => joined.includes(l)));
  const arch = join(app, "docs", "reference", "archive", "WHOLE-before-split.md");
  check("the original is kept byte for byte in archive/ and gone from reference/", existsSync(arch) && readFileSync(arch, "utf8") === big && !existsSync(join(app, "docs", "reference", "WHOLE.md")));
  const ix3 = readFileSync(ixPath, "utf8");
  check("INDEX.md has rows for the new areas and the archive copy, and the old row is replaced", /design\/quests\.md/.test(ix3) && /design\/crafting-and-sound\.md/.test(ix3) && /archive\/WHOLE-before-split\.md/.test(ix3) && !/\| reference\/WHOLE\.md \|/.test(ix3), ix3.slice(-600));
  r = run("docs-find.mjs", ["--check", "--project", app]);
  check("lint after the split: every doc is listed (only the automatic Read when lines are flagged)", !/does not list/.test(r.out) && /automatic one from the split/.test(r.out), r.out);
  r = run("docs-find.mjs", ["sound", "--project", app]);
  check("docs-find after the split: 'sound' finds the area file, not the archived original", /1\. docs\/design\/crafting-and-sound\.md/.test(r.out) && !/before-split/.test(r.out), r.out);
} finally {
  rmSync(TMP, { recursive: true, force: true });
  console.log(existsSync(TMP) ? "CLEANUP FAILED" : "cleanup: throwaway folders removed");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
