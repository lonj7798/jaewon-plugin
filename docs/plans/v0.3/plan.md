# jaewon-plugin v0.3 — Plan

**Theme:** *Make the harness learn and gate itself, not just orchestrate.*

**Status:** Draft (2026-05-02)
**Source issues:** #8 (closed via PR #10), #9 (PR #11 open), plus Guya audit findings.

## Goal

Move the plugin from "well-engineered TDD orchestrator" to "harness that learns from its own runs and refuses to drift" — by adding three primitives we currently lack:

1. **Evidence-gated enforcement** (no hook is trusted to have run; every gate reads an artifact)
2. **Reflection → synthesis → apply loop** (lessons compound across sessions instead of vaporizing)
3. **Hard-gated decisions** (scope / non-goals / success criteria committed *before* any plan, not extracted by interview)

## Non-goals

- Not building three-tier memory (universal-scope feature; we are coding-focused)
- Not adding identity/soul/growth-tracker files (Guya is named after a teddy bear; we are not)
- Not auto-firing `evolve` (Guya proved auto-fire silently rots; manual stays)
- Not chasing feature parity with Guya — only the patterns that close *our* failure modes

## Success criteria (v0.3 ships when)

- A `git commit` without review evidence is **blocked** by a hook gate, with a verifiable artifact at `.jaewon/review-evidence.jsonl`
- A full `/jaewon-reflect` → `/jaewon-evolve` → applied-edit cycle runs end-to-end, with the next session's behavior actually reflecting the change
- A feature flow refuses to write a plan until a `decisions/{slug}.md` artifact exists with scope, non-goals, success criteria, and blast radius
- `.jaewon/traces/YYYY-MM-DD.jsonl` accumulates Write/Edit events with no perceptible latency cost
- Native git `post-commit` updates `session-log.md` and `status.json` even when commits happen outside a Claude session
- `<jaewon-context>` at session start fits within an explicit ~2000-token budget
- Every enforcement hook produces a verifiable side-effect (log line, JSONL entry, marker write) that another check can confirm

## Phases

Each phase ships as one PR (`dev` → `main`), with its own task-level checklist created on entry.

### Phase 0 — Housekeeping

**Why:** close leftover work and lock in the platform-constraint patterns Guya learned the hard way before adding new gates on top.

- 0.1 Merge PR #11 (live progress feedback) — closes #9
- 0.2 Audit `hooks.json` for `PreToolUse:Bash` matcher dedup; if multiple Bash matchers exist, consolidate to a single `hooks/pre-bash-dispatch.mjs` that fans out internally; document the rule in `hooks/CLAUDE.md`
- 0.3 Verifiable-side-effect audit: every existing hook must emit a log line + JSONL entry to `.jaewon/hook-trace.jsonl` so silent-no-op regressions surface
- 0.4 Add a hook smoke-test (`hooks/__tests__/hooks-smoke.test.mjs`) that runs each hook with a synthetic payload and asserts the side-effect appears

**Risk:** low. **Effort:** ~½ day. **Gate:** smoke test green; one synthetic Bash call produces both stdout decision and a `.jaewon/hook-trace.jsonl` entry.

### Phase 1 — Foundation (data feeds for the learning loop)

**Why:** the synthesizer in Phase 4 has no inputs without traces. Bound the session-start budget so it doesn't grow into the new artifacts.

- 1.1 `hooks/trace-capture.mjs` on `PostToolUse:Write|Edit` → `.jaewon/traces/YYYY-MM-DD.jsonl` (`{ts, tool, file, session_id}`); cap 5MB/file; <50ms; no LLM
- 1.2 Token budget on `session-start.mjs`: cap `<jaewon-context>` at ~2000 tokens with explicit selection (last handoff, active task, top-N recent debug-history entries by relevance, current progress.md summary)
- 1.3 New MCP tool `jaewon_traces` (read/search/summarize) so the synthesizer can consume them without re-reading raw JSONL

**Risk:** low. **Depends on:** 0.x. **Gate:** a 1-hour synthetic session produces a populated traces file; session-start context fits in budget on a real `.jaewon/` with a year of history.

### Phase 2 — Quality gates (commit hygiene + review enforcement)

**Why:** the highest-impact phase. Today the plugin trusts that the reviewer ran. That's the silent-enforcement anti-pattern. After this phase, no commit lands without proof.

- 2.1 Split `reviewer` into `reviewer-structural` (simplicity, surgical changes, silent errors, security, races, AI-specific risks) and `reviewer-deep` (logic, state, data integrity, observability, boundaries, performance, dependency risk, test gaps, cleanup); each writes evidence
- 2.2 Cleanup-pattern scan: deterministic grep over staged files for `HACK` / `FIXME` / `debugger` / `console.log` / `breakpoint()` / `pdb.set_trace`; per-file LOC cap (default 800 / function 80); configurable via `.jaewon/pre-commit-config.json`
- 2.3 Evidence-gated commit: reviewers append to `.jaewon/review-evidence.jsonl`; `hooks/pre-commit-review.mjs` (registered under the Bash dispatcher from 0.2) blocks `git commit` if evidence missing or stale (>30 min); skip on merge/rebase
- 2.4 Native git post-commit scribe: `setup-jaewon` skill installs `.git/hooks/post-commit` → `hooks/post-commit-scribe.mjs` (appends to `session-log.md`, updates `status.json`, advances `.jaewon/last-scribe-head` marker, resets `review-evidence.jsonl`); idempotent on re-run; does nothing if HEAD didn't advance
- 2.5 `--no-verify` documentation: explicit user-facing note in `setup-jaewon` output

**Risk:** medium (gate misfire blocks user; `--no-verify` is the escape hatch). **Depends on:** 0.2 (dispatcher pattern). **Gate:** commit without review → blocked with clear message; with fresh evidence → succeeds; manual `git commit` from terminal updates `status.json` and `session-log.md` automatically; running the scribe twice on the same HEAD is a no-op.

### Phase 3 — Decision-forcing (upstream of any plan)

**Why:** vague initial prompts are the #1 source of polished-but-wrong plans (Guya's origin lesson, and ours too). Force the user to commit before Claude commits.

- 3.1 Skills `/jaewon-decision-feature`, `/jaewon-decision-bugfix`, `/jaewon-decision-refactor`: each blocks on **scope, non-goals, success criteria, blast radius** before any plan write. Output: `.jaewon/decisions/{date}-{slug}.md`
- 3.2 Wire `initial-plan` and `add-feature` to require an existing decision doc, or to invoke the appropriate decision skill first
- 3.3 Skill `/jaewon-pr` — full-diff fresh-eyes pass via OMC `omc ask codex` or `/team N:codex`; readiness checklist (scope, breaking changes, migrations, tests, docs, cross-diff consistency); auto-drafted PR body; cross-checks against the originating decision doc

**Risk:** low (additive). **Depends on:** none strict, lands cleanly after 2.x. **Gate:** running `add-feature` without a decision doc errors with a pointer to the right decision skill; `/jaewon-pr` emits a readiness report + a pasteable PR body.

### Phase 4 — Learning loop (close the compounding gap)

**Why:** today, lessons (`debug-history/`, `blocked/`, `notes/`) accumulate but don't compound. This phase turns that data into actual hardening.

- 4.1 Skill `/jaewon-reflect` — at session end, write a dated reflection to `.jaewon/reflections/YYYY-MM-DD.md` (what worked, what didn't, one rule worth promoting); manual invocation
- 4.2 Agent `synthesizer` (sonnet) — reads reflections + traces + debug-history; proposes targeted edits to `CLAUDE.md`, `agents/*.md`, `skills/*/SKILL.md`; emits a JSON proposal artifact at `.jaewon/evolve/proposals.json`; never writes to the plugin directly
- 4.3 Skill `/jaewon-evolve` — manual invocation (auto-fire is explicit anti-pattern); loads proposals → user approves per item → applies edits → commits with `evolve(v0.3): ...`; **≥2 source-reflections required** for any agent-prompt change
- 4.4 SessionStart nudge: surface backlog count when `/jaewon-evolve` hasn't run in N days

**Risk:** medium (proposals mutate plugin behavior — but per-item approval and ≥2-source rule contain that). **Depends on:** 1.1 (traces). **Gate:** one full reflect → synthesize → approve → apply → commit cycle on a real session, with the next session's behavior actually reflecting the change.

### Phase 5 — Onboarding & guardrails

**Why:** prevent the plugin from quietly turning into a generic AI-coding harness as features accumulate.

- 5.1 Skill `/jaewon-scout` — produces `scout-report.md` (directory map, where-to-start, conventions, gotchas) on first entry into an unfamiliar repo; uses the retrieval-agent under the hood
- 5.2 Author `context/core-beliefs.md` (LOD rules, "main session never writes code", "evidence-gated everything", "verifiable side-effect contract", "decisions before plans", "manual evolve, never auto") and `context/vision.md`
- 5.3 Skill `/jaewon-distinguished-engineer` — periodically checks proposals against `core-beliefs.md`; flags drift; refuses to apply Phase 4 proposals that violate stated beliefs

**Risk:** low. **Depends on:** prior phases shaping which beliefs are worth committing to. **Gate:** `/jaewon-distinguished-engineer` flags at least one drift case in a synthetic test (e.g. a proposal that has the main session writing code).

## Sequencing & risk

- **Critical path:** 0 → 1 → 2. Phase 2 is the highest-impact; everything after compounds on it.
- **Parallel-safe:** 3 (decisions) and 4 (learning) can run in parallel once 2 ships.
- **Rollback:** every phase ships as one PR — `git revert` is one command away.
- **Anti-bloat check:** at the end of each phase (once 5.x lands), run `/jaewon-distinguished-engineer` against the diff to confirm we haven't drifted.

## Out of scope (revisit in v0.4+)

- Three-tier memory hierarchy
- Identity / soul files
- Auto-evolve (per Guya regression)
- Obsidian sync
- Correction-signal regex on UserPromptSubmit
- Universal-scope (non-coding) skills
