# jaewon-plugin — Vision

> The north star: what we're building, why it matters, and how we'll know it's done.

---

## One-Liner

A long, multi-task session compounds learning instead of vaporizing it — the main session keeps room for judgment, every gate has an artifact, and the next session resumes the loop without me having to re-explain.

---

## What "Done" Looks Like

### 1. Insight stays in the main session

The main session never writes code. All execution (tests, fixes, edits, reviews) happens in spawned agents (`test-generator`, `implementer`, `fixer`, `reviewer-structural`, `reviewer-deep`, `tracer`, `synthesizer`, `retrieval-agent`). The orchestrator skill (`implement`, `add-feature`, `debug`, `review`, `evolve`) reads briefs and dispatches; it does not run grep / read / edit on the codebase.

**Acceptance criteria:**
- A 13-task implementation plan executes without the main session running Edit/Write/Bash for code work
- Subagent dispatch is the only path to source-code modification
- A session that hits compaction at 70% can be resumed cold with `.jaewon/` state alone

### 2. Every gate has an artifact

Enforcement is evidential, not promissory. Every hook produces a verifiable side-effect another check can confirm. Every skill that "ensures X" writes a file proving X.

**Acceptance criteria:**
- `git commit` is blocked without fresh `.jaewon/review-evidence.jsonl`
- `add-feature` and `initial-plan` are blocked without a fresh `.jaewon/decisions/` artifact
- Every registered hook appends to `.jaewon/hook-trace.jsonl` so silent rot surfaces in the smoke test
- A registered hook that produces no artifact fails the smoke test before merge

### 3. Lessons compound across sessions

Reflections accumulate as `.jaewon/reflections/YYYY-MM-DD.md`. The synthesizer turns them into proposals.json. The user reviews proposals one at a time and applies approved patches as `evolve(v0.X)` commits. The next session reflects the change in actual behavior, not just in a doc.

**Acceptance criteria:**
- A reflection written today produces an actionable synthesizer proposal within a week
- Applied evolve patches are visible in the next session's behavior (skill steps, agent prompts, CLAUDE.md)
- The ≥2-source rule blocks single-source agent-prompt changes
- SessionStart surfaces an EVOLVE BACKLOG nudge when ≥3 reflections are unsynthesized

### 4. Decisions land before plans

The user commits scope, non-goals, success criteria, and blast radius BEFORE Claude commits to a plan. The decision harness is a hard gate; the Socratic interview is downstream of the harness, not a substitute for it.

**Acceptance criteria:**
- `add-feature` and `initial-plan` refuse to proceed without a fresh `.jaewon/decisions/{slug}.md`
- Decision-doc scope is cross-checked against the diff at PR time (`jaewon-pr`)
- Non-goal violations surface as PR readiness flags, not as merge surprises

### 5. The plugin gets sharper at what jaewon repeats wrong

The plugin's hooks and skills target specific failure modes — vague prompts, silent error swallowing, scope creep, post-commit work that doesn't run on terminal commits, evolution that auto-fires and dies. Each guardrail is traceable to a real incident, not to a generic best-practice list.

**Acceptance criteria:**
- Every hook in `hooks.json` corresponds to a documented failure mode (regression history in `hooks/CLAUDE.md`)
- Guardrails that haven't blocked anything in 90 days are evaluated for retirement (not silently kept)
- New features pass the `distinguished-engineer` drift check against `core-beliefs.md`

---

## Engineering Quality Bars

- **Token efficiency at session start.** `<jaewon-context>` block ≤ 8000 chars (~2000 tokens) with explicit selection logic, not a dump.
- **Hook reliability via observability.** Every enforcement hook produces a JSONL trace artifact; smoke test asserts it.
- **Idempotency of post-commit work.** `last-scribe-head` marker uses 40-char SHA; running the scribe twice on the same HEAD is a no-op.
- **Atomic writes.** Marker files and proposals.json use temp + rename to avoid mid-write reads.
- **Bounded inputs.** Synthesizer reads ≤30 reflections / 30 days; emits ≤5 proposals.

---

## Out of Scope (revisit later)

- Three-tier memory hierarchy (Letta-style)
- Identity / soul / growth-tracker files (Guya-style)
- Auto-fire evolution (explicit anti-pattern per belief #6)
- Daemon / always-on background services
- Universal-scope skills (life, communication, learning) — this is a coding-focused plugin

---

## Relationship to Sibling Plugins

- **OMC (`oh-my-claudecode`):** orchestration substrate; this plugin runs alongside it and uses `omc ask codex` etc. for fresh-eyes review. Not a competitor — a consumer.
- **Guya (`_resources/guya/`):** primary inspiration. Borrowed patterns: hook-trace contract, evidence-gated commit, two-pass review, manual evolve, native git hooks for events Claude Code doesn't dispatch. Did NOT borrow: identity files, three-tier memory, universal scope, auto-fire.
- **claude-mem:** cross-session persistence; orthogonal — `.jaewon/` is project-local state, claude-mem covers cross-conversation memory.

The borrowed patterns are documented as such in `hooks/CLAUDE.md` regression history so future contributors know which lessons came from which incident, not from rote feature-copying.
