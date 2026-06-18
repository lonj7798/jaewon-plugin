# jaewon-plugin — Core Beliefs

> Last updated: 2026-05-02 (v0.3)
>
> Architectural invariants. If a proposed change would violate any of these, stop and reconsider — either the belief has shifted (update this file with a dated entry explaining why) or the proposal is wrong.
>
> The `/jaewon-plugin:distinguished-engineer` skill checks proposals against this file and flags drift.

---

## What This Plugin Is

**jaewon-plugin is a personal Claude Code plugin that orchestrates work, never performs it. It enforces TDD, LOD compliance, and decision discipline through evidence-gated hooks and isolated subagents — so a long, multi-task session can compound learning instead of vaporizing it.**

It is not a generic AI-coding harness. It is not a memory store with skills bolted on. It is the orchestration discipline that lets the main session preserve insight while pushing all execution into isolated lanes.

---

## Core Beliefs

### 1. The main session never writes code

The main session is the *intent layer*. It reads the plan, writes briefs, dispatches agents, validates outputs. All code, tests, fixes, and edits happen inside spawned agents (test-generator, implementer, fixer, reviewer-structural, reviewer-deep). When the main session writes code directly, it pollutes its own context with execution detail and loses the ability to judge.

**Why:** Context discipline is the difference between a session that survives compaction and one that doesn't. Pushing execution into isolated lanes lets the main session keep room for judgment.

**Violation looks like:** the main session running Edit/Write to fix a test it just observed fail; the main session writing a regression test inline instead of spawning test-generator; the orchestrator skill (`implement`, `add-feature`, `debug`) producing code in the chat.

**Decision filter:** does this proposal have the main session writing code? If yes, stop.

---

### 2. Externalize state; the LLM is an open-book test-taker

`.jaewon/` is not a cache — it is the source of truth for cross-session continuity. status.json, checklist.json, debug-history/, blocked/, progress.md, traces/, decisions/, reflections/, review-evidence.jsonl, last-scribe-head — these exist so the loop survives compaction and resumes itself.

Memory is not "remembering more"; it is "knowing where to look." Agents and skills should read the right artifact at the right step, not stuff full files into context.

**Why:** Context windows are bounded. Sessions end. Compaction happens. Without disk-backed state, every session restarts cold and lessons vaporize.

**Violation looks like:** a skill that builds up state in the chat instead of writing it to disk; an agent that requires the full session transcript to function; a hook that decides based on a runtime variable that's lost on next invocation.

**Decision filter:** if a session crashed mid-flight, would the next session pick up from disk and continue? If no, persist more.

---

### 3. Never trust silent enforcement — every gate produces a verifiable artifact

A registered hook is not a running hook. A running hook that does nothing observable cannot be distinguished from a no-op. Every enforcement hook writes to `.jaewon/hook-trace.jsonl` (or another file a downstream check can read) so silent rot can't hide.

**Why:** Three sibling-project regressions cost weeks of broken enforcement: auto-fire dead 6 days when API key died; matcher dedup silently bypassed review for 16 days; isMain symlink mismatch since plugin install. All three were "this can't fail" guards that did. The defense is observability, not smarter guards.

**Violation looks like:** a new hook with no JSON-trace artifact; a skill claiming to "ensure X" without writing evidence; trust-the-process design without a watchdog.

**Decision filter:** what artifact would another check read to confirm this hook ran? If you can't name it, the hook is silent enforcement.

---

### 4. Evidence-gated commits, not promise-gated

The reviewer agents do not say "I reviewed this" — they write to `.jaewon/review-evidence.jsonl`. The pre-commit gate reads the ledger and blocks `git commit` when fresh evidence is missing. Trust artifacts, not intent.

**Why:** Trust-based review is exactly the silent-enforcement anti-pattern at the workflow level. The user (or Claude) thinks they reviewed. The next commit ships unreviewed.

**Violation looks like:** a "review skill" that returns APPROVE in chat without writing evidence; a hook that gates on a flag the agent sets but never persists; a manual checkbox in the user's head.

**Decision filter:** is this gate enforced by reading a file, or by trusting that something happened?

---

### 5. Decisions before plans, plans before code

Vague initial prompts produce polished versions of the wrong thing. Iteration polishes; it does not redirect. The decision harnesses (`decision-feature`, `decision-bugfix`, `decision-refactor`) are hard gates that block plan-writing until scope, non-goals, success criteria, and risk are written down.

**Why:** The bottleneck is the first decision, not the planning loop downstream. A multi-round planner on top of a vague prompt produces a polished version of the wrong feature.

**Violation looks like:** a skill that lets `add-feature` proceed without a decision doc; an interview-only skill that doubles as the decision artifact; an "experimental" path that skips scope.

**Decision filter:** is the user committing scope/non-goals/success/blast-radius BEFORE the planner runs?

---

### 6. Manual evolution, never auto-fire

The reflection → synthesis → apply loop is manual by design. Auto-fire silently rots — when the synthesizer breaks (API key dies, dependency fails, match logic changes), no one notices because nothing surfaces. Manual `/jaewon-plugin:evolve` keeps the user accountable and gives per-item approval its weight.

**Why:** Sibling project (Guya) auto-fired session-end synthesis on every close. The API key died and the pipeline silently completed-but-empty for 6 days before anyone noticed. Auto-fire is the easiest way to lose evolution to silent rot.

**Violation looks like:** any hook that fires the synthesizer without user invocation; any skill that auto-applies proposals without per-item approval; any mechanism that consumes reflections without writing a visible cycle log.

**Decision filter:** does this trigger evolution as a side-effect of normal work? If yes, that's auto-fire — block it.

---

### 7. Grow the rider, not just compensate

Hooks and skills should encode habits the user fails at — not generic best practices. A harness that papers over weaknesses turns into a crutch. Every guardrail is targeted at a specific failure mode the user has actually hit; if the user has internalized the lesson, the corresponding guardrail expires.

**Why:** A discipline-via-tooling system that keeps every guardrail forever ends up scolding the user for problems they no longer have, while missing the new ones. The real product is a more competent rider.

**Violation looks like:** adding a guardrail because some other plugin has it; keeping a hook that hasn't blocked anything in N months; a feature designed for "what users in general need" instead of "what I keep doing wrong."

**Decision filter:** which specific failure mode of mine does this address? If "general best practice", don't add it.

---

### 8. Three primitives, one role each

- **Agents** — for isolation. Different context, different system prompt, different tools. Use when the work needs to NOT touch main-session context.
- **Skills** — for repeatability. A playbook the model follows the same way every time. Use when the same workflow repeats.
- **Hooks** — for things that have to happen whether you remember or not. Lifecycle events: SessionStart, Stop, SubagentStop, PreToolUse, PostToolUse:Write|Edit, SessionEnd.

Mixing roles produces confusion: a skill that tries to enforce should be a hook; an agent that does the same thing the orchestrator does should be inlined.

**Why:** The three primitives have different costs and guarantees. Picking the wrong one produces a feature that fails its purpose silently.

**Violation looks like:** a hook used as a skill (auto-fires expensive work); an agent that's just a code helper (no isolation needed); a skill enforcing a policy the user could skip.

**Decision filter:** isolation, repeatability, or non-skippable? Pick one.

---

## What This Plugin Is Not

- **Not a generic coding assistant.** Claude already does that. This plugin's value is in the orchestration discipline.
- **Not a memory hierarchy / identity system.** No three-tier memory, no soul/identity files. Coding-focused. The `.jaewon/` directory is project state, not personality.
- **Not always-on.** Hooks fire only inside Claude Code sessions. There is no daemon. No background process between sessions.
- **Not feature-parity with sibling plugins.** Copying Guya / OMC / claude-mem feature-by-feature loses the focus. Borrow patterns; don't clone scope.

---

## How to Use This Document

Before merging a non-trivial change, walk through each belief's **Decision filter**:

1. Does this make the main session write code? (1)
2. Would the next session resume from disk if this crashed? (2)
3. Does the new gate produce an observable artifact? (3)
4. Is enforcement reading a file or trusting intent? (4)
5. Is the user committing scope BEFORE the planner runs? (5)
6. Does evolution stay manual? (6)
7. Does this address a specific failure mode of jaewon's, or is it generic? (7)
8. Is this an agent, a skill, or a hook? Are the boundaries clean? (8)

If any answer suggests a violation, stop and reconsider. `distinguished-engineer` skill automates this check on plan diffs.

When a belief shifts, update this file with a dated entry explaining the change. Drift without a recorded reason is how identity gets lost.
