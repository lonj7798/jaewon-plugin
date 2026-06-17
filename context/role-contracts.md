# jaewon-plugin — Role, Delegation & Completion Contracts

> Last updated: 2026-06-17 (v0.3)
>
> Consolidates the role/handoff/delegation/completion contracts that were previously
> implicit in skill prose and agent frontmatter. This is a **reference** the orchestrator
> and agents point to — not boilerplate to paste into every prompt. Per-role detail still
> lives in each `agents/*.md`; this file is the cross-cutting contract.
>
> Resolves #12 (role contracts), #15 (completion/done criteria), #17 (delegation rules).
> Governed by [core-beliefs.md](core-beliefs.md) — belief #1 (main never executes),
> #4 (evidence-gated), #8 (three primitives, one role each).

---

## 1. Role contract schema (#12)

Every role is defined by eight fields. If a field is ambiguous for a role, that is a bug in the role, not license to improvise.

`starts-when` · `must-read` · `owns` · `must-not` · `produces` · `hands-off-to` · `stops-when` · `escalates-when`

### Cross-cutting contract table

`must-read` and `starts-when` are in each agent's frontmatter; the contract-critical columns are below.

| Role | owns | must-not | produces | hands-off → | escalates-when |
|------|------|----------|----------|-------------|----------------|
| **orchestrator** (main session) | intent, dispatch, validation | write/edit code or tests | briefs, decisions | any agent | scope unclear vs decision doc → user |
| **planner** | plan docs + checklist.json | write code | `docs/plans/v{X}/` + checklist | architect | requirements ambiguous → user |
| **architect** | plan soundness verdict | edit plan/code | APPROVE/ITERATE + antithesis | critic ∣ planner | structural LOD violation |
| **critic** | final plan gate | edit plan/code | ACCEPT/REVISE | implement ∣ planner | 3rd revise cycle → user |
| **test-generator** | failing tests (RED) | write impl | tests that fail for the right reason | implementer | spec untestable → planner |
| **implementer** | minimal impl (GREEN) | edit tests | passing code + commit | reviewer-structural | tests unsatisfiable → tracer |
| **tracer** | read-only investigation | edit anything | Investigation Report (chain, ≥2 hypotheses, root cause + layer-question, fix plan) | fixer | cannot reproduce → user |
| **fixer** | minimal fix + regression test | broaden scope / redesign | RED-then-GREEN fix + commit | reviewer-structural | fix needs redesign → planner |
| **reviewer-structural** | 1st-pass review | edit code | APPROVE/REQUEST_CHANGES (critical/major/minor, file:line) → review-evidence.jsonl | reviewer-deep ∣ fixer | — |
| **reviewer-deep** | 2nd-pass review (after structural APPROVE) | re-litigate structural | APPROVE/REQUEST_CHANGES → review-evidence.jsonl | commit ∣ fixer | — |
| **retrieval-agent** | read-only retrieval lane | edit / decide | ≤8-bullet distilled answer + citations | orchestrator | sources conflict → flag, don't resolve |
| **synthesizer** | reflection→proposal synthesis | edit plugin files | proposals.json (≤5, ≥2-source) | user (per-item approval) | — |
| **wiki-maintainer** | **sole** writer of `docs/wiki/` | exceed 120 LOC/page | wiki pages + index | — | schema conflict → flag |
| **git-manager** | git ops with policy | force-push; merge failing tests | branches/commits/merges/tags | — | policy conflict → user |

---

## 2. Delegation rules (#17)

The default is **delegate**; the main session acts directly only for judgment and dispatch.

| Situation | Action |
|-----------|--------|
| Trivial read needed for a dispatch decision | direct (main session) |
| Any code/test change | spawn TDD chain: `test-generator` → `implementer` |
| Any bug needing root cause | spawn `tracer` → `fixer` |
| Multi-file search / lookup that would bloat main context | spawn `retrieval-agent` (never grep/read widely in main) |
| Independent tasks with no shared-context dependency | **fan out** parallel agents (e.g. per-file, per-dimension) |
| Task scope exceeds its decision doc / blast radius | **escalate to planning** — do not let an agent widen scope |

Never: main session edits code; an agent re-does the orchestrator's dispatch role; delegation of a task so small the spawn cost exceeds the work.

---

## 3. Completion / done schema (#15)

Every completion or handoff (subagent report, `handoff.md`, PR readiness) states all six, so "done" is auditable from artifacts, not inferred from prose:

1. **files_read** — what was consulted
2. **files_changed** — what was modified (with commit SHA if committed)
3. **validations_run** — commands + results (tests, smoke, lint)
4. **blockers / uncertainty** — what is unresolved, stated explicitly (not buried)
5. **next_recommended_action** — the single best next step
6. **status** — exactly one of `done` · `partial` · `blocked`

`stop-guard` enforces the project-level version of this: it refuses exit while checklist tasks are `pending`/`in_progress`. A task is `done` only when its acceptance criteria are validated (belief #4 — evidence, not promise).
