---
name: status
description: Display current pipeline status, HUD, task progress, and session history. Shows full task list with colors, blocked items, and recent session log. Keywords: status, progress, hud, show status, where are we, what's the status.
---

<Purpose>
Status displays the current jaewon-plugin pipeline state on demand. It reads .jaewon/status.json and checklist.json to render a full HUD with task progress, TDD phases, blocked items, and recent session history. Use when you need to see where work stands.
</Purpose>

<Use_When>
- User asks "status", "progress", "where are we", "show status", "hud"
- User wants to see task completion state or blocked items
- User wants to understand current TDD phase or plan progress
</Use_When>

<Do_Not_Use_When>
- User wants to modify status -- use jaewon_status_update MCP tool
- User wants to plan -- use initial-plan skill
- User wants to execute tasks -- use implement or ralph
</Do_Not_Use_When>

<Steps>

## Step 1: Read State

1. Read `.jaewon/status.json` for project state, plan info, session data
2. Read checklist.json (path from status.plan.checklist_path) for task list
3. Read `.jaewon/session-log.md` for recent session history (last 5 entries)

## Step 2: Compute HUD

Determine HUD color based on current state:
- **RED**: Active task has tdd_stage=red (tests written, failing)
- **GREEN**: Active task has tdd_stage=green or all tasks done
- **YELLOW**: Refactoring or reviewing phase
- **BLUE**: Planning phase
- **PURPLE**: Investigating/debugging
- **WHITE**: Idle, no active plan
- **ORANGE**: All remaining tasks are blocked

## Step 3: Display Full Status

Present to user in this format:

```
## Pipeline Status

[COLOR] {version} | {done}/{total} done | {blocked} blocked | active: {task} ({tdd_stage})

### Plan
- Version: {version}
- Phase: {phase}
- Branch: {branch}

### Tasks
[x] task-1: Description
[>] task-2: Description [red]
[ ] task-3: Description
[!] task-4: Description [BLOCKED]

### Blocked Items
- {task_id}: {reason}

### Recent Sessions
Session #N — {start} to {end}
Plan: {version}, Tasks completed: {count}, Branch: {branch}
```

## Step 4: Suggest Next Action

Based on state, suggest what to do next:
- If tasks pending and unblocked: "Next task ready: {task_id} — {title}"
- If all blocked: "All tasks blocked. Resolve blockers first."
- If all done: "All tasks complete. Consider planning next version."
- If no plan: "No active plan. Run initial-plan to get started."

</Steps>

<Tool_Usage>
- `Read` for .jaewon/status.json, checklist.json, session-log.md
- `jaewon_status` MCP tool as alternative data source
- `jaewon_checklist_read` MCP tool as alternative for checklist
- No write operations — this skill is read-only
</Tool_Usage>

Task: {{ARGUMENTS}}
