---
name: decision-feature
description: Hard-gated decision harness for new features. Blocks until the user states scope, non-goals, success criteria, and blast radius. Writes a decision artifact to .jaewon/decisions/{date}-{slug}.md that initial-plan and add-feature require before they will write a plan. Keywords: decision feature, plan a feature, new feature, feature scope.
---

<Purpose>
Force the user to commit a decision before Claude commits code. The most expensive bugs trace back to vague initial prompts ("add a retry layer", "improve performance"); iteration polishes the wrong direction. This skill blocks plan writing until the four load-bearing fields are stated, and persists them as a versioned artifact under `.jaewon/decisions/`.
</Purpose>

<Use_When>
- User asks to add a new feature
- User says "plan a feature", "let's add X", "feature scope"
- `add-feature` or `initial-plan` is invoked without a fresh decision doc
</Use_When>

<Do_Not_Use_When>
- Tiny config tweak with obvious scope (one-line change)
- Bug fix — use `decision-bugfix`
- Refactor — use `decision-refactor`
- Decision doc already exists for this feature in the last 14 days (re-read it instead of recreating)
</Do_Not_Use_When>

<Execution_Policy>
- This skill is a HARD GATE. Do not produce a plan, do not write code, do not invoke implementer/planner until the four required fields are filled with non-trivial answers.
- "Make it work" / "be flexible" / "make it good" are NOT acceptable answers — push back and ask again.
- The artifact is the contract. Plan-writing skills (`initial-plan`, `add-feature`) read from `.jaewon/decisions/` and refuse to proceed without a fresh entry.
- Re-running the skill with the same slug overwrites the artifact (with a versioned diff line in the footer).
</Execution_Policy>

<Required_Fields>

1. **Scope** — what exactly will change. Specific files / modules / behaviors. If you cannot name a file, the scope is too vague.
2. **Non-goals** — what will NOT change in this feature. At least three items. "We won't touch the auth flow"; "we won't add UI"; "we won't migrate the schema". Non-goals are the strongest signal that the user has thought through the boundary.
3. **Success criteria** — observable, testable conditions. "Works" is not a criterion. "Endpoint X returns 503 within 50ms when downstream is unavailable, with a regression test in tests/api/test_x.py" is.
4. **Blast radius** — what breaks if this is wrong. Who is affected, where the failure surfaces, how it gets caught. Forces honest risk assessment.

</Required_Fields>

<Steps>

## Step 1: Get the One-Line Description
Ask the user: "In one sentence, what feature do you want?" Capture it.
Compute a slug from the description (kebab-case, ≤40 chars).

## Step 2: Check for Existing Decision Doc
Look in `.jaewon/decisions/` for any file matching `*{slug}*.md` modified within the last 14 days. If found:
- Read it
- Show the user: "Found existing decision doc: {path}. Re-use, update, or start fresh?"
- Branch on their answer.

## Step 3: Interview — Required Fields
For each of the four required fields, ask explicitly. Reject vague answers ONCE per field, then push the user to specify. Do not move on until every field has at least one concrete sentence.

Example interview:
- "Scope — which files or modules will this touch? If you don't know, name the closest existing module."
- "Non-goals — what's explicitly out of scope? Give me three things this is NOT."
- "Success criteria — how will we verify this works? Be specific (test names, observable behaviors, metrics)."
- "Blast radius — if this is wrong in production, who is affected and how does it get caught?"

## Step 4: Write the Decision Artifact
Write `.jaewon/decisions/{YYYY-MM-DD}-{slug}.md`:

```md
# Decision: {one-line description}

**Date:** {YYYY-MM-DD}
**Type:** feature
**Status:** open
**Slug:** {slug}

## Scope
{user's scope answer}

## Non-Goals
- {item 1}
- {item 2}
- {item 3}

## Success Criteria
{user's success criteria}

## Blast Radius
{user's blast radius}

## Notes
{any clarifications, alternatives considered, or follow-ups}
```

## Step 5: Confirm and Hand Off
Tell the user:
> Decision artifact written to `.jaewon/decisions/{file}`. You can now run `/jaewon-plugin:add-feature` or `/jaewon-plugin:initial-plan` and the gate will pass.

If the user wants to revise: re-run this skill with the same slug.

</Steps>

<Tool_Usage>
- `Bash` for `mkdir -p .jaewon/decisions` and listing existing decisions
- `Read` for existing decision docs
- `Write` for the new artifact
- Do NOT spawn planner / implementer / reviewer from here — this skill is decision-only
</Tool_Usage>

<Examples>
<Good>
User: "Add a retry layer to the API client."
Skill: "Scope — which calls?" -> User: "Just /webhook/* and /events/*. Other endpoints already have retry."
Skill: "Non-goals?" -> User: "Won't touch auth, won't add a circuit breaker, won't change retry semantics for existing endpoints."
Skill: "Success criteria?" -> User: "5xx and timeouts on those endpoints retry up to 3 times with backoff. Existing tests for other endpoints unchanged. New test in tests/api/test_retry.py."
Skill: "Blast radius?" -> User: "If retry is too aggressive, we double-bill webhook delivery. Caught by the duplicate-delivery alert in Datadog."
[Writes artifact, hands off]
Why good: Concrete, file-level scope; three explicit non-goals; testable criteria; honest risk.
</Good>

<Bad>
User: "Add a retry layer."
Skill: "Scope?" -> User: "Make the API more resilient."
Skill: [Writes artifact, hands off]
Why bad: "Resilient" is not scope. Push back and ask for specific endpoints / failure modes / behaviors. Iteration on a vague prompt produces a polished version of the wrong feature.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- User refuses to specify scope after two attempts: write artifact with `Status: blocked` and a note "scope unresolved; re-run when concrete"; refuse to hand off
- User wants to ship without a decision doc: explain this is a hard gate; offer `--no-verify` equivalent (manually create a stub doc) but log that they did
- Decision conflicts with an existing one in `.jaewon/decisions/`: surface the conflict, ask user to reconcile before writing
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] One-line description captured
- [ ] Slug computed (kebab-case, ≤40 chars)
- [ ] Existing decision doc checked
- [ ] Scope answered with concrete files/modules/behaviors
- [ ] Non-goals: at least 3 explicit items
- [ ] Success criteria: testable / observable
- [ ] Blast radius: who, how, caught by what
- [ ] Artifact written to `.jaewon/decisions/{date}-{slug}.md`
- [ ] User pointed at the next skill (`add-feature` or `initial-plan`)
</Final_Checklist>

Task: {{ARGUMENTS}}
