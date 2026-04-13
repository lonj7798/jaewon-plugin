---
name: initial-plan
description: Creates a detailed, versioned implementation plan through Socratic QA interview followed by Planner→Architect→Critic consensus loop. Produces LOD-compliant, TDD-first plans with machine-readable checklists. Use when starting a new project or feature that needs planning. Keywords: plan, initial plan, plan project, start planning, make a plan, create plan.
---

<Purpose>
Initial Plan takes a user from idea to a detailed, versioned implementation plan. It runs in the main session (intent layer) and orchestrates: git setup, Socratic interview, Planner/Architect/Critic consensus loop, auto-versioning, checklist generation, and state persistence. All plans enforce LOD Hard Rules (7 rules), detect applicable LOD Design Patterns (9 patterns), and mandate TDD with RED/GREEN/REFACTOR tasks in every phase.
</Purpose>

<Use_When>
- User says "plan", "initial plan", "plan project", "start planning", "make a plan", "create plan"
- User is starting a new project or feature that needs structured planning
- User wants a versioned, LOD-compliant implementation plan with TDD phases
</Use_When>

<Do_Not_Use_When>
- User has an existing plan and wants to execute it -- use ralph or autopilot
- User wants a quick fix or single file change -- delegate to executor
- User says "just do it" or "skip planning" -- respect their intent
</Do_Not_Use_When>

<Execution_Policy>
- Planning runs in the main session (not spawned as a separate agent)
- Each planning agent (Planner, Architect, Critic) is spawned sequentially, never in parallel
- Main session writes focused briefs for each agent
- All plans enforce LOD Hard Rules and detect applicable LOD Design Patterns
- TDD is mandatory: every phase includes RED/GREEN/REFACTOR tasks
- Ask ONE question at a time during the interview -- never batch questions
- Gather codebase facts via explore agent BEFORE asking the user about them
</Execution_Policy>

<Steps>

## Step 1: Git Setup

1. Read `.jaewon/settings.json` -- check if `git.auto_manage` is `true`
2. If true: ensure `dev` branch exists and is checked out (`git checkout -b dev` or `git checkout dev`)
3. If false or settings not found: skip branch management, proceed on current branch

## Step 2: QA Interview (Socratic, One Question at a Time)

### Protocol
1. Announce the interview with the user's stated idea
2. Ask ONE question per round targeting the weakest area of understanding
3. Wait for the answer before asking the next question
4. Build each question on what was learned in previous rounds
5. Minimum 5 questions; continue until scope is clear
6. Use `Task(subagent_type="oh-my-claudecode:explore", model="haiku")` to gather codebase facts before asking the user

### Coverage Dimensions

| Dimension | Purpose |
|-----------|---------|
| Goal Clarity | What exactly are we building? |
| Constraints | What are the boundaries and limitations? |
| Success Criteria | How do we verify it works? (must be testable) |
| Tech Stack | What technologies are required or preferred? |

### Output
- Save transcript to `docs/interview/interview-{date}.md` (metadata + full Q&A per round)
- Extract spec to `docs/interview/spec-{date}.md` (goal, constraints, non-goals, success criteria, tech stack, key decisions)

## Step 3: Planning Loop (Planner -> Architect -> Critic)

Sequential consensus loop. Maximum 5 iterations.

```
Planner (creates/revises) -> Architect (reviews) -> Critic (validates)
    ^                                                      |
    |_____________ ITERATE/REVISE feedback ________________|
```

### 3a: Planner Agent
Spawn via `Task(subagent_type="jaewon-plugin:planner", model="opus")`.

**Input**: Interview spec, codebase context, revision notes (if looping).

**Must produce:**
- **Phase 0 -- LOD Architecture**: System decomposition per LOD Hard Rules, design pattern detection, module boundaries with interfaces, dependency graph
- **Phase 1-N -- TDD Phases**: Each with RED (failing tests), GREEN (minimal passing code), REFACTOR (cleanup while green). Ordered by dependency.

### 3b: Architect Agent
Spawn via `Task(subagent_type="jaewon-plugin:architect", model="opus")`. Read-only.

**Evaluates**: LOD compliance, architectural soundness, interface cleanliness, acyclic dependencies.

**Must provide**: steelman antithesis (strongest counter-argument), tradeoff tensions (at least one), synthesis path.

**Returns**: APPROVE (proceed to Critic) or ITERATE (back to Planner with revision requests).

### 3c: Critic Agent
Spawn via `Task(subagent_type="jaewon-plugin:critic", model="opus")`. Read-only. Runs only after Architect approves.

**Evaluates**: principle consistency, fair alternatives, testable criteria, risk coverage.

**Must reject**: shallow alternatives, vague risks without metrics, untestable criteria, missing TDD structure.

**Returns**: ACCEPT (proceed to versioning) or REVISE (back to Planner with objections, full loop restarts).

### Max Iterations
After 5 iterations without consensus, present best version noting unresolved concerns.

## Step 4: Auto-Version

1. Read `.jaewon/status.json` for `plan.current_version`
2. Bump: null -> `v0.1`, `v0.1` -> `v0.2`, etc. (increment minor each cycle)
3. Create directory: `docs/plans/v{X.Y}/`

## Step 5: Generate Checklist

Create `docs/plans/v{X.Y}/checklist.json` with structure:

- Top-level: `version`, `generated`, `total_tasks`, `parallel_count`, `sequential_count`
- `phases[]`: each with `id`, `name`, and `tasks[]`
- Each task: `id`, `title`, `type` (architecture/test/implementation/refactor), `parallel` (bool), `depends_on` (id[]), `status` (pending), `tdd_stage` (null/red/green/refactor)

**Rules:**
- Tasks default to `parallel: true` unless they have explicit `depends_on`
- TDD tasks within a phase are sequential: red -> green -> refactor
- Every implementation phase must have at least one red/green/refactor triplet

## Step 6: Save and Update State

### Plan Documents to `docs/plans/v{X.Y}/`

| File | Contents |
|------|----------|
| `00-overview.md` | RALPLAN-DR summary, ADR, roadmap |
| `01-phase0-architecture.md` | LOD decomposition, module boundaries, dependency graph |
| `02-phase1-{name}.md` ... `{N}-phase{N}-{name}.md` | TDD implementation phases |
| `checklist.json` | Machine-readable task list |
| `checklist.md` | Human-readable compliance checklist |
| `risks.md` | Risk assessment with mitigations |
| `notes.md` | Implementation notes, constraints, decisions |

### Update `.jaewon/status.json`

Set `plan.current_version`, `plan.plan_path`, `plan.checklist_path`, `plan.phase` ("plan"), `plan.created_at`, `plan.consensus_iterations`, `plan.interview_rounds`. Merge with existing content. Create `.jaewon/` if missing.

## Step 7: Present Summary

Display to user:
- Plan version and overview (1-2 sentences)
- Phase table: phase number, name, task count, TDD triplet count
- Checklist summary: total/parallel/sequential tasks, TDD coverage
- Plan location path
- Next steps: execute with ralph, team, autopilot, or refine further

</Steps>

<Tool_Usage>
- `AskUserQuestion` for interview questions (clickable UI with contextual options)
- `Task(subagent_type="oh-my-claudecode:explore", model="haiku")` for codebase exploration before asking user
- `Task(subagent_type="oh-my-claudecode:planner", model="opus")` for plan creation/revision
- `Task(subagent_type="oh-my-claudecode:architect", model="opus")` for architectural review (read-only)
- `Task(subagent_type="oh-my-claudecode:critic", model="opus")` for quality validation (read-only)
- Consensus loop agents MUST be sequential -- await each result before spawning the next
- `Write` for plan documents, transcripts, specs
- `Read` for `.jaewon/settings.json` and `.jaewon/status.json`
- `Bash` for git operations
</Tool_Usage>

<LOD_Rules>
**Hard Rules** (all plans must enforce):
1. Single Responsibility -- one reason to change per module
2. Dependency Inversion -- depend on abstractions, not concretions
3. Interface Segregation -- no forced dependencies on unused methods
4. Acyclic Dependencies -- module graph must be a DAG
5. Stable Abstractions -- abstractness increases with stability
6. Common Closure -- classes that change together belong together
7. Common Reuse -- classes used together belong together

**Design Patterns** (detect and apply where relevant):
Facade, Adapter, Strategy, Observer, Repository, Factory, Mediator, Decorator, Command
</LOD_Rules>

<Examples>
<Good>
```
Round 1 Q: "What is the primary goal of this project?"
Round 1 A: "A CLI tool to manage dotfiles"
Round 2 Q: "When you say 'manage dotfiles', do you mean symlink management,
            version control, or both?"
```
Why good: Builds on the specific answer, asks one focused follow-up.
</Good>

<Bad>
```
"What's the goal? What tech stack? Who are the users? What's the timeline?"
```
Why bad: Four questions at once produces shallow answers. Ask one at a time.
</Bad>

<Bad>
```
[spawns Architect and Critic simultaneously]
```
Why bad: Critic must evaluate the Architect-approved plan. Sequential only.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Interview stalls (3+ vague answers): offer to proceed, note gaps
- No consensus after 5 iterations: present best version with unresolved concerns
- User says "enough" or "just build it": skip to planning with current understanding
- Git branch conflict: warn user, proceed on current branch
- Missing settings files: create `.jaewon/settings.json` and `.jaewon/status.json` with defaults
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Git branch setup completed (if auto_manage enabled)
- [ ] Interview conducted (min 5 rounds or user exited early)
- [ ] Transcript saved to `docs/interview/interview-{date}.md`
- [ ] Spec extracted to `docs/interview/spec-{date}.md`
- [ ] Planner -> Architect -> Critic consensus loop completed
- [ ] All phases include TDD red/green/refactor structure
- [ ] LOD Hard Rules enforced in Phase 0 architecture
- [ ] Plan auto-versioned and saved to `docs/plans/v{X.Y}/`
- [ ] All plan documents generated (overview, phases, checklist, risks, notes)
- [ ] `checklist.json` has correct parallel/depends_on flags
- [ ] `.jaewon/status.json` updated with plan metadata
- [ ] Summary presented with phase counts and next steps
</Final_Checklist>

Task: {{ARGUMENTS}}
