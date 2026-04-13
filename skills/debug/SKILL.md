---
name: debug
description: Plan-then-fix debugging workflow. Traces the full call chain to find root cause, then applies targeted fixes with regression tests. Orchestrates tracer (investigation) and fixer (repair) agents with debug history tracking. Keywords: debug, bug, fix, trace, investigate, root cause, regression.
---

<Purpose>
Debug is the plan-then-fix debugging skill. It takes a user-reported symptom and orchestrates a structured investigation (tracer) followed by targeted repair (fixer). The main session is the intent layer: it enables logging, spawns agents, tracks progress via checklist.json, and records results in .jaewon/debug-history/. It NEVER writes fixes itself.
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
- Debug history is updated after every completed fix
- Logging is enabled at investigation start and disabled after all fixes complete
</Execution_Policy>

<Steps>

## Step 1: Receive Bug Report
Extract: expected vs actual behavior, error message, affected module, repro steps.
If too vague, ask ONE clarifying question. Display: "Starting debug investigation for: {summary}"

## Step 2: Enable Logging
Call `jaewon_logging_toggle` (action: "enable", level: "debug", modules: [{affected}] or ["*"]).

## Step 3: Check Debug History
Call `jaewon_debug_history` (action: "search", query: {key terms}). Include matches in tracer brief.

## Step 4: Spawn Tracer (Investigation)
Read [tracer-brief.md](${CLAUDE_SKILL_DIR}/references/tracer-brief.md) for the full tracer brief template.
Spawn read-only tracer agent. Validate the Investigation Report has: call chain, hypotheses, root cause, fix plan.

## Step 5: Create Fix Checklist
Read [debug-history-format.md](${CLAUDE_SKILL_DIR}/references/debug-history-format.md) for the checklist.json schema.
Create fix tasks from the tracer's fix plan. Independent fixes get parallel tasks; dependent fixes are sequential.

## Step 6: Spawn Fixer (Repair)
Read [fixer-brief.md](${CLAUDE_SKILL_DIR}/references/fixer-brief.md) for the full fixer brief template.
Dispatch fixers per task. Independent: parallel (max 4). Dependent: sequential. Blocked: record and continue.

## Step 7: Update Debug History
Call `jaewon_debug_history` (action: "add") for each resolved bug with symptom, root cause, fix, and regression test.

## Step 8: Disable Logging
Call `jaewon_logging_toggle` (action: "disable").

## Step 9: Completion Summary
Display: bug summary, investigation result, fixes applied/blocked, regression tests added, commits, debug history entry. Update `.jaewon/status.json`.

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
[User reports bug] -> [Enable logging] -> [Search history] -> [Spawn tracer] -> [Tracer finds root cause] -> [Create fix checklist] -> [Spawn fixer: RED test then GREEN fix] -> [Update history] -> [Disable logging] -> [Summary]
Why good: Full pipeline. Tracer before fix. RED-then-GREEN. History updated.
</Good>
<Bad>
[User reports bug] -> [Main session reads code and applies fix directly]
Why bad: Main session must never write fixes. Spawn tracer first, then fixer.
</Bad>
<Bad>
[User reports bug] -> [Spawn fixer without tracer investigation]
Why bad: Fixing without investigation risks fixing the wrong layer.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Tracer INCONCLUSIVE twice: present findings, ask user for guidance
- Fixer blocked after 5 attempts: mark permanently blocked, continue with others
- All fixes blocked: exit with partial completion report
- "Just fix it" without investigation: explain why tracing matters, offer quick-fix as opt-in
- No test framework: report BLOCKED, recommend setup
- Bug in dependency: document workaround, do not modify dependency
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
