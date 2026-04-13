# jaewon-plugin

Personal Claude Code plugin providing a self-driving pipeline, TDD-first workflow, and LOD-compliant planning. Manages session lifecycle, tracks work state per project, and orchestrates specialized agents.

## What This Plugin Does

- **Lifecycle manager**: hooks into SessionStart/End, Stop, SubagentStop to persist state and resume work automatically
- **Coding enhancer**: TDD-first agent chain (test-generator -> implementer -> reviewer)
- **Workflow automation**: self-driving pipeline that dispatches idle teammates and guards premature stops

## Self-Driving Pipeline

Three hooks form the core loop:

| Hook | Script | Purpose |
|------|--------|---------|
| `Stop` | `stop-guard.mjs` | Blocks exit if work is unverified; prompts next step |
| `SubagentStop` | `subagent-tracker.mjs` | Logs subagent results; updates `.jaewon/state.json` |
| `TeammateIdle` | `teammate-dispatcher.mjs` | Assigns queued tasks to idle teammates |

## Per-Project State

All runtime data lives in `.jaewon/` at project root:

```
.jaewon/
  state.json       # current phase, task list, agent assignments
  session.log      # session history
  checklist.md     # active checklist (read by jaewon_checklist_read)
  insights.md      # accumulated learnings
```

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `initial-plan` | "plan this", "let's start" | Interview -> LOD plan -> task breakdown |
| `implement` | "implement", "build" | TDD chain: test-generator -> implementer |
| `debug` | "debug", "fix" | tracer -> fixer with evidence gate |
| `add-feature` | "add feature", "extend" | plan -> implement -> review cycle |
| `hook-designer` | "design hook", "new hook" | Scaffold hook script + register in hooks.json |
| `insights` | "insights", "what did we learn" | Surface `.jaewon/insights.md` |
| `status` | "status", "where are we" | Print `.jaewon/state.json` summary |

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
| `git-manager` | Stages, commits, and pushes with correct message format |

## MCP Tools

| Tool | Description |
|------|-------------|
| `jaewon_status` | Current phase, active tasks, blockers |
| `jaewon_checklist_read` | Read `.jaewon/checklist.md` |
| `jaewon_checklist_update` | Mark checklist items done/in-progress |
| `jaewon_state_read` | Read raw `.jaewon/state.json` |
| `jaewon_state_write` | Update state fields |
| `jaewon_insights_append` | Append a learning to `.jaewon/insights.md` |
| `jaewon_session_log` | Append entry to `.jaewon/session.log` |

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
