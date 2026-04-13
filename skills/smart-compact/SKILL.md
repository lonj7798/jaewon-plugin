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

### Step 2: Clarify Focus (MAX 3 questions)

Ask **up to 3 rounds** to clarify the user's next focus. Stop early if clear. Each round: one question with choices + free text.

**Round 1: What's next?**
Pick top 2-3 pending tasks from checklist + "Continue current work" + free text.

```
What should I focus on after compaction?

1. [p2-t4] API endpoints implementation
2. [p3-t1] Debug auth token expiry bug
3. Continue current work
4. (free text) Other — type your focus
```

**Round 2 (if needed): Narrow scope**
Based on their choice, ask what specifically matters:

```
For "API endpoints" — what context is most important?

1. The plan doc + checklist details
2. Auth middleware decisions (dependency)
3. Test patterns from previous tasks
4. (free text) Something else
```

**Round 3 (if needed): Anything to drop?**
```
Anything I can safely forget?

1. Planning/interview discussion (already saved to docs/)
2. Earlier debugging context
3. Nothing — keep everything you can
4. (free text) Drop this: ...
```

**Rules:**
- Maximum 3 questions total — never more
- Stop early if the focus is already clear after round 1 or 2
- If user says "just compact" at any point, skip remaining questions
- Keep questions short — context is filling up

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
