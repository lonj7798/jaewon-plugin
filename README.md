# jaewon-plugin

Personal Claude Code plugin with self-driving pipeline, TDD-first workflow, LOD-compliant planning, and Karpathy-style project wiki.

## Install

```bash
# 1. Add marketplace
claude plugin marketplace add lonj7798/jaewon-plugin

# 2. Install plugin
claude plugin install jaewon-plugin@jaewon-plugin

# 3. Restart Claude Code, then run setup
/jaewon-plugin:setup-jaewon
```

### Local dev

```bash
claude --plugin-dir ./jaewon-plugin
```

## Setup

Run `/jaewon-plugin:setup-jaewon` after installing. It asks one question:

```
What kind of project is this?

1. Empty project (recommended) — starting fresh
2. Existing project (recommended) — has code, will bootstrap wiki
3. Global setup — HUD + MCP only
```

| Mode | What it does |
|------|-------------|
| **Empty project** | Init `.jaewon/`, scaffold `docs/wiki/`, install MCP, configure HUD, create `dev` branch |
| **Existing project** | Same + spawns wiki-maintainer to scan your codebase and build wiki pages automatically. Agents immediately understand your project. |
| **Global** | Configure HUD statusline + verify MCP (no project state) |

After setup, your next step is:
- Empty project → `/jaewon-plugin:initial-plan` to plan your project
- Existing project → `/jaewon-plugin:initial-plan` or `/jaewon-plugin:add-feature`

## HUD Statusline

Persistent status bar at the bottom of your terminal:

```
[GREEN] v0.2 | dev ● | 3/8 done | 5h:[■■■■□□□□]52%(2h31m) wk:[■□□□□□□□]10%(6d20h) | session:45m | ctx:[■■■■■□□□□□]47% | opus
```

| Element | Source | What it shows |
|---------|--------|---------------|
| `[GREEN]` | SubagentStart hook | TDD phase color (RED/GREEN/YELLOW/BLUE/PURPLE/ORANGE/WHITE) |
| `v0.2` | status.json | Active plan version |
| `dev ●` | git | Branch + dirty indicator |
| `3/8 done` | checklist.json | Task progress + blocked count |
| `5h:[■■■■□□□□]52%` | OAuth API | 5-hour rate limit with reset countdown |
| `wk:[■□□□□□□□]10%` | OAuth API | Weekly rate limit with reset countdown |
| `session:45m` | status.json | Session duration |
| `ctx:[■■■■■□□□□□]47%` | Claude Code stdin | Context window usage (warns at 75%, critical at 90%) |
| `opus` | Claude Code stdin | Current model |

Setup: `/jaewon-plugin:hud-setup`

## Skills (12)

| Skill | Invoke | Purpose |
|-------|--------|---------|
| setup-jaewon | `/jaewon-plugin:setup-jaewon` | One-command project setup (state, wiki, MCP, HUD, git) |
| initial-plan | `/jaewon-plugin:initial-plan` | QA interview + Planner/Architect/Critic consensus loop |
| implement | `/jaewon-plugin:implement` | Execute plan with TDD agents (test-generator RED → implementer GREEN) |
| debug | `/jaewon-plugin:debug` | Isolated trace-then-fix debugging with debug-history |
| add-feature | `/jaewon-plugin:add-feature` | Feature branch + lighter planning + implement |
| hook-designer | `/jaewon-plugin:hook-designer` | Design, test, and install hooks iteratively |
| insights | `/jaewon-plugin:insights` | Usage analytics HTML report |
| status | `/jaewon-plugin:status` | Show full pipeline HUD on demand |
| hud-setup | `/jaewon-plugin:hud-setup` | Configure HUD statusline |
| smart-compact | `/jaewon-plugin:smart-compact` | Focus-aware compaction (up to 3 clarifying rounds) |
| skill-creator | `/jaewon-plugin:skill-creator` | Create, test, evaluate, and iterate skills with benchmarks |
| agent-development | `/jaewon-plugin:agent-development` | Create agents with frontmatter, examples, and validation |

Skills use progressive disclosure — core workflow loads on trigger (~100-150 LOC), reference files load only when needed.

## Agents (10)

| Agent | Model | Color | Role |
|-------|-------|-------|------|
| planner | opus | blue | Create LOD-compliant, TDD-first plans |
| architect | opus | blue | Review plans (APPROVE/ITERATE) with steelman antithesis |
| critic | opus | yellow | Quality gate (ACCEPT/REVISE) |
| test-generator | sonnet | red | Write tests first — TDD RED phase |
| implementer | sonnet | green | Make tests pass — TDD GREEN + REFACTOR |
| tracer | opus | magenta | Investigate bugs (read-only, competing hypotheses) |
| fixer | opus | green | Apply minimal fixes with regression tests |
| reviewer | opus | cyan | Severity-rated code review (read-only) |
| git-manager | sonnet | cyan | Branch/merge/tag with policy enforcement |
| wiki-maintainer | sonnet | magenta | Auto-maintain project wiki (Karpathy pattern) |

## Hooks (11)

| Hook | Event | What it does |
|------|-------|-------------|
| session-start | SessionStart | Init `.jaewon/`, restore state, inject handoff, wiki staleness check |
| subagent-start | SubagentStart | Set active phase + task in status.json (HUD shows what's happening) |
| subagent-tracker | SubagentStop | Update checklist + HUD progress + wiki task hint |
| stop-guard | Stop | Block stop if tasks remain in checklist |
| teammate-dispatcher | TeammateIdle | Assign next unblocked task to idle teammate |
| test-tracker | PostToolUse:Bash | Track test results + git commits + wiki commit hint |
| file-tracker | PostToolUse:Write\|Edit | Track file changes + LOD 800 LOC warning |
| pre-tool-enforcer | PreToolUse:Bash | Block dangerous commands, warn on main branch |
| pre-compact | PreCompact | Save handoff + read smart-compact focus + wiki lint hint |
| session-end | SessionEnd | Write summary + handoff + wiki log + auto-disable logging |
| task-sync | TaskCompleted | Sync TaskList with checklist.json |

## MCP Tools (10)

| Tool | Purpose |
|------|---------|
| jaewon_status | Read `.jaewon/status.json` |
| jaewon_status_update | Update specific status fields (deep merged) |
| jaewon_checklist_read | Read plan checklist with summary |
| jaewon_checklist_update | Update task status in checklist |
| jaewon_task_status | Get single task or counts |
| jaewon_logging_toggle | Enable/disable per-module debug logging |
| jaewon_debug_history | Search/add to bug knowledge base |
| jaewon_hud | Get formatted HUD display |
| jaewon_note_add | Append note to `.jaewon/notes/` |
| jaewon_plan_save | Save plan document to `docs/plans/` |

## Project Wiki (Karpathy LLM Wiki)

Auto-maintained knowledge base at `docs/wiki/` following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

```
docs/wiki/
├── index.md      # Auto-maintained catalog of all pages
├── log.md        # Chronological operations log
├── SCHEMA.md     # Conventions (120-line LOD limit, wikilinks, split protocol)
└── pages/        # Free-form wiki pages with [[wikilinks]]
```

- **Obsidian compatible** — open in Obsidian, graph view shows all connections
- **Auto-maintained** — hooks trigger wiki-maintainer agent on commits, task completion, and pre-compact
- **LOD compliant** — pages max 120 lines with calling-spec headers
- **Single writer** — only wiki-maintainer writes to wiki; all other agents read

## How It Works

```
Main Session (intent layer — understands your intent, writes agent briefs)
  │
  ├── initial-plan: Interview → Planner → Architect → Critic loop
  │     Output: docs/plans/v{X.Y}/ + checklist.json
  │
  ├── implement: Read checklist → spawn agents per task
  │     test-generator (RED) → implementer (GREEN) → commit
  │
  ├── Self-driving hooks keep pipeline running:
  │     SubagentStart: set active phase + task in status.json
  │     SubagentStop: update checklist + HUD progress
  │     Stop: block if tasks remain
  │     TeammateIdle: assign next unblocked task
  │
  ├── debug: Tracer investigates → fix plan → Fixer applies
  │
  ├── wiki-maintainer: Auto-updates docs/wiki/ on changes
  │
  └── HUD: Reads status.json → renders statusline every turn
```

## Per-Project State

`.jaewon/` is created automatically in each project:

```
.jaewon/
├── settings.json       # Configurable paths + preferences
├── status.json         # Current state (plan, session, git, HUD, tracking)
├── session-log.md      # Session history
├── context/handoff.md  # Zero-ramp-up next session
├── blocked/            # Failed task reports with proposals
├── debug-history/      # Bug knowledge base (index.json + patterns.md)
├── logs/               # Debug logs (per-module toggle)
├── architecture/       # File tree + dependencies
├── metrics/            # Test coverage, code health
├── notes/              # Project decisions
└── preferences/        # Coding style conventions
```

All paths configurable via `settings.json`. Per-project only (never global).

## Requirements

- Claude Code v2.1.80+
- Node.js 20+

## License

MIT
