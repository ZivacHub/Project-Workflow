#!/usr/bin/env node
// "Where are we?" for one project (or every project, from the projects folder): a short text summary on stdout and a
// self-contained picture page (one HTML file, no network, light + dark) written to the temp folder, never into the project.
//   node ~/.claude/hooks/overview.mjs [project folder] [--no-html] [--out <file.html>]
// Reads the same files as the start-up check: the plan board, DECISIONS, the handoff, git. Changes nothing.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OWNER, PROJECTS_ROOT, locate, projectState, collectProjects, docPath, phaseFile, git, read } from "./lib/project-workflow.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const val = (n) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const folder = resolve(argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out") || process.cwd());
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));
const bar = (d, t, w = 10) => { const n = t ? Math.round((d / t) * w) : 0; return "■".repeat(n) + "□".repeat(w - n); };
const ageText = (days) => (days == null ? "no handoff" : days < 1 ? "today" : days < 2 ? "1 day ago" : `${Math.floor(days)} days ago`);
const realSteps = (p) => p.steps.filter((s) => s.status !== "dropped");
const stepId = (title) => (/^\S+/.exec(title) || [""])[0];

/** Grade of a step ("light" | "standard" | "strong") from its phase file (layout v2: PLAN.md), or null. */
function gradeOf(root, plan, step) {
  const id = stepId(step.title); if (!id) return null;
  const phase = plan.phases.find((p) => p.steps.includes(step));
  const pf = phase && phaseFile(root, phase.title);
  const text = (pf && existsSync(pf) ? read(pf) : "") + "\n" + read(docPath(root, "PLAN.md"));
  const m = new RegExp("\\*\\*\\s*" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b[^\\n]*?Grade:\\s*(light|standard|strong)", "i").exec(text);
  return m ? m[1].toLowerCase() : null;
}

function gitInfo(root) {
  let sub = ""; try { sub = JSON.parse(read(join(root, ".claude", "project-workflow.json"))).repoPath || ""; } catch {}
  const g = sub ? join(root, sub) : root;
  if (!existsSync(join(g, ".git"))) return null;
  const dirty = git(g, ["status", "--porcelain"]);
  return { branch: git(g, ["rev-parse", "--abbrev-ref", "HEAD"]) || "?", dirty: dirty ? dirty.split("\n").length : 0, last: git(g, ["log", "-1", "--format=%cs  %s"]) || "" };
}

function summarize(root, name) {
  const s = projectState(root), plan = s.plan, gi = gitInfo(root);
  const o = { name, root, hasPlan: !!plan, plan, decisions: s.decisions, handoffAge: s.handoff.exists ? s.handoff.ageDays : null, handoffWarnings: s.handoff.warnings || [], git: gi, layout: s.layout };
  if (plan) {
    o.now = plan.now; o.nowIndex = plan.now ? plan.phases.indexOf(plan.now) + 1 : null;
    o.next = plan.next && !plan.next.phaseOnly ? plan.next : null;
    o.nextGrade = o.next ? gradeOf(root, plan, o.next) : null;
    o.curSteps = plan.now ? realSteps(plan.now) : [];
    o.stepGrades = new Map(o.curSteps.map((st) => [st, gradeOf(root, plan, st)]));
  }
  return o;
}

function textOf(o) {
  const L = [`Project: ${o.name}`];
  if (!o.hasPlan) { L.push("No plan board yet: type /new-project (or /plan) to make one."); }
  else {
    const p = o.plan;
    L.push(`Overall: ${p.phasesDone}/${p.phasesTotal} phases, ${p.stepsDone}/${p.stepsTotal} steps  ${bar(p.stepsDone, p.stepsTotal, 20)}`);
    if (o.now) { const r = realSteps(o.now), d = r.filter((x) => x.status === "done").length; L.push(`Now: ${o.now.title}  ${bar(d, r.length)} ${d}/${r.length}`); }
    else L.push("Every phase is done or dropped.");
    if (o.next) L.push(`${o.next.status === "doing" ? "In progress" : "Next step"}: ${o.next.title}${o.nextGrade ? `  [grade: ${o.nextGrade}]` : ""}`);
    if (p.focus) L.push(`Plan focus (set by ${OWNER}, parallel work): ${trunc(p.focus, 170)}`);
    for (const w of p.warnings) L.push(`  ! ${trunc(w, 170)}`);
  }
  const waiting = [...o.decisions.open, ...o.decisions.proposed];
  L.push(`Waiting on ${OWNER}: ${waiting.length ? waiting.length + " decision(s): " + waiting.slice(0, 4).map((d) => d.id + " " + d.title).join("; ") + (waiting.length > 4 ? "; ..." : "") : "nothing"}`);
  L.push(`Handoff: ${ageText(o.handoffAge)}${o.handoffWarnings.length ? `, ${o.handoffWarnings.length} warning(s): ${trunc(o.handoffWarnings[0], 150)}` : ""}`);
  if (o.git) L.push(`Git: branch ${o.git.branch}, ${o.git.dirty ? o.git.dirty + " uncommitted file(s)" : "clean"}${o.git.last ? ", last commit " + o.git.last : ""}`);
  return L.join("\n");
}

const CSS = `:root{--bg:#f6f7f9;--card:#fff;--ink:#1c2128;--mute:#5b6572;--line:#d8dde3;--done:#1a7f37;--doing:#0b63ce;--todo:#8a94a0;--warn:#9a6700;--bad:#b42318;--chip:#eef1f5}
@media (prefers-color-scheme:dark){:root{--bg:#14171c;--card:#1c2128;--ink:#e6e9ee;--mute:#9aa4b0;--line:#323a45;--done:#56d364;--doing:#58a6ff;--todo:#7d8793;--warn:#e3b341;--bad:#ff7b72;--chip:#262d36}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1rem;margin:0 0 12px;color:var(--mute);font-weight:600;text-transform:none}
.sub{color:var(--mute);margin:0 0 24px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}
.hero{border-left:6px solid var(--doing)}.hero .big{font-size:1.3rem;margin:0}
.track{display:flex;gap:8px;overflow-x:auto;padding:0 0 4px;list-style:none;margin:0}.phase{flex:0 0 auto;min-width:132px;max-width:190px;border:2px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--card)}
.phase b{display:block;font-size:.8rem;color:var(--mute)}.phase span{display:block;font-size:.92rem;line-height:1.3;margin:2px 0 6px}.phase.done{border-color:var(--done)}.phase.doing{border-color:var(--doing);box-shadow:0 0 0 3px color-mix(in srgb,var(--doing) 25%,transparent)}.phase.dropped{opacity:.55;text-decoration:line-through}
.meter{height:6px;border-radius:3px;background:var(--chip);overflow:hidden}.meter i{display:block;height:100%;background:var(--doing)}.phase.done .meter i{background:var(--done)}
.tag{display:inline-block;font-size:.75rem;font-weight:600;border-radius:999px;padding:1px 8px;background:var(--chip);color:var(--ink);margin-left:6px}
.steps{list-style:none;margin:0;padding:0}.steps li{display:flex;gap:10px;align-items:baseline;padding:6px 8px;border-radius:8px}.steps li.cur{background:var(--chip);outline:2px solid var(--doing)}
.mark{flex:0 0 7.2em;font-size:.8rem;font-weight:700}.m-done{color:var(--done)}.m-doing{color:var(--doing)}.m-todo{color:var(--todo)}.m-dropped{color:var(--todo)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.grid .card{margin:0}ul.plain{margin:0;padding-left:18px}.warn{color:var(--warn)}.mute{color:var(--mute)}
.big{font-size:1.15rem;font-weight:600}.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
footer{color:var(--mute);font-size:.85rem;margin-top:24px}`;

const MARKS = { done: "DONE", doing: "IN PROGRESS", todo: "TO DO", dropped: "DROPPED" };
const pageShell = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><main>${body}<footer>Snapshot made ${esc(new Date().toLocaleString())}. It does not update by itself: type /overview again.</footer></main></body></html>`;

function htmlOne(o) {
  let b = `<h1>${esc(o.name)}</h1>`;
  if (!o.hasPlan) return pageShell(o.name + " overview", b + `<p class="sub">No plan board yet.</p><div class="card"><p class="big">Nothing to show yet</p><p>Type <b>/new-project</b> to plan this project, or <b>/plan</b> to add a status board.</p></div>`);
  const p = o.plan;
  b += `<p class="sub">${p.phasesDone} of ${p.phasesTotal} phases done &middot; ${p.stepsDone} of ${p.stepsTotal} steps${p.focus ? `<br>Plan focus (parallel work): ${esc(trunc(p.focus, 160))}` : ""}</p>`;
  if (o.next) b += `<div class="card hero"><h2>${o.next.status === "doing" ? "You are here: step in progress" : "You are here: next step"}</h2><p class="big">${esc(o.next.title)}${o.nextGrade ? `<span class="tag">${esc(o.nextGrade)}</span>` : ""}</p></div>`;
  b += `<div class="card"><h2>The whole plan</h2><ol class="track">` + p.phases.map((ph, i) => { const r = realSteps(ph), d = r.filter((x) => x.status === "done").length, pct = r.length ? Math.round((d / r.length) * 100) : (ph.status === "done" ? 100 : 0); return `<li class="phase ${ph.status}${ph === o.now ? " doing" : ""}"${ph === o.now ? ' aria-current="step"' : ""}><b>${esc(MARKS[ph.status])}${ph === o.now && ph.status !== "doing" ? " &middot; NOW" : ""}</b><span>${esc(ph.title)}</span><div class="meter" role="img" aria-label="${d} of ${r.length} steps done"><i style="width:${pct}%"></i></div></li>`; }).join("") + `</ol></div>`;
  if (o.now) {
    b += `<div class="card"><h2>Now: ${esc(o.now.title)}</h2><ul class="steps">` + o.curSteps.map((st) => { const cur = st === o.next; const g = o.stepGrades.get(st); return `<li${cur ? ' class="cur" aria-current="step"' : ""}><span class="mark m-${st.status}">${esc(MARKS[st.status])}</span><span>${esc(st.title)}${g ? `<span class="tag">${esc(g)}</span>` : ""}</span></li>`; }).join("") + `</ul></div>`;
  } else b += `<div class="card"><p class="big">Every phase is done or dropped.</p></div>`;
  const waiting = [...o.decisions.open, ...o.decisions.proposed];
  b += `<div class="grid"><div class="card"><h2>Waiting on ${esc(OWNER)}</h2>${waiting.length ? `<ul class="plain">${waiting.slice(0, 8).map((d) => `<li><b>${esc(d.id)}</b> ${esc(d.title)} <span class="mute">(${esc(d.status)})</span></li>`).join("")}</ul>` : `<p class="mute">Nothing.</p>`}</div>`;
  b += `<div class="card"><h2>Last handoff</h2><p class="big">${esc(ageText(o.handoffAge))}</p>${o.handoffWarnings.length ? `<ul class="plain warn">${o.handoffWarnings.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : `<p class="mute">No warnings.</p>`}</div>`;
  if (o.git) b += `<div class="card"><h2>Git</h2><p class="big">${esc(o.git.branch)}</p><p>${o.git.dirty ? `<span class="warn">${o.git.dirty} uncommitted file(s)</span>` : "Clean"}</p>${o.git.last ? `<p class="mute">Last commit ${esc(o.git.last)}</p>` : ""}</div>`;
  b += `</div>`;
  if (p.warnings.length) b += `<div class="card warn"><h2>Plan warnings</h2><ul class="plain">${p.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
  return pageShell(o.name + " overview", b);
}

function htmlAll(list) {
  const cards = list.map((o) => {
    if (!o.hasPlan) return `<div class="card"><h2>${esc(o.name)}</h2><p class="mute">No plan board yet.</p></div>`;
    const p = o.plan, pct = p.stepsTotal ? Math.round((p.stepsDone / p.stepsTotal) * 100) : 0;
    return `<div class="card"><h2>${esc(o.name)}</h2><p class="big">${p.phasesDone}/${p.phasesTotal} phases &middot; ${pct}%</p><div class="meter" role="img" aria-label="${p.stepsDone} of ${p.stepsTotal} steps done"><i style="width:${pct}%"></i></div><p>${o.next ? esc(o.next.title) : "All done"}${o.nextGrade ? `<span class="tag">${esc(o.nextGrade)}</span>` : ""}</p><p class="mute">Handoff ${esc(ageText(o.handoffAge))} &middot; ${o.decisions.open.length + o.decisions.proposed.length} decision(s) waiting</p></div>`;
  }).join("");
  return pageShell("All projects overview", `<h1>All projects</h1><p class="sub">${list.length} project folder(s)</p><div class="pgrid">${cards}</div>`);
}

const where = locate(folder);
let list, out, name;
if (where.kind === "project") { const o = summarize(where.root, where.name); list = [o]; out = textOf(o); name = where.name; }
else if (where.kind === "root") {
  list = collectProjects().map((r) => summarize(r.root, r.name)); name = "all-projects";
  out = `All projects (${list.length}):\n` + list.map((o) => o.hasPlan ? `  ${o.name.padEnd(28)} ${bar(o.plan.stepsDone, o.plan.stepsTotal)} ${o.plan.stepsDone}/${o.plan.stepsTotal} steps, next: ${o.next ? o.next.title : "(none)"}` : `  ${o.name.padEnd(28)} (no plan board yet)`).join("\n");
} else { console.log(`Not inside a project folder (${folder}). Open a chat in a project, or in the projects folder (${PROJECTS_ROOT}) to see all projects.`); process.exit(1); }

console.log(out);
if (!flag("no-html")) {
  const file = val("out") ? resolve(val("out")) : join(tmpdir(), "project-workflow-overview", name.replace(/[^\w.-]+/g, "_") + ".html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, where.kind === "project" ? htmlOne(list[0]) : htmlAll(list));
  console.log(`Picture page: ${file}`);
  console.log(`Open it with: file:///${file.replace(/\\/g, "/")}`);
}
