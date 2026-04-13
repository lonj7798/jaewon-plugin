# Tracer Brief Template

Use this template when spawning the tracer agent for investigation.

## Dispatch

**Teammate** (preferred):
```
SendMessage(teammate_id, tracer_brief)
```

**Agent** (fallback):
```
Task(subagent_type="jaewon-plugin:tracer", model="opus", prompt=tracer_brief)
```

## Investigation Brief

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

## Validation

Wait for tracer completion. Validate the Investigation Report has all required sections:
- Call chain
- Competing hypotheses (minimum 2)
- Root cause identification
- Fix plan

## Inconclusive Handling

If tracer returns INCONCLUSIVE:
- Display findings to user with recommended next steps
- Ask user for additional context
- Re-spawn tracer with augmented brief (max 2 re-investigations)
