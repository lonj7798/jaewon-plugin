---
name: evolve
description: Manual evolution loop. Spawns the synthesizer to read reflections + traces and emit .jaewon/evolve/proposals.json, then walks the user through proposals one at a time (approve / skip / defer), applies approved patches with the ≥2-source rule for agent/skill edits, and commits with `evolve(v0.X): ...`. Manual by design — auto-fire silently rots. Keywords: evolve, learn from sessions, apply lessons, synthesize reflections.
---

<Purpose>
Close the learning loop: turn accumulated reflections into actual hardening of plugin behavior. Manual invocation only — auto-fire produced silent rot in Guya (API key died, pipeline ran without completing for 6 days unnoticed). Manual keeps you accountable and gives you the per-item review the proposals need.
</Purpose>

<Use_When>
- User says "evolve", "apply lessons", "synthesize", "learn from sessions"
- ≥3 reflections accumulated since last evolve run
- SessionStart nudge surfaced an evolve backlog
</Use_When>

<Do_Not_Use_When>
- No reflections yet — run `/jaewon-plugin:reflect` first to capture them
- A `proposals.json` from a previous run is still pending review (resume that one instead of re-synthesizing)
- The user is mid-task — evolve is its own session activity
</Do_Not_Use_When>

<Execution_Policy>
- Manual only — no auto-fire from hooks.
- Synthesizer runs once per cycle; if you re-synthesize, the previous proposals.json is overwritten (be deliberate).
- Per-item approval: present proposals one at a time. Approve / skip / defer / edit-then-approve.
- **≥2-source rule for behavior changes:** any patch targeting `agents/*.md` or `skills/*/SKILL.md` requires `source_count >= 2` in the proposal. Doc-only edits (CLAUDE.md text, README, hooks/CLAUDE.md) may apply with source_count: 1.
- High-risk patches (`risk: high`) are applied separately, in their own commit, never batched.
- Every applied change is a versioned git commit with prefix `evolve(v{X.Y}): {summary}`.
- After applying: append a one-line summary to `.jaewon/evolve/log.md` with the proposal IDs that landed.
</Execution_Policy>

<Steps>

## Step 1: Check Pending Proposals
Read `.jaewon/evolve/proposals.json` if it exists.
- If pending and recent (≤7 days): ask the user "Resume the previous proposals or re-synthesize?"
- If absent or stale: proceed to synthesize.

## Step 2: Spawn Synthesizer
Spawn the `synthesizer` agent. It reads reflections + traces and writes `.jaewon/evolve/proposals.json`. Wait for completion.

If proposals.json is empty (`proposals: []`), tell the user "No actionable proposals — reflections were too vague or single-source. Add concrete reflections via `/jaewon-plugin:reflect` and try again."

## Step 3: Per-Item Review

For each proposal (in the order returned), display:

```
Proposal {N}/{total}: {summary}
  Target: {target.file} -> {target.section}
  Sources: {source_count} reflection(s) — {dates}
  Risk: {risk}    Confidence: {confidence}
  Rationale: {rationale}

  Patch:
    kind: {kind}
    before: {short snippet or "—"}
    after:
    {patch.after, indented}
```

Ask: **approve / skip / defer / edit-then-approve**?

- **approve**: enforce the ≥2-source rule for behavior changes. If violated, refuse and tell user to corroborate with another reflection.
- **skip**: drop this proposal; don't apply.
- **defer**: keep the proposal in `proposals.json`; mark as `deferred: true`.
- **edit-then-approve**: prompt user for revised `patch.after` text, replace, then apply.

## Step 4: Apply Approved Patches
For each approved proposal, apply the patch with `Edit` (or `Write` for new files). Stage only that file. Run any relevant smoke test if patches touch hooks (e.g. re-run `node hooks/__tests__/hooks-smoke.test.mjs`).

## Step 5: Commit Per Patch (or Per Logical Group)
- High-risk patches: one commit each.
- Low/medium-risk patches: may be batched into a single commit if they share a target area.
- Commit message: `evolve(v0.X): {short summary} [proposal: {id}]`.
- Co-author trailer as usual.

## Step 6: Log the Cycle
Append to `.jaewon/evolve/log.md`:

```md
## {YYYY-MM-DD}
- Proposals presented: {N}
- Applied: {list of IDs and one-line summaries}
- Skipped: {list}
- Deferred: {list}
- Sources consumed: {reflection file dates}
```

## Step 7: Reset
Once all proposals are processed: delete `.jaewon/evolve/proposals.json` (so the next nudge knows the cycle completed). Deferred proposals stay in a separate `deferred.json` for the next round.

## Step 8: Hand-Off
Tell the user:
> Evolve cycle complete. {N} applied, {M} skipped, {D} deferred. Next reflect → evolve cycle in ~{recommended cadence}.

</Steps>

<Tool_Usage>
- `Agent` (subagent_type: `synthesizer`) for the synthesis pass
- `Read` for `proposals.json`, target files
- `Edit` / `Write` for applying patches
- `Bash` for git staging, commits, smoke tests
- `Write` for `.jaewon/evolve/log.md` and `deferred.json`
</Tool_Usage>

<Examples>
<Good>
[Synthesize -> 4 proposals] -> [User approves 2 (both source_count: 3, low risk), edits 1, defers 1] -> [Apply 3 patches in 2 commits] -> [Log cycle]
Why good: per-item review, ≥2-source rule held, atomic commits, deferred preserved.
</Good>
<Bad>
[Auto-apply all 4 proposals at once]
Why bad: per-item approval is non-negotiable. Bulk-apply produces unreviewable behavior drift.
</Bad>
<Bad>
[Approve a single-source agent-prompt change]
Why bad: ≥2-source rule prevents mood-of-the-day oscillation. Refuse and ask for corroboration.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Synthesizer emits no proposals: tell user reflections need to be more concrete; do not loop
- A patch fails to apply cleanly (target text not matching): mark proposal as `failed: target-drift`, skip, surface to user
- Smoke test fails after a hook patch: revert that patch, mark `failed: smoke-test`, continue with others
- User wants to bulk-approve: refuse — per-item is required
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Synthesizer ran and wrote `proposals.json`
- [ ] Each proposal reviewed individually
- [ ] ≥2-source rule enforced for agent/skill edits
- [ ] Approved patches applied; smoke test passed where relevant
- [ ] Each commit prefixed `evolve(v0.X): ...` with proposal ID
- [ ] Cycle logged in `.jaewon/evolve/log.md`
- [ ] `proposals.json` cleared / deferred items preserved
</Final_Checklist>

Task: {{ARGUMENTS}}
