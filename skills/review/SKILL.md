---
name: review
description: Two-pass code review (structural -> deep) that records evidence to .jaewon/review-evidence.jsonl. The pre-commit gate reads that ledger and blocks `git commit` when fresh evidence is missing. Spawns reviewer-structural first; only spawns reviewer-deep after structural APPROVES. Records evidence after each pass. Keywords: review, code review, before commit, ready to commit, audit, two-pass review.
---

<Purpose>
Run the two-pass review chain (reviewer-structural -> reviewer-deep) and record evidence so the pre-commit gate (in pre-tool-enforcer.mjs) lets `git commit` through. Without this skill, fresh evidence will not exist and `git commit` will be blocked.
</Purpose>

<Use_When>
- User says "review", "review before commit", "audit changes", "two-pass review"
- User wants to commit and the pre-commit gate is on
- After implementer/fixer reports completion and the diff is ready
</Use_When>

<Do_Not_Use_When>
- The change is a tiny config fix already covered by the cleanup-pattern scan — call it out and proceed without review (skip is allowed; the user can `--no-verify`)
- User wants a full PR-readiness pass (use `/jaewon-pr` instead, which runs Codex fresh-eyes too)
- The change is purely planning artifacts in `docs/plans/` (path-exempt; gate already skips)
</Do_Not_Use_When>

<Execution_Policy>
- Main session ORCHESTRATES only — does not perform the review itself
- Spawn `reviewer-structural` first; only spawn `reviewer-deep` if structural APPROVED
- After each pass, record one JSONL line via `recordReviewEvidence` to `.jaewon/review-evidence.jsonl`
- Both reviewers run read-only — Write/Edit blocked
- Evidence freshness window: 30 minutes (configurable in `.jaewon/pre-commit-config.json`)
- If REQUEST_CHANGES at any pass, hand off to fixer/implementer; do NOT record an APPROVE entry
</Execution_Policy>

<Steps>

## Step 1: Identify Changed Files
Run `git diff --cached --name-only --diff-filter=ACMR` (or `git diff main...HEAD --name-only` if nothing staged). Display the list.

## Step 2: Spawn reviewer-structural
Brief: "Review these staged files: {list}. Apply the structural categories: simplicity, surgical changes, silent errors, scalability, security, race conditions, AI-specific risks." Wait for verdict.

## Step 3: Record Structural Evidence
Append one JSONL line to `.jaewon/review-evidence.jsonl` with shape:
```json
{"ts":"<ISO>","pass":"structural","verdict":"APPROVE|REQUEST_CHANGES","files":[...],"issue_counts":{"critical":N,"major":N,"minor":N},"agent":"reviewer-structural"}
```
Use the `recordReviewEvidence(projectDir, entry)` helper from `hooks/lib/review-evidence.mjs` (call via Bash: `node -e "import('./hooks/lib/review-evidence.mjs').then(m=>m.recordReviewEvidence(process.cwd(), {...}))"`).

## Step 4: If REQUEST_CHANGES, Stop
Display the critical+major findings. Hand off to `fixer` or `implementer`. Do NOT spawn reviewer-deep yet — fix structural issues first.

## Step 5: Spawn reviewer-deep
Only if Step 2 was APPROVE. Brief: "Same staged files as structural pass: {list}. Apply the deep categories: logic correctness, state management, data integrity, observability, boundaries, performance, dependency risk, test coverage, cleanup/lifecycle." Wait for verdict.

## Step 6: Record Deep Evidence
Append a second JSONL line with `pass: "deep"`. Same shape as Step 3.

## Step 7: Display Result
- Both APPROVE: "Review evidence recorded. Pre-commit gate satisfied for the next 30 minutes. Run `git commit` when ready."
- Deep REQUEST_CHANGES: hand off to fixer/implementer with the list.

</Steps>

<Tool_Usage>
- `Agent` (subagent_type: `reviewer-structural` then `reviewer-deep`) for the two passes
- `Bash` for `git diff --cached --name-only --diff-filter=ACMR` and for the Node one-liner that calls `recordReviewEvidence`
- Do NOT Read/Grep/Glob in the main session for review purposes — that defeats the context-savings of subagent isolation
</Tool_Usage>

<Examples>
<Good>
[Stage 4 files] -> [Spawn reviewer-structural -> APPROVE] -> [Record structural evidence] -> [Spawn reviewer-deep -> APPROVE with 1 minor] -> [Record deep evidence] -> [User runs `git commit`, gate lets it through]
Why good: Both passes ran, both wrote evidence, gate sees fresh entries.
</Good>
<Bad>
[Spawn reviewer-deep without reviewer-structural] -> [Record deep evidence] -> [User runs `git commit` -> gate blocks: missing structural evidence]
Why bad: Both passes are required by default. Skip reviewer-structural only if `gate.requireBothPasses: false` is set in config.
</Bad>
<Bad>
[Reviewer returns APPROVE in chat] -> [User commits without recording evidence] -> [Gate blocks even though review happened]
Why bad: Evidence file is the contract, not the chat history. Always record.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Both passes REQUEST_CHANGES with fundamentally different issues: triage with user, do not loop more than twice
- Reviewer agents disagree (structural APPROVES, deep finds a security issue): record the deep verdict honestly; hand off to fixer
- User insists on bypassing review: instruct them to use `git commit --no-verify` and document the reason in the commit body
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Staged files identified
- [ ] reviewer-structural spawned read-only
- [ ] Structural verdict recorded to `.jaewon/review-evidence.jsonl`
- [ ] reviewer-deep spawned only after structural APPROVED
- [ ] Deep verdict recorded
- [ ] Combined result surfaced to user
- [ ] Pre-commit gate confirmed satisfied (or REQUEST_CHANGES handed off)
</Final_Checklist>

Task: {{ARGUMENTS}}
