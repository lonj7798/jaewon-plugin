---
name: initial-plan
description: Creates a detailed, versioned implementation plan through Socratic QA interview followed by Planner->Architect->Critic consensus loop. Produces LOD-compliant, TDD-first plans with machine-readable checklists. Use when starting a new project or feature that needs planning. Keywords: plan, initial plan, plan project, start planning, make a plan, create plan.
---

<Purpose>
Initial Plan takes a user from idea to a detailed, versioned implementation plan. It runs in the main session (intent layer) and orchestrates: git setup, Socratic interview, Planner/Architect/Critic consensus loop, auto-versioning, checklist generation, and state persistence. All plans enforce LOD Hard Rules and detect applicable LOD Design Patterns, mandating TDD with RED/GREEN/REFACTOR tasks in every phase.
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
- All plans enforce LOD Hard Rules and detect applicable LOD Design Patterns
- TDD is mandatory: every phase includes RED/GREEN/REFACTOR tasks
- Ask ONE question at a time during the interview
- Gather codebase facts via explore agent BEFORE asking the user about them
</Execution_Policy>

<Steps>

## Step 1: Git Setup
Read `.jaewon/settings.json`. If `git.auto_manage` is true, ensure `dev` branch exists and is checked out. Otherwise skip.

## Step 2: QA Interview (Socratic, One Question at a Time)
1. Announce the interview with the user's stated idea
2. Ask ONE question per round targeting the weakest area (Goal Clarity, Constraints, Success Criteria, Tech Stack)
3. Wait for answer before next question. Build on previous rounds
4. Minimum 5 questions; continue until scope is clear
5. Use explore agent (haiku) for codebase facts before asking the user
6. Save transcript to `docs/interview/interview-{date}.md`
7. Extract spec to `docs/interview/spec-{date}.md`

## Step 3: Planning Loop (Planner -> Architect -> Critic)
Sequential consensus loop. Maximum 5 iterations.

**3a: Planner** -- `Task(subagent_type="jaewon-plugin:planner", model="opus")`
Must produce Phase 0 (LOD Architecture) and Phase 1-N (TDD phases with RED/GREEN/REFACTOR).

**3b: Architect** -- `Task(subagent_type="jaewon-plugin:architect", model="opus")` (read-only)
Evaluates LOD compliance, architecture, interfaces, acyclic dependencies.
Returns APPROVE or ITERATE with revision requests.

**3c: Critic** -- `Task(subagent_type="jaewon-plugin:critic", model="opus")` (read-only, after Architect approves)
Evaluates principle consistency, fair alternatives, testable criteria, risk coverage.
Returns ACCEPT or REVISE with objections.

Read [lod-rules.md](${CLAUDE_SKILL_DIR}/references/lod-rules.md) for LOD Hard Rules and Design Patterns to enforce during planning.

## Step 4: Auto-Version
Read `.jaewon/status.json` for `plan.current_version`. Bump minor: null -> v0.1, v0.1 -> v0.2.

## Step 5: Generate Checklist
Read [plan-output-format.md](${CLAUDE_SKILL_DIR}/references/plan-output-format.md) for the checklist.json schema and plan document structure.

## Step 6: Save and Update State
Save all plan documents to `docs/plans/v{X.Y}/`. Update `.jaewon/status.json` with plan metadata.

## Step 7: Present Summary
Display: plan version, phase table (name, task count, TDD triplets), checklist summary, plan location, next steps.

</Steps>

<Tool_Usage>
- `AskUserQuestion` for interview questions (clickable UI with contextual options)
- `Task(subagent_type="oh-my-claudecode:explore", model="haiku")` for codebase exploration
- `Task(subagent_type="jaewon-plugin:planner|architect|critic", model="opus")` for consensus loop (sequential)
- `Write` for plan documents, transcripts, specs
- `Read` for `.jaewon/settings.json` and `.jaewon/status.json`
- `Bash` for git operations
</Tool_Usage>

<Examples>
<Good>
Round 1 Q: "What is the primary goal of this project?"
Round 1 A: "A CLI tool to manage dotfiles"
Round 2 Q: "When you say 'manage dotfiles', do you mean symlink management, version control, or both?"
Why good: Builds on the specific answer, asks one focused follow-up.
</Good>
<Bad>
"What's the goal? What tech stack? Who are the users? What's the timeline?"
Why bad: Four questions at once produces shallow answers. Ask one at a time.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Interview stalls (3+ vague answers): offer to proceed, note gaps
- No consensus after 5 iterations: present best version with unresolved concerns
- User says "enough" or "just build it": skip to planning with current understanding
- Git branch conflict: warn user, proceed on current branch
- Missing settings files: create with defaults
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Git branch setup completed (if auto_manage enabled)
- [ ] Interview conducted (min 5 rounds or user exited early)
- [ ] Transcript and spec saved
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
