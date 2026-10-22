// Tests memory-rotate.mjs on throwaway folders in the scratchpad (never on a real project).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const SCRIPT = join(process.env.HOOKS || join(homedir(), ".claude", "hooks"), "memory-rotate.mjs");
const T = join(tmpdir(), "project-workflow-test-rotate");
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  -> " + d}`); };
const run = (...a) => { try { return { code: 0, out: execFileSync("node", [SCRIPT, ...a], { encoding: "utf8" }) }; } catch (e) { return { code: e.status, out: (e.stdout || "") + (e.stderr || "") }; } };
const mem = join(T, ".claude", "memory.md");
const thisMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
const header = "# Project memory\r\nAppend newest entries at the bottom.\r\n\r\nplain intro line before any heading\r\n\r\n";
const e = (h, body) => `## ${h}\r\n- ${body}\r\n\r\n`;
const entries = [e("2026-06-01 — June one", "a"), e("2026-06-20 — June two", "b"), e("2026-07-05: July one", "c"), e("Current state", "undated stays"), e("2026-08-09: Aug one", "d"), e(`${thisMonth}-02: now`, "e"), e(`${thisMonth}-03: now 2`, "f")];
const original = header + entries.join("");
rmSync(T, { recursive: true, force: true }); mkdirSync(join(T, ".claude"), { recursive: true }); writeFileSync(mem, original);

let r = run(T);
check("dry run exits 0 and reports moves", r.code === 0 && /dry run: \d+ entries would move/.test(r.out), r.out);
check("dry run changes nothing", readFileSync(mem, "utf8") === original && !existsSync(join(T, ".claude", "memory")));
r = run(T, "--apply");
check("apply exits 0", r.code === 0, r.out);
const kept = readFileSync(mem, "utf8");
const count = (t) => (t.match(/^## /gm) || []).length;
const months = ["2026-06", "2026-07", "2026-08"].map((m) => { const f = join(T, ".claude", "memory", `${m}.md`); return existsSync(f) ? readFileSync(f, "utf8") : ""; });
check("header and plain intro stay in memory.md", kept.startsWith(header));
check("undated 'Current state' stays", kept.includes("## Current state"));
check("current month entries stay", kept.includes(`## ${thisMonth}-02`) && kept.includes(`## ${thisMonth}-03`));
check("newest 3 dated entries stay (Aug one is among them)", kept.includes("## 2026-08-09"));
check("June entries moved to 2026-06.md", count(months[0]) === 2 && months[0].includes("June one") && months[0].includes("June two"), months[0]);
check("July entry moved to 2026-07.md", count(months[1]) === 1 && months[1].includes("July one"));
check("August stays (newest 3), so no 2026-08.md", months[2] === "");
check("nothing lost: moved + kept = original entry count", count(kept) + count(months[0]) + count(months[1]) === count(original), `${count(kept)}+${count(months[0])}+${count(months[1])} vs ${count(original)}`);
check("line endings preserved (CRLF)", kept.includes("\r\n") && months[0].includes("\r\n") && !/[^\r]\n/.test(kept.replace(/\r\n/g, "")));
const again = run(T, "--apply");
check("second apply moves nothing", again.out.includes("nothing to archive"), again.out);
// appending to an existing month file keeps what is there
writeFileSync(mem, kept + e("2026-06-30: late June", "z") + e(`${thisMonth}-04: n3`, "g") + e(`${thisMonth}-05: n4`, "h") + e(`${thisMonth}-06: n5`, "i"));
r = run(T, "--apply");
const jun = readFileSync(join(T, ".claude", "memory", "2026-06.md"), "utf8");
check("existing month file is appended to, not overwritten", r.code === 0 && count(jun) === 3 && jun.includes("June one") && jun.includes("late June"), jun);
check("no memory.md -> clear message and exit 1", run(join(T, "nope")).code === 1);
rmSync(T, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
