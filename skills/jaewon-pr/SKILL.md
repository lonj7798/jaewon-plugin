---
name: jaewon-pr
description: Pre-PR preparation. Runs a Codex fresh-eyes pass on the full diff (different model = catches familiarity blindness), checks PR readiness against scope/breaking-changes/migrations/tests/docs/cross-diff consistency, cross-checks against the originating decision doc, and auto-drafts the PR body. Use before submitting any PR. Keywords: jaewon-pr, pr ready, prepare pr, ship it, draft pr.
---

<Purpose>
Run before submitting a PR. Assumes `review` (structural + deep) has already run on the branch — this skill handles what only makes sense at PR level: independent fresh-eyes review by a different model, readiness checklist, and a pasteable PR description. Catches what self-review misses through familiarity.
</Purpose>

<Use_When>
- User says "prepare PR", "ready to PR", "draft PR", "ship it", "jaewon-pr"
- A branch is ready to merge into the base branch and review-evidence is clean
</Use_When>

<Do_Not_Use_When>
- The branch hasn't been reviewed yet — run `/jaewon-plugin:review` first
- The diff is empty or only contains config / doc files (just open the PR directly)
- The decision doc says `Status: blocked` (resolve the decision first)
</Do_Not_Use_When>

<Execution_Policy>
- Main session orchestrates; the Codex pass runs via OMC's external-AI bridge
- Do NOT re-run reviewer-structural / reviewer-deep here — those are commit-level. This skill is PR-level.
- The Codex pass is the most valuable part — different model, fresh context, no exposure to the in-session iteration history.
- The PR body draft is auto-pasted; the user copies it into `gh pr create`.
</Execution_Policy>

<Steps>

## Step 1: Determine the Diff Range
Default: `main...HEAD`. If `$ARGUMENTS` provides a base branch or range, use that.

```bash
git fetch origin {base} 2>/dev/null
git diff {base}...HEAD --stat
git log {base}...HEAD --oneline
```

If the diff is empty, stop and inform the user.

## Step 2: Read the Originating Decision Doc
Find the most recent file under `.jaewon/decisions/` whose date matches the branch creation. If found, read it. Quote `Scope` and `Non-Goals` back so the readiness checklist can cross-check them.

If no decision doc maps to this branch, flag it as a soft warning ("PR has no traceable decision doc — recommended for non-trivial changes") but do not block. Some PRs are mechanical (dependency bumps, doc fixes).

## Step 3: Codex Fresh-Eyes Pass

Use OMC's external-AI bridge:

```bash
git diff {base}...HEAD --name-only | head -20 > /tmp/pr-files.txt
git diff {base}...HEAD > /tmp/pr-diff.patch
omc ask codex "$(cat <<'EOF'
You are a senior engineer reviewing a PR with no prior context. The full diff is below.
Look for: (1) bugs and correctness issues, (2) logic errors, (3) architectural concerns,
(4) error handling gaps, (5) anything Claude might have missed through familiarity.
Be specific with file names and line numbers. Be critical. If clean, say so.

DIFF:
$(cat /tmp/pr-diff.patch)
EOF
)" > /tmp/pr-codex-review.txt
```

If `omc` / `codex` is unavailable, note it ("Codex pass skipped — external-AI bridge not configured") and continue. The skill still produces value through the readiness checklist alone.

## Step 4: PR Readiness Checklist

Walk through each. Flag anything that must be resolved before submitting.

### Scope (cross-check decision doc)
- Every changed file traces to the decision doc's `Scope` section
- No files match the decision doc's `Non-Goals` section — if any do, flag for split into a separate PR

### Breaking Changes
- API signatures, config formats, behavioral contracts changed → all consumers updated AND documented
- Public exports removed → consumers checked

### Migration Needs
- DB migration / data migration / config change required → migration is documented, ordering vs deploy explicit

### Test Coverage
- New behavior has tests; new error paths have tests
- The `decision-feature` doc's `Success Criteria` map to actual tests

### Documentation
- Public APIs documented
- `CLAUDE.md` / `README.md` / `ARCHITECTURE.md` / wiki pages reflect the change

### Cross-Diff Consistency
- Naming conventions consistent across changed files
- Similar patterns handled the same way (errors, logging, validation)

## Step 5: Draft the PR Body

Use this template, filling each section from the diff + decision doc + Codex findings:

```md
## Summary
{1–3 bullets: what changed and why}

## Closes
{decision doc reference + any GitHub issues}

## Changes
{bullet per significant changed file/module}

## Breaking Changes
{None / list}

## Migration
{None / steps}

## Test Plan
{automated coverage + manual verification steps}

## Codex Fresh-Eyes Review
{summary of Codex findings — addressed, accepted-as-known, deferred}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Step 6: Surface to User

Display: readiness verdict (READY / NEEDS WORK), the readiness checklist results, the Codex summary, and the drafted PR body. Provide the exact `gh pr create` command pre-filled with the title and body.

</Steps>

<Tool_Usage>
- `Bash` for `git diff`, `git log`, `omc ask codex`, `gh` (read-only / draft-only)
- `Read` for the decision doc and any other artifacts
- `Write` only for the PR-body draft if the user asks to save it (otherwise display in chat)
- Do NOT spawn reviewer-structural / reviewer-deep here — wrong layer
</Tool_Usage>

<Examples>
<Good>
[Branch feature/retry has 4 commits; review-evidence clean] -> [Decision doc maps to branch, scope = "/webhook/* and /events/* retry"] -> [Codex pass: 1 minor finding about test naming] -> [Readiness: 1 caveat — non-goal violation: changed /admin/* (out of scope)] -> [User splits PR into two]
Why good: Decision doc cross-check caught scope creep before PR opened.
</Good>
<Bad>
[Skip Codex because "Claude already reviewed"] -> [Open PR] -> [Codex would have caught a cross-file inconsistency Claude missed]
Why bad: Different model, different blind spots. Codex pass is the highest-value step in this skill.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Codex finds a critical issue: hand off to fixer, do NOT open the PR
- Decision doc and diff disagree on scope: ask user to split or update the decision doc
- `omc` not configured: continue with readiness + drafting, surface that the Codex pass was skipped
- No tests for new behavior: hard fail — recommend test-generator first
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Diff range determined (default `main...HEAD`)
- [ ] Decision doc located and quoted
- [ ] Codex fresh-eyes pass executed (or skip noted)
- [ ] Readiness checklist walked, all items flagged or cleared
- [ ] Decision-doc scope vs diff cross-checked (no non-goal violations)
- [ ] PR body drafted with the template
- [ ] User given the exact `gh pr create` command
</Final_Checklist>

Task: {{ARGUMENTS}}
