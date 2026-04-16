---
name: implement
description: Execute an implementation plan phase by phase. Reads checklist.json, spawns test-generator (RED) and implementer (GREEN) agents per task, manages parallel/sequential execution, and tracks progress. The self-driving hooks (Stop/SubagentStop/TeammateIdle) keep the pipeline running autonomously. Keywords: implement, execute, build, run plan, start building, execute plan.
---

<Purpose>
Execute a plan's tasks through TDD workflow. The main session is the intent layer -- it reads the checklist, writes briefs, spawns agents, and tracks progress. It NEVER writes code itself. All code changes happen inside spawned test-generator and implementer agents. The self-driving hooks (Stop, SubagentStop, TeammateIdle) keep the pipeline running autonomously.
</Purpose>

<Use_When>
- User says "implement", "execute", "build", "run plan", "start building", "execute plan"
- A versioned plan with `checklist.json` exists in `docs/plans/v{X.Y}/`
- `.jaewon/status.json` has `plan.current_version` set
</Use_When>

<Do_Not_Use_When>
- No plan exists yet -- use `initial-plan` first
- User wants to plan or re-plan -- use `initial-plan`
- User wants a single quick fix -- delegate to executor directly
- User wants to debug an existing failure -- use `debug` skill
</Do_Not_Use_When>

<Execution_Policy>
- Main session ORCHESTRATES only -- it never writes production or test code
- Brief quality determines agent output quality; invest time crafting precise briefs
- TEAMMATE first for parallel execution; Agent fallback if teams unavailable
- Each agent gets a fresh context with only its brief -- no inherited noise
- No session history, no accumulated state, no adjacent task context passed to agents
- All tasks follow TDD: test-generator (RED) then implementer (GREEN/REFACTOR)
- Commits per task: `{type}(phase-N): {description} [{task-id}]`
- Maximum 4 concurrent tasks per parallel batch; split larger batches into sub-batches
- Wait for sub-batch completion before starting the next sub-batch
- Self-driving hooks (Stop/SubagentStop/TeammateIdle) assist the execution loop
- Re-read `checklist.json` before each batch to avoid stale state
</Execution_Policy>

<Steps>

## Step 1: Load Plan

1. Read `.jaewon/status.json` for `plan.current_version` and `plan.checklist_path`
2. If no active plan: stop and suggest running `initial-plan` first
3. Read `checklist.json` from plan directory; parse all phases and tasks
4. Display: plan version, total/done/pending/blocked task counts
5. If all tasks done: announce completion and exit
6. Update `.jaewon/status.json` with `plan.phase: "implement"`

## Step 2: Analyze Dependencies

1. Flatten all tasks, filter to `status: "pending"` only
2. Group into:
   - **Parallel batch**: all `depends_on` satisfied AND `parallel: true`
   - **Sequential queue**: unsatisfied `depends_on` or `parallel: false`
3. Display execution plan (batch contents + waiting tasks with unmet deps)
4. If parallel batch empty: pick first sequential task whose deps are met

## Step 3: Execute Tasks

For each task in batch, run 3a-3d. Parallel batch tasks dispatch concurrently; sequential tasks run one at a time.

### 3a: Write Task Brief

Main session creates a focused brief -- the ONLY input spawned agents receive:

```markdown
## Task Brief: {task-id}
- Task: {title} ({task-id}), Phase: {phase-name}, Type: {type}, TDD Stage: {tdd_stage}
- Plan doc: {path}, Relevant files: {list}, Completed deps: {list}
- LOD: Single Responsibility, smallest viable diff, no scope creep
- Test file: {path}, Coverage: {target}, Stage: RED or GREEN
- Done when: {criteria}, all tests pass, committed as {format}
- If blocked: write to `.jaewon/blocked/{task-id}.md` with attempts, errors, alternatives
```

### 3b: Spawn Test-Generator (RED)

Teammate preferred, Agent fallback:
- **Teammate**: `SendMessage(teammate_id, brief + "You are test-generator. Write failing tests. Verify they FAIL.")`
- **Agent**: `Task(subagent_type="oh-my-claudecode:executor", model="sonnet", prompt="You are test-generator. {brief}. Return: test file path, test count, all-failing confirmation.")`

Wait for completion. Validate: test file path, test count, all-failing confirmation. If blocked: record and skip.

### 3c: Spawn Implementer (GREEN + REFACTOR)

Augment brief with test-generator output (test file path, test names, notes).
- **Teammate**: `SendMessage(teammate_id, augmented_brief + "You are implementer. Make tests pass. Refactor. Commit.")`
- **Agent**: `Task(subagent_type="oh-my-claudecode:executor", model="sonnet", prompt="You are implementer. {augmented_brief}. Return: status, files changed, commit hash.")`

Wait for completion. Validate: status, files changed, commit hash (if done). If blocked: record.

### 3d: Update Checklist

1. Re-read `checklist.json` (avoid stale state)
2. Set done tasks: `status: "done"`, `tdd_stage: "refactor"`
3. Set blocked tasks: `status: "blocked"`, `tdd_stage` to failing stage
4. Write updated `checklist.json`; update `.jaewon/status.json` counts

## Step 4: Handle Results

### Done Tasks
Log in session (task id, commit hash, files changed). These unlock dependent tasks.

### Blocked Tasks
Write `.jaewon/blocked/{task-id}.md` with: all attempts (up to 5), error details, proposed alternatives, retry count. On retry: re-spawn failing agent with previous error context.

### Test Disputes
When implementer flags a test as wrong:
1. Implementer writes `.jaewon/blocked/{task-id}-dispute.md` (disputed test, reason, evidence)
2. Main session re-spawns test-generator with dispute context
3. Test-generator either fixes test (re-run from 3b) or confirms correct (re-spawn implementer)
4. After 2 confirmed-correct disputes on same task: escalate to user with full context (disputed test code, both explanations, both implementer attempts)

## Step 5: Loop

1. After batch completes, re-read `checklist.json`
2. Recalculate dependency graph; build new parallel batch from newly eligible tasks
3. Repeat Steps 2-4 until:
   - All tasks `"done"` -- proceed to Step 6
   - All remaining tasks `"blocked"` -- proceed to Step 6
   - No progress in a full iteration -- break and report stalemate

Hook assistance: SubagentStop logs results and nudges next dispatch; TeammateIdle assigns queued tasks; Stop blocks premature exit.

## Step 6: Completion

1. Display summary: tasks done/total, tasks blocked/total, commit count, blocked task list
2. Validate completion state:
   - No stale `"in_progress"` tasks
   - No `"pending"` tasks whose deps are all done (missed tasks)
   - Warn user if stale tasks found
3. Update `.jaewon/status.json`: `plan.phase` ("done"/"blocked"), `last_implement_run`, `tasks_done`, `tasks_blocked`

</Steps>

<Tool_Usage>
- `Read` for `.jaewon/status.json`, `checklist.json`, plan docs, blocked/dispute files
- `Write` for task briefs, `checklist.json` updates, blocked task files, dispute files
- `Bash` for git operations (log commits, verify branches)
- `SendMessage` for teammate dispatch (preferred); `TeamCreate`/`TeamDelete` for pools
- `Task(subagent_type="oh-my-claudecode:executor", model="sonnet")` for agent fallback
- `jaewon_status_update`/`jaewon_status` for `.jaewon/status.json`
- `jaewon_checklist_update` for checklist items (when MCP tools available)
- Do NOT write code in the main session -- always spawn agents
</Tool_Usage>

<Examples>
<Good>
```
[Reads checklist, finds 3 parallel tasks]
[Writes brief for P1-T1, spawns test-generator teammate]
[Writes brief for P1-T2, spawns test-generator teammate]
[Writes brief for P1-T3, spawns test-generator teammate]
[Waits for all test-generators]
[Spawns implementer for each with augmented briefs]
```
Why good: Parallel dispatch, each agent gets only its brief, main session writes no code.
</Good>

<Bad>
```
[Main session writes the test file directly]
```
Why bad: Main session must never write code. Spawn agents instead.
</Bad>

<Bad>
```
[Spawns implementer without waiting for test-generator]
```
Why bad: TDD requires RED before GREEN. Implementer needs tests from test-generator.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- No plan found: stop and suggest `initial-plan`
- All tasks done: announce completion and exit
- Task blocked after 5 retries: mark permanently blocked, continue with others
- All remaining blocked: exit loop, report partial completion
- No progress in full loop: break, report stalemate
- 2 confirmed test disputes: escalate to user
- Git conflict: record in blocked file, continue
- Team creation fails: fall back to Agent dispatch silently
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] `.jaewon/status.json` read and plan version confirmed
- [ ] `checklist.json` loaded and task summary displayed
- [ ] Dependency graph calculated and execution plan shown
- [ ] Task briefs written with full context for each spawned agent
- [ ] Test-generator (RED) completed before implementer (GREEN/REFACTOR)
- [ ] `checklist.json` updated after each task completion/block
- [ ] Blocked tasks recorded in `.jaewon/blocked/{task-id}.md`
- [ ] Test disputes handled (max 2 confirmed before user escalation)
- [ ] Loop continued until all done or all remaining blocked
- [ ] Completion summary displayed; `.jaewon/status.json` updated
- [ ] No stale `in_progress` or missed `pending` tasks remain
</Final_Checklist>

Task: {{ARGUMENTS}}
