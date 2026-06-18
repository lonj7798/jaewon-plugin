---
name: decision-bugfix
description: Hard-gated decision harness for bug fixes. Blocks until the user states the symptom, the suspected root cause (or notes "tracer needed"), the fix scope, and the regression-prevention plan. Writes a decision artifact to .jaewon/decisions/{date}-{slug}.md that downstream skills require. Keywords: decision bugfix, fix decision, plan a fix.
---

<Purpose>
Bug fixes go wrong in two recurring ways: (a) fixing the symptom layer instead of the root cause, and (b) re-fixing the same bug because no regression test was added. This skill blocks the fix until both are addressed in writing.
</Purpose>

<Use_When>
- User reports a bug and wants to fix it
- User says "fix bug", "decision bugfix", "plan the fix"
- `debug` or `error-healing` is invoked without a fresh decision doc
</Use_When>

<Do_Not_Use_When>
- One-line obvious typo fix
- Investigation is still active and root cause is unclear (use `debug` skill first to run tracer; come back here once tracer reports)
- Decision doc already exists for this bug in the last 7 days
</Do_Not_Use_When>

<Execution_Policy>
- HARD GATE. No fix is applied, no fixer agent spawned, until the four required fields are filled.
- "Just fix it" is not a valid answer. Push back.
- Symptom-layer fixes (null check at the error site instead of where data went wrong) are explicitly called out and require justification.
</Execution_Policy>

<Required_Fields>

1. **Symptom** — what the user observed. Exact error message, unexpected output, or behavior. If reproducible, the repro steps.
2. **Root cause hypothesis** — where the data first goes wrong (the fix layer), not where the error appears (the symptom layer). If unknown, the answer is "tracer needed" and this skill exits with a pointer to `/jaewon-plugin:debug`.
3. **Fix scope** — which file(s) and lines change. The fix should be minimal — if it touches >3 files, justify why.
4. **Regression prevention** — the test that would have caught this bug. Test file path + assertion sketch. "Add a test" is not enough; name the file and the assertion.

</Required_Fields>

<Steps>

## Step 1: Get the One-Line Description
Ask: "In one sentence, what's the bug?" Compute a slug.

## Step 2: Check for Existing Decision Doc
Look in `.jaewon/decisions/` for `*{slug}*.md` from the last 7 days. If found, offer reuse / update / fresh.

## Step 3: Interview
- "Symptom — exact error message and repro steps if reproducible."
- "Root cause — where does the data first go wrong? If unknown, say 'tracer needed' and we'll route to debug."
- "Fix scope — which file(s) and roughly which lines?"
- "Regression test — what's the test file path and assertion that would catch this?"

If root cause is "tracer needed", write the artifact with `Status: pending-investigation`, instruct the user to run `/jaewon-plugin:debug`, and stop.

## Step 4: Write the Decision Artifact
`.jaewon/decisions/{YYYY-MM-DD}-{slug}.md`:

```md
# Decision: {one-line description}

**Date:** {YYYY-MM-DD}
**Type:** bugfix
**Status:** open | pending-investigation
**Slug:** {slug}

## Symptom
{exact error / repro}

## Root Cause Hypothesis
{fix layer — where data first goes wrong}
{Symptom layer (where the error appears): {file:line}}

## Fix Scope
- {file:line range} — {what changes}

## Regression Prevention
- Test: `{path}` — {assertion sketch}

## Notes
{tracer findings, alternatives, related debug-history entries}
```

## Step 5: Hand Off
> Decision artifact written. Run `/jaewon-plugin:debug` if status is pending-investigation, otherwise spawn `fixer` with the artifact path.

</Steps>

<Examples>
<Good>
User: "Status updates write the wrong color."
Skill: "Symptom — exact?" -> User: "HUD shows WHITE even when 3/3 tasks done. Should be GREEN."
Skill: "Root cause?" -> User: "deepMerge in status-handler.js:60 doesn't recompute hud.overall_color on write — only on read, and reads return the stored value."
Skill: "Fix scope?" -> User: "status-handler.js:55-65 — recompute color before saveStatus."
Skill: "Regression?" -> User: "tests/handlers/test_status.py — assert color is GREEN after writing 3/3 done."
[Writes artifact]
Why good: Distinguishes symptom from fix layer; minimal fix scope; concrete regression test.
</Good>

<Bad>
User: "HUD is wrong."
Skill: "Root cause?" -> User: "Add a null check somewhere in status-handler."
Skill: [Writes artifact]
Why bad: Symptom-layer fix without naming the layer where data goes wrong. Push back: where does the wrong color first get written?
</Bad>
</Examples>

<Final_Checklist>
- [ ] Symptom: exact error / repro
- [ ] Root cause hypothesis: fix layer named OR "tracer needed" with debug handoff
- [ ] Fix scope: file:line, minimal
- [ ] Regression test: file path + assertion sketch
- [ ] Artifact written to `.jaewon/decisions/{date}-{slug}.md`
- [ ] User pointed at next skill (`debug` or `fixer`)
</Final_Checklist>

Task: {{ARGUMENTS}}
