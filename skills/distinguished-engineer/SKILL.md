---
name: distinguished-engineer
description: Drift-check skill. Reads a proposed change (diff, plan, decision doc, or evolve proposals) and validates it against context/core-beliefs.md. Flags violations with file:section refs and pushes back. Required before merging non-trivial v0.X feature work; required before applying Phase 4 evolve proposals that touch CLAUDE.md / agents / skills. Keywords: distinguished-engineer, drift check, beliefs check, before merge.
---

<Purpose>
Prevent the plugin from quietly turning into a generic AI-coding harness as features accumulate. This skill walks each proposal / diff against `context/core-beliefs.md` and flags anything that violates a stated belief. It's a guardrail against feature accretion — if a change can't justify itself against the beliefs, it's the wrong change for this plugin.
</Purpose>

<Use_When>
- Before merging a v0.X feature PR that touches plugin behavior (hooks, agents, skills, CLAUDE.md)
- Before applying `/jaewon-plugin:evolve` proposals that target agent/skill prompts
- After writing a `decision-feature` doc that proposes structural changes
- Periodically (every few weeks) on the current state, looking for accumulated drift
</Use_When>

<Do_Not_Use_When>
- Trivial commits (typo fixes, docs, config bumps)
- Bug fixes that don't change behavior contract
- Pre-merge gate is already satisfied by a recent run on the same diff (≤24h)
</Do_Not_Use_When>

<Execution_Policy>
- Read `context/core-beliefs.md` first. Every check is grounded in a specific belief from that file.
- Return a structured verdict: `PASS` (no violations), `WARN` (minor drift, document and proceed), `BLOCK` (clear violation, do not merge / apply).
- Be honest about which beliefs are gray areas in this plugin — beliefs evolve; if the proposal is *intentionally* moving a belief, that should be a documented update to `core-beliefs.md`, not a silent override.
- Output is read-only — this skill does not modify files. The user / orchestrator decides what to do with the verdict.
</Execution_Policy>

<Steps>

## Step 1: Identify the Proposal
Determine what's being checked:
- A git diff (e.g., `main...HEAD`, an open PR branch)
- A `.jaewon/decisions/{slug}.md` artifact
- A `.jaewon/evolve/proposals.json` (one or all proposals)
- A specific file or set of files

If unclear, ask the user once. Do not infer broadly — drift checks are diff-scoped, not project-wide (unless explicitly run as a periodic audit).

## Step 2: Read Core Beliefs
Read `context/core-beliefs.md`. List the 8 beliefs in order. For each, extract the **Decision filter** sentence — that's the testable form of the belief.

## Step 3: Walk the Proposal Against Each Belief

For each belief, ask the decision filter against the proposal:

1. **Main session never writes code** — does any added orchestrator skill / hook / agent prompt direct the main session to Edit/Write code?
2. **Externalize state** — does the change persist required state to `.jaewon/`, or does it live only in chat / runtime memory?
3. **Verifiable side-effect** — does any new enforcement hook produce an artifact a downstream check can read?
4. **Evidence-gated commits** — does any new gate trust intent, or read a file?
5. **Decisions before plans** — does the change preserve the gate that requires a decision doc upstream of plan-writing?
6. **Manual evolution, never auto-fire** — does any added trigger fire evolution from a hook?
7. **Grow the rider, not just compensate** — is the new guardrail traceable to a specific failure mode jaewon has hit, or is it generic best-practice copying?
8. **Three primitives, one role each** — is the change put in the right primitive (hook for non-skippable, skill for repeatable, agent for isolated)?

For each belief, output one of:
- `PASS — {one-sentence justification}`
- `WARN — {what looks close to a violation, with file:section ref}`
- `BLOCK — {clear violation, with file:section ref and the belief # cited}`

## Step 4: Issue Verdict
- All PASS or only WARNs: verdict = **PASS** (or **WARN** if there are ≥2 WARNs — proceed with caution; user records the WARN in the commit message).
- Any BLOCK: verdict = **BLOCK** — do not merge / apply. The user must either revise the proposal or document a deliberate belief change in `core-beliefs.md` before proceeding.

## Step 5: Output Format

```md
## Distinguished-Engineer Verdict: PASS | WARN | BLOCK

**Subject:** {what was checked, with ref}
**Date:** {YYYY-MM-DD}

### Belief-by-Belief
1. Main session never writes code — PASS / WARN / BLOCK — {note}
2. Externalize state — ...
3. Verifiable side-effect — ...
4. Evidence-gated commits — ...
5. Decisions before plans — ...
6. Manual evolution — ...
7. Grow the rider — ...
8. Three primitives — ...

### Blockers (if any)
- Belief #N: {issue with file:section ref and concrete fix recommendation}

### Recommendations
- {how to revise the proposal to PASS}
- {OR: how to document a belief change if the violation is intentional}
```

## Step 6: If BLOCK, Surface Path Forward
Explicitly tell the user:
> The change BLOCKS on {belief #N}. To proceed, either:
> (a) revise the proposal to satisfy the belief (concrete suggestion above), or
> (b) update `context/core-beliefs.md` with a dated entry explaining why the belief is shifting, then re-run this check.
>
> Do NOT silently merge a violation. Drift without a recorded reason is how identity gets lost.

</Steps>

<Tool_Usage>
- `Read` for `context/core-beliefs.md`, the proposal file(s), affected plugin files
- `Bash` for `git diff` ranges
- Do NOT spawn other agents — this skill is the synthesis layer above them
- Do NOT modify files — read-only
</Tool_Usage>

<Examples>
<Good>
[Subject: PR adding a new auto-fire hook that triggers /jaewon-plugin:evolve on SessionEnd] -> [Walk beliefs] -> [Belief #6 BLOCK: auto-fire silently rots; the SessionStart nudge already exists for this purpose] -> [Recommendation: remove auto-fire, keep nudge] -> Verdict: BLOCK
Why good: Caught the violation at gate time, not after rot.
</Good>
<Good>
[Subject: evolve proposal to add a "be more concise" rule to reviewer-deep] -> [Walk beliefs] -> [Belief #7 WARN: rule is generic, not traceable to a specific jaewon failure mode; recommend revising to cite the originating reflection or dropping] -> Verdict: WARN
Why good: Distinguishes WARN (drift risk, document and proceed) from BLOCK (clear violation).
</Good>
<Bad>
[Run drift check, return "looks good"] without walking each belief
Why bad: The check is the per-belief walk. A summary verdict without the table is unverifiable.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- The user disagrees with a BLOCK: ask them to either revise or update `core-beliefs.md` first; do not silently flip the verdict
- A belief is genuinely ambiguous for this proposal: produce WARN with a recommendation to clarify the belief in `core-beliefs.md`
- Multiple belief shifts proposed in one diff: BLOCK and ask for separate diffs (one belief change per commit, with a dated rationale)
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Subject identified and bounded (diff range or file set)
- [ ] `context/core-beliefs.md` read; 8 beliefs enumerated
- [ ] Each belief walked with the decision filter; each gets PASS / WARN / BLOCK
- [ ] Verdict issued with file:section refs for any non-PASS
- [ ] Path forward stated (revise vs document belief change)
- [ ] No files modified
</Final_Checklist>

Task: {{ARGUMENTS}}
