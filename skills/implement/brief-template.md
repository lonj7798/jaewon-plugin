# Task Brief

## Task
{task_name} — {task_description}

## Identity
- **Task ID**: {task_id}
- **Phase**: {phase_name}
- **Plan doc**: {plan_doc_path}
- **TDD Phase**: {red|green|refactor}

## Context (read these first)
{list of relevant file paths with why each matters}

Example:
- `src/models/__init__.py` — existing model patterns to follow
- `src/config/schema.py` — DB config this module will use

## Constraints
- **LOD Rules**:
  - Max 800 LOC per file
  - One file, one responsibility
  - Add calling spec at top of every new module
  - Pure functions for logic without `self`/`this`
  - Flat dispatch (dict, not factories)
- **TDD**: {test file path}, coverage target {X}%
- **Style**: Follow existing project conventions

## Definition of Done
{specific, verifiable completion criteria}

Example:
- [ ] All tests pass
- [ ] File has calling spec header
- [ ] File < 800 LOC
- [ ] Code follows project conventions
- [ ] No test modifications (flag if wrong)

## Commit
`{type}({phase}): {description} [{task_id}]`

Example: `feat(phase-1): add User model [p1-t1]`

## If Blocked
- Retry up to 5 times with different approaches
- If still stuck: write report to `.jaewon/blocked/{task_id}.md` with:
  - All attempts and their errors
  - Proposed alternative approaches
  - Suggested different skill or agent to try
- Return status: "blocked" with error summary

## Test Dispute (implementer only)
If a test appears to be wrong:
1. Write dispute to `.jaewon/blocked/{task_id}-dispute.md`
2. Explain why the test is wrong
3. Do NOT modify the test — flag for review
4. Return status: "dispute" with dispute file path
