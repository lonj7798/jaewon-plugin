# Plan Output Format

All plan documents are saved to `docs/plans/v{X.Y}/`.

## Auto-Versioning

1. Read `.jaewon/status.json` for `plan.current_version`
2. Bump: null -> `v0.1`, `v0.1` -> `v0.2`, etc. (increment minor each cycle)
3. Create directory: `docs/plans/v{X.Y}/`

## Plan Documents

| File | Contents |
|------|----------|
| `00-overview.md` | RALPLAN-DR summary, ADR, roadmap |
| `01-phase0-architecture.md` | LOD decomposition, module boundaries, dependency graph |
| `02-phase1-{name}.md` ... `{N}-phase{N}-{name}.md` | TDD implementation phases |
| `checklist.json` | Machine-readable task list |
| `checklist.md` | Human-readable compliance checklist |
| `risks.md` | Risk assessment with mitigations |
| `notes.md` | Implementation notes, constraints, decisions |

## Checklist.json Structure

```json
{
  "version": "1.0",
  "generated": "{ISO date}",
  "total_tasks": 0,
  "parallel_count": 0,
  "sequential_count": 0,
  "phases": [
    {
      "id": "phase-0",
      "name": "Architecture",
      "tasks": [
        {
          "id": "0.1",
          "title": "Task title",
          "type": "architecture|test|implementation|refactor",
          "parallel": true,
          "depends_on": [],
          "status": "pending",
          "tdd_stage": null
        }
      ]
    }
  ]
}
```

### Rules
- Tasks default to `parallel: true` unless they have explicit `depends_on`
- TDD tasks within a phase are sequential: red -> green -> refactor
- Every implementation phase must have at least one red/green/refactor triplet

## State Update

After saving plan documents, update `.jaewon/status.json`:
- `plan.current_version` -- the new version string
- `plan.plan_path` -- path to plan directory
- `plan.checklist_path` -- path to checklist.json
- `plan.phase` -- "plan"
- `plan.created_at` -- ISO date
- `plan.consensus_iterations` -- number of Planner/Architect/Critic loops
- `plan.interview_rounds` -- number of interview questions asked

Merge with existing content. Create `.jaewon/` if missing.
