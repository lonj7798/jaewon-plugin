---
name: decision-refactor
description: Hard-gated decision harness for refactors. Blocks until the user states the refactor scope, the behavior-preservation contract (the tests that prove no behavior changed), the rollback plan, and the non-goals (what is NOT being changed). Writes a decision artifact under .jaewon/decisions/. Keywords: decision refactor, refactor scope, plan a refactor.
---

<Purpose>
Refactors fail when (a) scope creeps mid-flight ("while I'm here, let me also..."), (b) behavior silently changes because no test asserted the existing behavior, or (c) there's no rollback path when something breaks. This skill blocks the refactor until all three are addressed in writing.
</Purpose>

<Use_When>
- User wants to refactor existing code
- User says "refactor X", "split this file", "extract Y", "decision refactor"
- A reviewer agent's recommendation requires structural changes >50 LOC
</Use_When>

<Do_Not_Use_When>
- Tiny rename in a single file (use direct edit)
- Adding a new feature that incidentally touches existing structure (use `decision-feature`)
- Bug fix that requires structural change (use `decision-bugfix` and reference the structural piece in the fix scope)
- Decision doc already exists for this refactor in the last 14 days
</Do_Not_Use_When>

<Execution_Policy>
- HARD GATE. No refactor begins, no implementer spawned, until the four required fields are filled.
- The behavior-preservation contract is the single most-skipped step in refactors. Push hard for specific test names.
- "Make it cleaner" / "modernize" / "improve readability" are NOT acceptable refactor goals — push for what specifically is wrong with the current shape.
</Execution_Policy>

<Required_Fields>

1. **Refactor scope** — exact files / functions / modules being restructured, AND the target shape (split into N files, extract module X, replace pattern A with pattern B). If you cannot describe the target shape, the refactor isn't ready.
2. **Non-goals** — what is NOT being changed during this refactor. At least three. Behavior, public API, dependencies, naming — pick what stays fixed.
3. **Behavior-preservation contract** — the tests that prove behavior is unchanged. Existing tests that must still pass + new characterization tests filling coverage gaps. Names, not promises.
4. **Rollback plan** — the git ref to revert to and the failure-mode triggers that would prompt rollback. "We have git" is not enough — name the commit / branch / tag.

</Required_Fields>

<Steps>

## Step 1: Get the One-Line Description
Ask: "In one sentence, what refactor?" Compute a slug.

## Step 2: Check for Existing Decision Doc
Look in `.jaewon/decisions/` for `*{slug}*.md` from the last 14 days.

## Step 3: Interview
- "Refactor scope — which files / functions, and what's the target shape?"
- "Non-goals — what stays fixed during this refactor? Three things."
- "Behavior-preservation contract — which existing tests must pass, and what new tests fill coverage gaps before we start?"
- "Rollback plan — name the commit / branch we revert to if this goes wrong, and what triggers rollback."

## Step 4: Write the Decision Artifact
`.jaewon/decisions/{YYYY-MM-DD}-{slug}.md`:

```md
# Decision: {one-line description}

**Date:** {YYYY-MM-DD}
**Type:** refactor
**Status:** open
**Slug:** {slug}

## Refactor Scope
**Current shape:** {what exists}
**Target shape:** {what we're going to}
**Files affected:** {list}

## Non-Goals
- {item 1}
- {item 2}
- {item 3}

## Behavior-Preservation Contract
Existing tests that must still pass:
- `{path}::{test_name}` — {what it asserts}

New characterization tests to add BEFORE refactor begins:
- `{path}::{test_name}` — {what it asserts}

## Rollback Plan
- Revert to: `{commit / branch / tag}`
- Triggers: {failure modes that prompt rollback}

## Notes
{related debug-history, prior refactors, design alternatives considered}
```

## Step 5: Hand Off
> Decision artifact written. Recommended next: write any missing characterization tests first, then run `/jaewon-plugin:add-feature` (or implementer directly) to execute. Reviewer will gate the commit.

</Steps>

<Examples>
<Good>
User: "Split status-handler.js into smaller files."
Skill: "Target shape?" -> User: "Currently 750 LOC, single file. Split into status-read.js (read-only), status-write.js (deepMerge + save), and status-types.js (shared types). Target ~250 LOC each."
Skill: "Non-goals?" -> User: "No behavior change; no new fields; no API change to callers."
Skill: "Behavior-preservation?" -> User: "Existing test suite at tests/handlers/test_status.py must pass unchanged (47 tests). Add new test test_status.py::test_round_trip_no_field_drop to lock in current merge semantics before split."
Skill: "Rollback?" -> User: "Revert to commit a1b2c3d. Trigger: any test failure or any caller break in CI."
[Writes artifact]
Why good: Concrete target shape; behavior-preservation has named tests; rollback names a SHA.
</Good>

<Bad>
User: "Clean up the status handler."
Skill: "Behavior-preservation?" -> User: "We have tests."
Skill: [Writes artifact]
Why bad: "Clean up" isn't a target shape; "we have tests" doesn't name them. The next session will silently change behavior because no contract was specified.
</Bad>
</Examples>

<Final_Checklist>
- [ ] Refactor scope: current + target shape, file list
- [ ] Non-goals: at least 3 explicit items
- [ ] Behavior-preservation: named tests (existing + new characterization)
- [ ] Rollback: named commit / branch + trigger conditions
- [ ] Artifact written to `.jaewon/decisions/{date}-{slug}.md`
</Final_Checklist>

Task: {{ARGUMENTS}}
