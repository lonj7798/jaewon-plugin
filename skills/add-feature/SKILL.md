---
name: add-feature
description: Extend an existing codebase with a new feature using a lightweight planning and TDD workflow. Creates a feature branch, scopes the change, plans, implements with TDD, and merges back. Lighter than initial-plan for incremental additions. Keywords: add feature, new feature, feature branch, extend.
---

<Purpose>
Add-feature extends an existing codebase with a new feature. It is lighter than initial-plan because it reuses the existing architecture rather than creating one from scratch. The workflow is: branch, scope, plan, implement, merge. All changes go through TDD and LOD compliance checks.
</Purpose>

<Use_When>
- User says "add feature", "new feature", "feature branch", "extend"
- An existing plan and architecture exist in `.jaewon/architecture/` or `docs/plans/`
- The change is additive (new capability) rather than foundational (new project)
</Use_When>

<Do_Not_Use_When>
- No existing codebase or plan — use `initial-plan` instead
- User wants to fix a bug — use `debug` skill
- User wants a refactor — use `initial-plan` with refactor scope
- User says "just do it" or "skip planning" — delegate to executor directly
</Do_Not_Use_When>

<Execution_Policy>
- Main session orchestrates; agents write code
- Feature branches isolate all changes
- Reuse existing architecture — do not redesign the system
- LOD compliance checked on new files only (existing files are read-only context)
- TDD mandatory: test-generator (RED) then implementer (GREEN/REFACTOR)
</Execution_Policy>

<Steps>

## Step 1: Git — Create Feature Branch

1. Read `.jaewon/settings.json` — check `git.auto_manage`
2. If auto_manage is true:
   - Spawn git-manager agent to create `feature/{feature-name}` from `dev`
   - Verify branch creation succeeded
   - Report the new branch and base commit
3. If auto_manage is false or settings not found:
   - Skip branch management, proceed on current branch
   - Warn user that changes are not isolated

## Step 2: Scope Analysis

1. Read existing architecture from `.jaewon/architecture/` if it exists
2. Read existing plan docs from `docs/plans/` for context
3. Use `Task(subagent_type="oh-my-claudecode:explore", model="haiku")` to:
   - Map existing modules and their responsibilities
   - Find integration points where the new feature connects
   - Identify existing patterns the feature should follow (naming, error handling, imports)
   - Check for shared utilities the feature can reuse
4. Produce a scope summary:
   - What modules are affected
   - What new modules are needed
   - What existing patterns to follow
   - What shared utilities to reuse

## Step 3: Quick Interview (Optional)

If the feature scope is ambiguous, ask 3-5 clarifying questions (one at a time):

| Dimension | Example Question |
|-----------|-----------------|
| Behavior | "Should the webhook retry on failure, or fire-and-forget?" |
| Integration | "Does this integrate with the existing event bus or need a new one?" |
| Scope boundary | "Should this handle only Slack, or also Discord and email?" |
| Error handling | "What happens when the external service is down?" |
| Data model | "Does this need a new database table or extend an existing one?" |

Skip the interview if the user provided a detailed specification or said "just build it."

## Step 4: Lightweight Plan

1. Spawn `Task(subagent_type="oh-my-claudecode:planner", model="opus")` with:
   - Feature description and scope summary from Step 2
   - Existing architecture context (file tree, module boundaries)
   - Interview answers (if collected)
   - Instruction: produce a LIGHTWEIGHT plan — no Phase 0 architecture redesign
2. The plan must include:
   - New files with calling specs and LOC estimates (each <= 800 LOC)
   - Modified files with description of changes
   - TDD phases: RED/GREEN/REFACTOR for each new module
   - LOD compliance check on new files only
   - Integration points with existing code
3. Save plan to `docs/plans/v{X.Y}/feature-{name}.md`
4. Generate `checklist.json` for the feature tasks (same format as initial-plan)

## Step 5: Implement — TDD Pipeline

Execute the same pipeline as the `implement` skill:

1. Load checklist from Step 4
2. Analyze dependencies and build execution batches
3. For each task:
   a. Write task brief (same format as implement skill)
   b. Spawn test-generator (RED) — write failing tests
   c. Spawn implementer (GREEN + REFACTOR) — make tests pass, clean up
   d. Update checklist after each task
4. Parallel tasks dispatch concurrently (max 4 per batch)
5. Sequential tasks run one at a time
6. Handle blocked tasks and test disputes (same as implement skill)

## Step 6: Merge Feature Branch

1. If git auto_manage is true:
   - Spawn git-manager to merge `feature/{feature-name}` into `dev`
   - Git-manager will: run all tests, check for conflicts, perform merge
   - If tests fail: report and do NOT merge
   - If conflicts: report and let user resolve
   - If merge succeeds: report merge commit
2. If git auto_manage is false:
   - Skip merge, report that changes are on current branch
   - Suggest manual merge if appropriate

## Step 7: Update Architecture Docs

1. If `.jaewon/architecture/` exists:
   - Add new modules to the architecture map
   - Update dependency graph with new connections
   - Add calling specs for new public interfaces
2. Update `.jaewon/status.json`:
   - Record the feature as completed
   - Update plan version if applicable
   - Log the feature branch and merge commit

</Steps>

<Tool_Usage>
- `Task(subagent_type="oh-my-claudecode:explore", model="haiku")` for scope analysis
- `Task(subagent_type="oh-my-claudecode:planner", model="opus")` for lightweight planning
- `Task(subagent_type="oh-my-claudecode:executor", model="sonnet")` for test-generator and implementer
- `SendMessage` for teammate dispatch (preferred over Task when teams available)
- `Read` for existing architecture, plan docs, settings
- `Write` for plan docs, checklist, architecture updates
- `Bash` for git operations (when git-manager agent is not used)
- `jaewon_checklist_update` for tracking task completion
</Tool_Usage>

<Examples>
<Good>
```
User: "Add a webhook notification feature"
[Step 1] Creates feature/webhook-notification from dev
[Step 2] Reads existing event system, finds EventBus module to integrate with
[Step 3] Asks: "Should webhooks retry on failure?" → User: "Yes, 3 retries with backoff"
[Step 4] Plans: webhook-handler.js (new, 200 LOC), webhook-config.js (new, 80 LOC),
         event-bus.js (modify: add webhook subscriber)
[Step 5] TDD: test-generator writes failing webhook tests, implementer makes them pass
[Step 6] Merges feature/webhook-notification into dev after tests pass
[Step 7] Updates architecture docs with new webhook module
```
Why good: Lightweight, reuses existing EventBus, isolated on feature branch, TDD throughout.
</Good>

<Bad>
```
[Redesigns the entire event system to accommodate webhooks]
```
Why bad: Scope creep. Add-feature extends, it does not redesign. Use initial-plan for system redesigns.
</Bad>

<Bad>
```
[Skips TDD and writes implementation directly]
```
Why bad: TDD is mandatory. Test-generator (RED) must run before implementer (GREEN).
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- No existing architecture: warn user, suggest initial-plan for first-time setup
- Feature too large (10+ new files): suggest initial-plan with dedicated architecture phase
- Git conflicts on merge: report conflicts, do NOT auto-resolve
- All tasks blocked: exit loop, report partial completion
- User says "stop" or "enough": save progress, report current state
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Feature branch created (if auto_manage enabled)
- [ ] Scope analysis completed with integration points identified
- [ ] Interview conducted (if scope was ambiguous)
- [ ] Lightweight plan saved with TDD phases
- [ ] All tasks executed through TDD pipeline (RED/GREEN/REFACTOR)
- [ ] All tests pass on feature branch
- [ ] Feature branch merged to dev (if auto_manage enabled)
- [ ] Architecture docs updated with new modules
- [ ] `.jaewon/status.json` updated
</Final_Checklist>

Task: {{ARGUMENTS}}
