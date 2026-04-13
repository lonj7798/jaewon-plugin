# jaewon-plugin

Personal Claude Code plugin with self-driving pipeline, TDD-first workflow, and LOD-compliant planning.

## Install

```bash
# Add marketplace
claude plugin marketplace add lonj7798/jaewon-plugin --branch dev

# Install
claude plugin install jaewon-plugin@jaewon-plugin
```

### Local dev

```bash
claude --plugin-dir ./jaewon-plugin
```

## What's Inside

### Skills (7)

| Skill | Invoke | Purpose |
|-------|--------|---------|
| initial-plan | `/jaewon-plugin:initial-plan` | QA interview + Planner/Architect/Critic loop |
| implement | `/jaewon-plugin:implement` | Execute plan with TDD agents |
| debug | `/jaewon-plugin:debug` | Trace-then-fix debugging |
| add-feature | `/jaewon-plugin:add-feature` | Feature branch + lighter planning |
| hook-designer | `/jaewon-plugin:hook-designer` | Design hooks interactively |
| insights | `/jaewon-plugin:insights` | Usage analytics HTML report |
| status | `/jaewon-plugin:status` | Show pipeline HUD |

### Agents (9)

| Agent | Model | Role |
|-------|-------|------|
| planner | opus | Create LOD-compliant plans |
| architect | opus | Review plans (APPROVE/ITERATE) |
| critic | opus | Quality gate (ACCEPT/REVISE) |
| test-generator | sonnet | Write tests first (TDD RED) |
| implementer | sonnet | Make tests pass (TDD GREEN) |
| tracer | opus | Investigate bugs (read-only) |
| fixer | opus | Apply minimal fixes |
| reviewer | opus | Code review (read-only) |
| git-manager | sonnet | Branch/merge/tag |

### Hooks (10)

| Hook | Event | Purpose |
|------|-------|---------|
| session-start | SessionStart | Init `.jaewon/`, restore state, inject context |
| session-end | SessionEnd | Write summary + handoff |
| stop-guard | Stop | Block stop if tasks remain |
| subagent-tracker | SubagentStop | Update checklist on agent done |
| teammate-dispatcher | TeammateIdle | Assign next task |
| pre-compact | PreCompact | Save context before compaction |
| pre-tool-enforcer | PreToolUse:Bash | Block dangerous commands |
| file-tracker | PostToolUse:Write\|Edit | LOD check (800 LOC limit) |
| test-tracker | PostToolUse:Bash | Capture test results |
| task-sync | TaskCompleted | Sync with checklist |

### MCP Tools (8)

| Tool | Purpose |
|------|---------|
| jaewon_status | Read project status |
| jaewon_status_update | Update status fields |
| jaewon_checklist_read | Read plan checklist |
| jaewon_checklist_update | Update task status |
| jaewon_task_status | Get task or summary |
| jaewon_logging_toggle | Toggle debug logging |
| jaewon_debug_history | Search past bugs |
| jaewon_hud | Get HUD display |

## How It Works

```
Main Session (intent layer)
  |
  |-- initial-plan: Interview + Planner -> Architect -> Critic loop
  |     Output: docs/plans/v{X.Y}/ + checklist.json
  |
  |-- implement: Read checklist, spawn agents per task
  |     test-generator (RED) -> implementer (GREEN) -> commit
  |
  |-- Self-driving hooks keep pipeline running:
  |     Stop: block if tasks remain
  |     SubagentStop: update checklist, find next task
  |     TeammateIdle: assign next unblocked task
  |
  |-- debug: Tracer investigates -> fix plan -> Fixer applies
  |
  |-- .jaewon/ tracks everything per-project
```

## Per-Project State

`.jaewon/` is created automatically in each project:

```
.jaewon/
├── settings.json       # Configurable paths + preferences
├── status.json         # Current state (plan, session, git, HUD)
├── session-log.md      # Session history
├── context/handoff.md  # Zero-ramp-up next session
├── blocked/            # Failed task reports
├── debug-history/      # Bug knowledge base
├── logs/               # Debug logs
├── architecture/       # File tree + dependencies
├── metrics/            # Test coverage, code health
├── notes/              # Project decisions
└── preferences/        # Coding style conventions
```

## Requirements

- Claude Code v2.1.80+
- Node.js 20+

## License

MIT
