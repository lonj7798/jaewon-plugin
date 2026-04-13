# Debug History Format

Debug history is stored in `.jaewon/debug-history/` and managed via the `jaewon_debug_history` MCP tool.

## Adding Entries

After all fixes complete (or all remaining are blocked), call `jaewon_debug_history` for each resolved bug:

```json
{
  "action": "add",
  "entry": {
    "name": "{bug name}",
    "symptom": "{user's original description}",
    "root_cause": "{from tracer's report}",
    "fix_layer": "{from tracer's report}",
    "fix_description": "{from fixer's report}",
    "regression_test": "{test file and name}",
    "resolved": true
  }
}
```

## Searching History

Before starting investigation, search for similar past bugs:

```json
{
  "action": "search",
  "query": "{key terms from the bug report}"
}
```

If matches found:
- Display past similar bugs and their resolutions
- Include this context in the tracer brief

If no matches: note "No similar past bugs found" and proceed.

## Fix Checklist Format

Fix tasks use the checklist.json format:

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

### Multi-file Fix Rules
- Independent fixes get parallel tasks (no depends_on between them)
- Dependent fixes are sequential (depends_on chains)
- Each fix task gets its own regression test task

Save or update checklist.json via `jaewon_checklist_update` or direct Write.
