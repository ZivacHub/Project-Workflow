// "Is there a newer workflow version?": used by the start-up check, only on machines where the installer ran
// (~/.claude/project-workflow-install.json exists). At most one request per day (cached in ~/.claude/project-workflow-update.json), 2.5 s timeout,
// silent when offline, never installs anything. Turn it off with {"updateCheck": false} in project-workflow-config.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { HOME_CLAUDE } from "./project-workflow.mjs";

const DAY = 864e5, HOUR = 36e5;
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return null; } };
const parts = (v) => String(v).split(".").map((n) => parseInt(n, 10) || 0);
export const isNewer = (a, b) => { const x = parts(a), y = parts(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

// node:http(s) with a closed connection, not fetch: the start-up check ends with process.exit(), and a half-closed fetch socket made
// Node abort on Windows (libuv assertion, non-zero exit). Here the promise settles only after the socket is closed.
function fetchVersion(url) {
  return new Promise((resolve, reject) => {
    let body = "", status = 0, err = null;
    const get = url.startsWith("https:") ? httpsGet : httpGet;
    const req = get(url, { agent: false, timeout: 2500, headers: { "user-agent": "project-workflow-update-check", connection: "close" } }, (res) => {
      status = res.statusCode; res.setEncoding("utf8");
      res.on("data", (d) => { if (body.length < 200) body += d; });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => { err = e; });
    req.on("close", () => {
      if (err) return reject(err);
      const v = body.trim();
      if (status !== 200) return reject(new Error("HTTP " + status));
      if (!/^\d+\.\d+\.\d+$/.test(v)) return reject(new Error("not a version"));
      resolve(v);
    });
  });
}

/** One line for Claude to pass on to the owner, or "" when there is nothing to say. */
export async function updateNotice(now = Date.now()) {
  const inst = readJson(join(HOME_CLAUDE, "project-workflow-install.json"));
  if (!inst?.version) return "";
  if ((readJson(join(HOME_CLAUDE, "project-workflow-config.json")) || {}).updateCheck === false) return "";
  const url = process.env.PROJECT_WORKFLOW_UPDATE_URL || inst.updateUrl;
  if (!url) return "";
  const stateFile = join(HOME_CLAUDE, "project-workflow-update.json");
  const st = readJson(stateFile) || {};
  let latest = st.latest;
  if ((!st.checkedAt || now - st.checkedAt > DAY) && (!st.failedAt || now - st.failedAt > HOUR)) {
    try { latest = await fetchVersion(url); writeFileSync(stateFile, JSON.stringify({ checkedAt: now, latest }) + "\n"); }
    catch { try { writeFileSync(stateFile, JSON.stringify({ ...st, failedAt: now }) + "\n"); } catch {} }
  }
  if (latest && isNewer(latest, inst.version))
    return `UPDATE AVAILABLE: Project Workflow v${latest} is out (installed: v${inst.version}). Mention it to the owner ONCE this session, in one plain line: "Workflow v${latest} is available (you have v${inst.version}). Say 'update workflow' to see what changed." Then carry on. Never update by yourself; the \`update-workflow\` skill does it on the owner's OK.`;
  return "";
}
