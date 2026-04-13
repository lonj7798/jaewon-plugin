---
name: smart-compact
description: Focus-aware context compaction. Asks what you're working on next, then compacts context preserving what matters most for that task. Use instead of /compact when you want to keep relevant context. Keywords: compact, compress, focus, smart compact, context.
disable-model-invocation: true
---

# Smart Compact

Compact context with a focus bias — preserve what matters for your next task, compress what doesn't.

## Workflow

### Step 1: Gather Options

Read `.jaewon/status.json` and `checklist.json` to find pending tasks. Build a list of choices:

1. Pending unblocked tasks from checklist (highest priority)
2. Blocked tasks that might get unblocked soon
3. "Continue current work" (preserve recent context as-is)
4. Free text option for the user to describe their next focus

### Step 2: Ask the User (MAX 1 question, 3 choices + free text)

Use `AskUserQuestion` with exactly **3 choices + free text**. Pick the top 2 most relevant pending tasks + "Continue current work". Never show more than 3 choices — keep it fast, context is filling up.

```
What should I focus on after compaction?

1. [p2-t4] API endpoints implementation
2. [p3-t1] Debug auth token expiry bug
3. Continue current work
4. (free text) Other — type your focus
```

If there are no checklist tasks:

```
What should I preserve after compaction?

1. Code and decisions from this session
2. Architecture context
3. Continue current work
4. (free text) Other
```

**ONE question only.** Do not ask follow-ups. User picks, you write focus, you compact. Fast.

### Step 3: Write Focus File

Based on the user's choice, write `.jaewon/context/compact-focus.md`:

```markdown
# Compact Focus

## Next Task
{task description from user's choice}

## Preserve (high priority)
- {relevant code patterns, decisions, file paths for the chosen task}
- {dependencies of the chosen task}
- {recent test results if relevant}
- {any blocking context that needs to carry forward}

## Deprioritize (safe to compress)
- {planning discussions already captured in docs/plans/}
- {interview transcripts already saved to docs/interview/}
- {wiki update discussions}
- {completed task details already in checklist.json}
- {tool output that was already processed}
```

Think carefully about what's relevant to the chosen next task:
- If next task depends on a previous task, preserve that dependency's context
- If next task is debugging, preserve error traces and investigation
- If next task is implementation, preserve the plan doc details and test patterns
- If next task is review, preserve the code that was written

### Step 4: Compact

After writing the focus file, tell the user:

```
Focus written. Compacting context with bias toward: {chosen task}
```

Then run `/compact` to trigger the actual compaction. The PreCompact hook will read `compact-focus.md` and inject it as additionalContext, biasing the compaction summary.

## Important Notes

- This skill is manual-only (`disable-model-invocation: true`) — user invokes with `/smart-compact`
- The focus file is consumed once by PreCompact, then the SessionStart hook re-injects handoff context
- If no `.jaewon/` exists, fall back to a simple "what do you want to preserve?" question
- The focus file supplements the handoff — it doesn't replace it

Task: {{ARGUMENTS}}
