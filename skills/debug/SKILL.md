---
name: debug
description: Plan-then-fix debugging workflow. Traces the full call chain to find root cause, then applies targeted fixes with regression tests. Orchestrates tracer (investigation) and fixer (repair) agents with debug history tracking. Keywords: debug, bug, fix, trace, investigate, root cause, regression.
---

<Purpose>
Debug is the plan-then-fix debugging skill -- analogous to initial-plan + implement, but for bugs instead of features. It takes a user-reported symptom and orchestrates a structured investigation (tracer) followed by targeted repair (fixer). The main session is the intent layer: it enables logging, spawns agents, tracks progress via checklist.json, and records results in .jaewon/debug-history/. It NEVER writes fixes itself.
</Purpose>

<Use_When>
- User says "debug", "bug", "fix", "trace", "investigate", "root cause"
- User reports unexpected behavior, errors, or test failures
- User describes a symptom that needs systematic investigation before fixing
- A hook or tool is producing wrong output or crashing
</Use_When>

<Do_Not_Use_When>
- User wants to implement a new feature -- use `implement` skill
- User wants to plan a new project -- use `initial-plan` skill
- User knows the exact fix and just wants it applied -- delegate to executor directly
- The issue is a configuration problem, not a code bug -- help directly
</Do_Not_Use_When>

<Execution_Policy>
- Main session ORCHESTRATES only -- it never writes production or test code
- Tracer is spawned in READ-ONLY isolation -- it cannot modify files
- Fixer is spawned per fix task with the tracer's Investigation Report as input
- TEAMMATE first for agent dispatch; Agent fallback if teams unavailable
- Parallel fixes when fix tasks are independent; sequential when dependent
- All fix tasks follow RED-then-GREEN: regression test (RED) then fix (GREEN)
- Reuses the implement skill's checklist.json format for fix task tracking
- Debug history is updated after every completed fix
- Logging is enabled at investigation start and disabled after all fixes complete
</Execution_Policy>

<Steps>

## Step 1: Receive Bug Report

1. User describes a symptom (error message, unexpected behavior, test failure)
2. Extract key information:
   - What was expected to happen
   - What actually happened
   - Error message or output (if provided)
   - Which module, tool, or hook is affected (if known)
   - Steps to reproduce (if known)
3. If the report is too vague, ask ONE clarifying question (do not batch questions)
4. Display: "Starting debug investigation for: {one-sentence summary}"

## Step 2: Enable Logging

1. Identify affected modules from the bug report
2. Call `jaewon_logging_toggle` MCP tool:
   - action: "enable"
   - level: "debug"
   - modules: [{affected modules}] (or ["*"] if module is unknown)
3. Display: "Debug logging enabled for: {modules}"

## Step 3: Check Debug History

1. Call `jaewon_debug_history` MCP tool:
   - action: "search"
   - query: {key terms from the bug report}
2. If matches found:
   - Display past similar bugs and their resolutions
   - Include this context in the tracer brief
3. If no matches: note "No similar past bugs found" and proceed

## Step 4: Spawn Tracer (Investigation)

Spawn the tracer agent in read-only isolation:

**Teammate** (preferred):
```
SendMessage(teammate_id, tracer_brief)
```

**Agent** (fallback):
```
Task(subagent_type="jaewon-plugin:tracer", model="opus", prompt=tracer_brief)
```

### Tracer Brief
```markdown
## Investigation Brief

**Symptom**: {user's bug description}
**Affected module**: {module name if known}
**Error message**: {exact error if provided}
**Steps to reproduce**: {if provided}

### Context
- Debug history matches: {past similar bugs or "none"}
- Logging status: enabled for {modules} at {level}
- Recent changes: {git log --oneline -5 if relevant}

### Instructions
You are tracer. Investigate this bug following your full investigation process.
Produce an Investigation Report with:
- Full call chain from entry to symptom
- At least 2 competing hypotheses with evidence
- Root cause with symptom layer vs fix layer identified
- Targeted fix plan

Save the Investigation Report to docs/plans/{plan-version}/debug-{bug-slug}.md
```

Wait for tracer completion. Validate the Investigation Report has all required sections.

If tracer returns INCONCLUSIVE:
- Display findings to user with recommended next steps
- Ask user for additional context
- Re-spawn tracer with augmented brief (max 2 re-investigations)

## Step 5: Create Fix Checklist

From the tracer's fix plan, create fix tasks in checklist.json format:

```json
{
  "version": "1.0",
  "plan": "debug-{bug-slug}",
  "generated": "{ISO date}",
  "phases": [
    {
      "id": "debug-1",
      "name": "Bug Fix: {bug summary}",
      "tasks": [
        {
          "id": "debug-1.1",
          "title": "Regression test for {bug}",
          "type": "test",
          "status": "pending",
          "depends_on": [],
          "tdd_stage": null
        },
        {
          "id": "debug-1.2",
          "title": "Fix: {fix description}",
          "type": "fix",
          "status": "pending",
          "depends_on": ["debug-1.1"],
          "tdd_stage": null
        }
      ]
    }
  ]
}
```

For multi-file fixes:
- Independent fixes get parallel tasks (no depends_on between them)
- Dependent fixes are sequential (depends_on chains)
- Each fix task gets its own regression test task

Save or update checklist.json via `jaewon_checklist_update` or direct Write.

## Step 6: Spawn Fixer (Repair)

For each fix task, spawn a fixer agent:

**Teammate** (preferred):
```
SendMessage(teammate_id, fixer_brief)
```

**Agent** (fallback):
```
Task(subagent_type="jaewon-plugin:fixer", model="opus", prompt=fixer_brief)
```

### Fixer Brief
```markdown
## Fix Brief: {task-id}

**Bug**: {one-sentence description}
**Task**: {task-id} - {title}
**Investigation Report**: {path to tracer's report}

### Fix Plan (from tracer)
- **Target**: {file(s) to modify}
- **Change**: {precise description}
- **Regression test**: {what the test should assert}
- **Verification**: {how to confirm}
- **Risk**: {what could break}

### Instructions
You are fixer. Follow your full fix process:
1. Write regression test that reproduces the bug (RED)
2. Verify test FAILS
3. Apply minimal fix (GREEN)
4. Verify test PASSES
5. Run full test suite
6. Commit as: fix: {description} [{task-id}]

Report: FIXED, BLOCKED, or PARTIAL with full Fix Report.
```

### Dispatch Rules
- **Independent fixes**: spawn all fixers in parallel (max 4 concurrent)
- **Dependent fixes**: spawn sequentially, waiting for each to complete
- **Blocked fixer**: record in .jaewon/blocked/{task-id}.md, continue with others
- **Failed fixer** (5 attempts): mark task as blocked, escalate to user

## Step 7: Update Debug History

After all fixes complete (or all remaining are blocked):

1. Call `jaewon_debug_history` MCP tool for each resolved bug:
   - action: "add"
   - entry: {
       name: "{bug name}",
       symptom: "{user's original description}",
       root_cause: "{from tracer's report}",
       fix_layer: "{from tracer's report}",
       fix_description: "{from fixer's report}",
       regression_test: "{test file and name}",
       resolved: true/false
     }
2. Display: "Debug history updated with {N} entries"

## Step 8: Disable Logging

1. Call `jaewon_logging_toggle` MCP tool:
   - action: "disable"
2. Display: "Debug logging disabled"

## Step 9: Completion Summary

Display to user:
- Bug summary (one sentence)
- Investigation result: root cause found / inconclusive
- Fixes applied: {count} of {total}
- Fixes blocked: {count} (with reasons)
- Regression tests added: {count}
- Commits: {list of commit hashes and messages}
- Debug history: entry recorded at .jaewon/debug-history/{id}.md

Update `.jaewon/status.json`:
- Set `plan.phase` to previous phase (or "idle" if no active plan)
- Update `hud.last_updated`

</Steps>

<Tool_Usage>
- `jaewon_logging_toggle` to enable/disable debug logging per module
- `jaewon_debug_history` to search past bugs and record new entries
- `jaewon_checklist_read` / `jaewon_checklist_update` to track fix tasks
- `jaewon_status` / `jaewon_status_update` to read/write project state
- `Read` for Investigation Reports, fix plans, and blocked files
- `Write` for fix task briefs, checklist updates, blocked reports
- `Bash` for git operations (log, diff, status)
- `SendMessage` for teammate dispatch (preferred); `Task()` for agent fallback
- Do NOT write code in the main session -- always spawn tracer or fixer agents
</Tool_Usage>

<Examples>
<Good>
```
[User reports: "checklist update returns success but task status does not change"]
[Enables logging for checklist-handler module]
[Searches debug history -- no matches]
[Spawns tracer with full brief]
[Tracer returns: root cause is stale checklist read in concurrent access]
[Creates fix checklist with 1 regression test + 1 fix task]
[Spawns fixer with tracer's Investigation Report]
[Fixer: writes test (RED), applies fix (GREEN), full suite passes, commits]
[Updates debug history]
[Disables logging]
[Displays completion summary]
```
Why good: Full pipeline executed. Tracer investigated before any fix. Fixer followed RED-then-GREEN. History updated.
</Good>

<Bad>
```
[User reports bug]
[Main session reads the code and applies a fix directly]
```
Why bad: Main session must never write fixes. Spawn tracer first, then fixer.
</Bad>

<Bad>
```
[User reports bug]
[Spawns fixer immediately without tracer investigation]
```
Why bad: Fixing without investigation risks fixing the wrong layer. Always trace first.
</Bad>

<Bad>
```
[Tracer returns INCONCLUSIVE]
[Spawns fixer anyway with a guess]
```
Why bad: INCONCLUSIVE means the root cause is not confirmed. Re-investigate or ask the user for more context. Never fix based on guesses.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Tracer returns INCONCLUSIVE twice: present findings to user, ask for guidance
- Fixer blocked after 5 attempts: mark permanently blocked, continue with other fixes
- All fixes blocked: exit, report partial completion with blocked details
- User says "just fix it" without investigation: explain why tracing matters, offer quick-fix mode as explicit opt-in
- No test framework available: report BLOCKED, recommend setup before debug workflow
- Bug is in a dependency (node_modules): document workaround, do not modify dependency
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Bug symptom understood and summarized
- [ ] Debug logging enabled for affected modules
- [ ] Debug history searched for similar past bugs
- [ ] Tracer spawned with complete brief (read-only, isolated)
- [ ] Investigation Report validated (call chain, hypotheses, root cause, fix plan)
- [ ] Fix checklist created in checklist.json format
- [ ] Fixer spawned per fix task with Investigation Report as input
- [ ] Regression test written BEFORE fix (RED confirmed)
- [ ] Fix applied and regression test passes (GREEN confirmed)
- [ ] Full test suite passes after fix
- [ ] Debug history updated with results
- [ ] Debug logging disabled
- [ ] Completion summary displayed to user
- [ ] .jaewon/status.json updated
</Final_Checklist>

Task: {{ARGUMENTS}}
