---
name: update-workflow
description: Show what changed in a newer version of the Project Workflow and update it, only on the owner's OK. Use when the owner says "update workflow", "is there a new version", "update the templates", or after the start-up check mentioned that a newer workflow version is available.
---

# Update workflow

The workflow (skills, scripts, template, rules block) was installed by `install.mjs` from a copy of its git repository. `~/.claude/project-workflow-install.json` records the installed version and `sourceDir`, the folder of that copy. Never update by yourself: show what changes, wait for the owner's OK.

## Steps
1. **Check the state:** run `node <sourceDir>/install.mjs check` (get `sourceDir` and `version` from `~/.claude/project-workflow-install.json`). If `sourceDir` no longer exists, tell the owner in plain words that the folder they installed from is gone and they need to download the workflow repository again, then run its `install.mjs update` themselves.
2. **Get the newer version:** if `sourceDir` is a git clone (`git -C <sourceDir> rev-parse` works), tell the owner you will run `git -C <sourceDir> pull` and wait for a yes, then run it. Otherwise ask them to download the newer repository over it.
3. **Show what is new:** read `<sourceDir>/CHANGELOG.md` and tell the owner, in plain words and in 5 lines at most, what changed between their version and the new one, and which of their files an update would replace (`node <sourceDir>/install.mjs update --dry-run`).
4. **Ask (choice card):** update now / not now. "Not now" is fine: say nothing more about it this session.
5. **Update:** `node <sourceDir>/install.mjs update`. It backs up what it replaces, replaces only files it installed and the owner never edited, and lists any file it skipped because the owner changed it. Show that list.
6. **Prove it:** `node <sourceDir>/install.mjs check` must print OK; mention that already open chats keep the old text until a new chat starts. If any of their projects is behind the template version, offer the `project-sync` skill (it asks per project).
