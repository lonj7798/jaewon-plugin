---
name: error-healing
description: Quick error diagnosis and fix. Takes an error message, stack trace, or build failure, locates the source, applies a targeted fix, and verifies it works. Lighter than debug — no formal investigation pipeline. Keywords: error, heal, fix error, build fail, type error, import error, crash, stack trace, lint error.
---

<Purpose>
Error-healing is the fast-path error fixer. It takes an error (pasted, from terminal, or from a failed command) and applies a targeted fix with verification. Unlike the `debug` skill which runs a full tracer-then-fixer pipeline, error-healing works directly — read the error, find the source, fix it, verify. Use `debug` for complex multi-layer bugs; use `error-healing` for immediate errors with clear stack traces.
</Purpose>

<Use_When>
- User pastes an error message, stack trace, or build output
- User says "error", "heal", "fix this error", "build failed", "type error"
- A command just failed and user wants it resolved quickly
- Test failures with clear assertion errors
- Import/module resolution errors
- Lint or type-check errors
- Runtime crashes with stack traces
</Use_When>

<Do_Not_Use_When>
- Complex bug requiring investigation across multiple layers -- use `debug` skill
- User wants to understand WHY something is broken, not just fix it -- use `debug` skill
- User wants a new feature -- use `implement` or `add-feature` skill
- Error is in a third-party dependency -- explain workaround, don't modify dependency
</Do_Not_Use_When>

<Execution_Policy>
- Work DIRECTLY in the main session -- no agent spawning for simple fixes
- Spawn fixer agent ONLY if the fix spans 3+ files or is risky
- Always VERIFY the fix by re-running the command that failed
- If the same error recurs after fix, escalate to `debug` skill
- Record to debug history only for non-trivial fixes (skip typos, missing imports)
- Maximum 3 fix attempts per error before escalating to `debug`
</Execution_Policy>

<Steps>

## Step 1: Parse the Error
Extract from the error: error type, message, file path, line number, stack trace.
If user didn't provide the error, ask: "Paste the error message or tell me what command failed."
Categorize: build | type | import | runtime | test | lint | config | unknown

## Step 2: Locate the Source
Read the file and surrounding context at the error location.
For stack traces: read the top 2-3 frames that are in project code (skip node_modules/framework internals).
For build errors: check the specific file and line referenced.
For import errors: check the import path and target module exports.

## Step 3: Diagnose
Identify the root cause. Common patterns:
- Missing import/export
- Type mismatch
- Undefined variable/property
- Wrong function signature
- Missing dependency
- Config mismatch
- Syntax error
- Stale cache or build artifact

## Step 4: Apply Fix
Apply the minimal fix using Edit tool. Follow these rules:
- Fix ONLY the error — do not refactor surrounding code
- If the fix requires a new dependency: `npm install` / `pip install` etc.
- If the fix requires multiple files: fix them all before verifying
- If unsure between two fixes: pick the safer one (less invasive)

## Step 5: Verify
Re-run the exact command that produced the error.
- If it passes: report success
- If same error: re-read, try alternative fix (attempt 2/3)
- If different error: treat as new error, repeat from Step 1
- If 3 attempts fail: escalate to `debug` skill

## Step 6: Report
Display: error type, root cause (one line), fix applied, verification result.
For non-trivial fixes, optionally call `jaewon_debug_history` (action: "add") to record it.

</Steps>

<Tool_Usage>
- `Read` to inspect error location and surrounding code
- `Edit` to apply targeted fixes
- `Bash` to re-run the failing command for verification
- `jaewon_debug_history` to search past similar errors and record non-trivial fixes
- `jaewon_status_update` to update phase if running within a pipeline
</Tool_Usage>

<Examples>
<Good>
[User pastes "TypeError: Cannot read property 'map' of undefined" with stack trace] -> [Read file at line] -> [Find variable is null] -> [Add null check or fix data source] -> [Re-run: passes] -> [Report: "Fixed null reference in UserList.tsx:42"]
Why good: Direct path from error to fix to verification. No unnecessary investigation.
</Good>
<Good>
[Build fails: "Module not found: ./utils/helpers"] -> [Check file exists] -> [File was renamed to helper.ts] -> [Update import path] -> [Build passes] -> [Report]
Why good: Simple import fix, verified immediately.
</Good>
<Bad>
[User pastes error] -> [Spawn tracer agent to investigate] -> [Wait for report] -> [Spawn fixer]
Why bad: Over-engineered. Error-healing fixes directly; use debug skill for full investigation.
</Bad>
<Bad>
[User pastes error] -> [Fix the error] -> [Don't verify] -> [Report success]
Why bad: Always re-run the failing command to verify the fix works.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- 3 failed fix attempts: "This error needs deeper investigation. Switching to debug skill."
- Error in node_modules/dependency: "This is a dependency issue. Here's a workaround: {suggestion}"
- Error requires architectural change: "This fix would require changes across {N} modules. Consider using the debug skill for a proper investigation."
- Flaky error (passes on re-run without changes): "This appears to be a flaky failure. Here's what likely caused it: {explanation}"
</Escalation_And_Stop_Conditions>

Task: {{ARGUMENTS}}
