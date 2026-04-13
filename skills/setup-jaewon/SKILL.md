---
name: setup-jaewon
description: One-time setup for jaewon-plugin. Initializes .jaewon/ state, installs MCP dependencies, configures HUD statusline, and bootstraps project wiki. Run this first after installing the plugin. Keywords: setup, init, initialize, configure, start, onboard.
disable-model-invocation: true
---

# Setup Jaewon

One command to set everything up. Run once per project.

## Step 1: Ask Project Type

Ask the user ONE question:

```
What kind of project is this?

1. Empty project (recommended) — starting fresh, will plan and build from scratch
2. Existing project (recommended) — has code already, needs wiki bootstrap + state setup
3. Global setup — configure HUD and settings for all projects (no project-specific state)
```

## Step 2: Route by Choice

### Choice 1: Empty Project

1. **Init .jaewon/**
   - Create `.jaewon/` with default `settings.json` and `status.json`
   - Create all subdirectories (notes, blocked, logs, context, debug-history, architecture, metrics, preferences)
   - Create `docs/wiki/` scaffold (SCHEMA.md, index.md, log.md, pages/)
   - Create `docs/plans/` and `docs/interview/` directories

2. **Install MCP dependencies**
   - Run `npm install` in `${CLAUDE_PLUGIN_ROOT}` if `node_modules/` is missing
   - Verify MCP server starts: `node ${CLAUDE_PLUGIN_ROOT}/mcp-server/server.js` (quick check)

3. **Configure HUD**
   - Check if `~/.claude/settings.json` has `statusLine` configured
   - If not: create `~/.claude/hud/` directory and write the HUD wrapper script
   - Add `statusLine` config pointing to the wrapper
   - Tell user to restart Claude Code for HUD to appear

4. **Git setup**
   - If git repo exists and `settings.json` has `git.auto_manage: true`: ensure `dev` branch exists
   - If no git repo: `git init` + create `dev` branch
   - Add `.jaewon/` to `.gitignore` if not already there

5. **Report**
   ```
   Setup complete!
   - .jaewon/ initialized with default settings
   - docs/wiki/ scaffolded (empty, ready for wiki-maintainer)
   - MCP server verified
   - HUD configured (restart Claude Code to see statusline)
   - Git: dev branch ready
   
   Next: /jaewon-plugin:initial-plan to start planning your project
   ```

### Choice 2: Existing Project

1. **Init .jaewon/** — same as empty project

2. **Install MCP dependencies** — same as empty project

3. **Configure HUD** — same as empty project

4. **Git setup** — same but don't `git init` (repo already exists). Just ensure `dev` branch.

5. **Bootstrap Wiki** — THIS IS THE KEY DIFFERENCE

   The project has existing code. The wiki needs to understand it. Spawn the wiki-maintainer agent to do a full initial ingest:

   ```
   Spawning wiki-maintainer to bootstrap the project wiki from existing code...
   ```

   Spawn `wiki-maintainer` agent with prompt:
   ```
   OPERATION: ingest (full bootstrap)
   
   This is a first-time wiki setup for an EXISTING project. Perform a complete scan:
   
   1. Read docs/wiki/SCHEMA.md for conventions
   2. Use Glob to find all source files (*.js, *.ts, *.py, *.mjs, *.cjs, *.md, etc.)
   3. Use Grep to find key patterns (exports, classes, main functions, config files)
   4. For each significant module/component:
      - Create a wiki page in docs/wiki/pages/
      - Include calling-spec header (scope, deps, see-also)
      - Add [[wikilinks]] to related pages
   5. Identify architectural decisions from README, CLAUDE.md, comments
      - Create decision pages for each
   6. Map the dependency graph between modules
      - Cross-reference via [[wikilinks]]
   7. Rebuild docs/wiki/index.md with all pages categorized
   8. Append initial ingest to docs/wiki/log.md
   
   Be thorough — this is the wiki's foundation. Future updates will be incremental.
   Keep each page under 120 lines (LOD limit). Split if larger.
   ```

   Wait for wiki-maintainer to complete. This may take a few minutes for large projects.

6. **Report**
   ```
   Setup complete!
   - .jaewon/ initialized
   - docs/wiki/ bootstrapped from existing code ({N} pages created)
   - MCP server verified
   - HUD configured (restart Claude Code to see statusline)
   - Git: dev branch ready
   
   The wiki now has context about your existing code. Agents can read it for project understanding.
   
   Next: /jaewon-plugin:initial-plan or /jaewon-plugin:add-feature
   ```

### Choice 3: Global Setup (no project state)

Only configure HUD and verify MCP — no `.jaewon/`, no wiki, no git.

1. **Configure HUD** — same as above
2. **Verify MCP** — check server starts
3. **Report**
   ```
   Global setup complete!
   - HUD configured (restart Claude Code)
   - MCP server verified
   
   Run /jaewon-plugin:setup-jaewon in a project directory for full project setup.
   ```

## Important Notes

- This skill is manual-only (`disable-model-invocation: true`)
- Safe to run multiple times (idempotent — skips what already exists)
- For existing projects, the wiki bootstrap can take 2-5 minutes depending on codebase size
- HUD requires Claude Code restart after first setup
- MCP dependencies are installed in `${CLAUDE_PLUGIN_DATA}` (persists across updates)

Task: {{ARGUMENTS}}
