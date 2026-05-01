# jaewon-plugin

Personal Claude Code plugin providing a self-driving pipeline, TDD-first workflow, and LOD-compliant planning. Manages session lifecycle, tracks work state per project, and orchestrates specialized agents.

## What This Plugin Does

- **Lifecycle manager**: hooks into SessionStart/End, Stop, SubagentStop to persist state and resume work automatically
- **Coding enhancer**: TDD-first agent chain (test-generator -> implementer -> reviewer)
- **Workflow automation**: self-driving pipeline that dispatches idle teammates and guards premature stops

## Project Wiki

Project knowledge base lives at `docs/wiki/`. Read it for context about modules, decisions, and project evolution. Do not write to it directly — the `wiki-maintainer` agent handles all updates automatically via hooks. See `docs/wiki/SCHEMA.md` for conventions.

## Self-Driving Pipeline

Three hooks form the core loop:

| Hook | Script | Purpose |
|------|--------|---------|
| `Stop` | `stop-guard.mjs` | Blocks exit if work is unverified; prompts next step |
| `SubagentStop` | `subagent-tracker.mjs` | Logs subagent results; updates checklist.json |
| `TeammateIdle` | `teammate-dispatcher.mjs` | Assigns queued tasks to idle teammates |

## Per-Project State

All runtime data lives in `.jaewon/` at project root:

```
.jaewon/
  settings.json    # configurable paths + preferences
  status.json      # current phase, task list, agent assignments
  progress.md      # live markdown table of task progress (auto-refreshed)
  session-log.md   # session history
  context/         # handoff.md for zero-ramp-up sessions
  blocked/         # failed task reports
  debug-history/   # bug knowledge base
  logs/            # debug logs
  notes/           # project decisions
  metrics/         # test coverage, code health
  architecture/    # file tree + dependencies
  preferences/     # coding style conventions
```

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `initial-plan` | "plan this", "let's start" | Interview -> LOD plan -> task breakdown |
| `implement` | "implement", "build" | TDD chain: test-generator -> implementer |
| `debug` | "debug", "fix" | tracer -> fixer with evidence gate |
| `add-feature` | "add feature", "extend" | plan -> implement -> review cycle |
| `hook-designer` | "design hook", "new hook" | Scaffold hook script + register in hooks.json |
| `error-healing` | "error", "fix error", "heal" | Fast-path error fix with verification |
| `insights` | "insights", "what did we learn" | Generate usage analytics HTML dashboard |
| `status` | "status", "where are we" | Print `.jaewon/status.json` summary |
| `hud-setup` | "setup hud", "statusline" | Configure Claude Code statusline |
| `smart-compact` | "smart compact" | Focus-aware context compaction |
| `setup-jaewon` | "setup jaewon" | Initialize plugin for a project |
| `skill-creator` | "create skill", "new skill" | Create, test, and optimize skills |
| `agent-development` | "create agent", "new agent" | Guide for building agent definitions |
| `retrieve` | "retrieve", "lookup", "have we seen" | Spawn retrieval-agent to fetch info across lanes without bloating main context |

## Agents

| Agent | Role |
|-------|------|
| `planner` | Converts requirements into LOD-compliant task plans |
| `architect` | Reviews system design and interface contracts |
| `critic` | Challenges assumptions; finds scope creep |
| `test-generator` | Writes failing tests before implementation |
| `implementer` | Makes tests pass with minimal viable code |
| `tracer` | Traces call chains to locate bug root cause |
| `fixer` | Applies targeted fix after tracer confirms root cause |
| `reviewer` | Code review against codebase patterns |
| `wiki-maintainer` | Maintains project wiki pages and index |
| `git-manager` | Stages, commits, and pushes with correct message format |
| `retrieval-agent` | Read-only retrieval lane: distills answers from project, .jaewon, wiki, git, web |

## MCP Tools

| Tool | Description |
|------|-------------|
| `jaewon_status` | Read current `.jaewon/status.json` |
| `jaewon_status_update` | Update specific status fields (deep merged) |
| `jaewon_checklist_read` | Read plan checklist with task summary |
| `jaewon_checklist_update` | Update task status in checklist |
| `jaewon_task_status` | Get single task or summary counts |
| `jaewon_logging_toggle` | Enable/disable per-module debug logging |
| `jaewon_debug_history` | Search/add to bug knowledge base |
| `jaewon_hud` | Get HUD display with pipeline status |
| `jaewon_note_add` | Append note to `.jaewon/notes/` |
| `jaewon_plan_save` | Save plan document to `docs/plans/` |

## LOD Hard Rules

1. **No speculative work** — implement only what a failing test demands
2. **One abstraction at a time** — no helper classes for single-use logic
3. **Smallest viable diff** — stop when tests pass, do not polish further
4. **No scope creep** — adjacent code is read-only unless it breaks tests
5. **Evidence before claims** — run verification commands; never assume pass

## TDD Workflow

```
test-generator  ->  implementer  ->  reviewer
     |                  |               |
  writes             makes tests      approves or
  failing            pass with        requests fixes
  tests              minimal code
```

Invoked automatically by the `implement` and `add-feature` skills. Each stage gates the next: implementer does not run until test-generator produces a failing test; reviewer does not run until all tests pass.

## Hook Scripts

All hooks read stdin (JSON event payload) and write structured output to stdout. They are loaded via `run.cjs` which handles ESM interop:

```
hooks/
  run.cjs                  # CJS loader for .mjs hook scripts
  session-start.mjs        # Initialize .jaewon/ for the session
  stop-guard.mjs           # Block stop if work is unverified
  subagent-tracker.mjs     # Record subagent completion in state
  teammate-dispatcher.mjs  # Assign tasks to idle teammates
  pre-compact.mjs          # Flush state before context compaction
  session-end.mjs          # Persist final state and write insights
  pre-tool-enforcer.mjs    # Enforce LOD rules on Bash tool calls
  file-tracker.mjs         # Log file writes/edits to state
  test-tracker.mjs         # Detect test runs and update checklist
  task-sync.mjs            # Sync TaskCompleted events to state
  lib/                     # Shared utilities (state I/O, logging)
```
