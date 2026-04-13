# Fixer Brief Template

Use this template when spawning fixer agents for repair tasks.

## Dispatch

**Teammate** (preferred):
```
SendMessage(teammate_id, fixer_brief)
```

**Agent** (fallback):
```
Task(subagent_type="jaewon-plugin:fixer", model="opus", prompt=fixer_brief)
```

## Fix Brief

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

## Dispatch Rules

- **Independent fixes**: spawn all fixers in parallel (max 4 concurrent)
- **Dependent fixes**: spawn sequentially, waiting for each to complete
- **Blocked fixer**: record in .jaewon/blocked/{task-id}.md, continue with others
- **Failed fixer** (5 attempts): mark task as blocked, escalate to user
