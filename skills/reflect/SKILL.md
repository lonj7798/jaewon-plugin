---
name: reflect
description: Manual session-end reflection. Captures what worked, what didn't, and one rule worth promoting from this session — written to .jaewon/reflections/YYYY-MM-DD.md. Feeds the synthesizer (/jaewon-evolve) so lessons compound across sessions instead of vaporizing. Keywords: reflect, reflection, session reflection, what did we learn, end of session.
---

<Purpose>
Lessons learned mid-session vaporize when the window closes. The next session repeats the same mistakes. This skill captures a structured reflection at session end so the synthesizer can later turn accumulated reflections into actual hardening edits to plugin behavior (CLAUDE.md, agent prompts, skill steps).
</Purpose>

<Use_When>
- User says "reflect", "session reflection", "what did we learn", "end of session"
- A non-trivial session is about to close and there's a lesson worth keeping
- Periodically (e.g., every 1–2 days of active work) — if it's been a week, reflections are stale
</Use_When>

<Do_Not_Use_When>
- Trivial / one-shot session (single command, no insight gained)
- The user is in the middle of work — reflect is end-of-session only
- A reflection for today already exists — append to it instead of overwriting
</Do_Not_Use_When>

<Execution_Policy>
- Manual invocation only. Do NOT auto-fire — auto-fire silently rots (Guya regression history).
- One reflection file per day; multiple sessions on the same day append entries.
- Reflections are inputs to `/jaewon-evolve`, not direct edits to plugin behavior.
- Required fields are required. If the user can't answer one, prompt for it explicitly.
</Execution_Policy>

<Required_Fields>

1. **What worked** — one or two concrete things from this session that produced good outcomes. Specific: which skill, which agent dispatch, which decision.
2. **What didn't** — one or two concrete frictions or failures. "I had to re-explain X three times"; "the gate misfired on Y".
3. **One rule worth promoting** — exactly one. A short sentence that, if it were a guideline / hook / agent-prompt edit, would have made this session better. The narrowness matters — broad rules don't get applied.

Optional:
- **Affected component** — which agent / skill / hook the rule would land on
- **Two-source flag** — does this confirm an earlier reflection? If so, name the date

</Required_Fields>

<Steps>

## Step 1: Brief Context Pull
Read recent context: last few entries of `.jaewon/session-log.md`, current `.jaewon/status.json`, and any open plan/decision docs. Don't dump them — extract one paragraph summarizing the session.

## Step 2: Interview (Tight)
Three questions, one at a time:
- "What worked? Be concrete — name a skill / agent / decision."
- "What didn't? Be concrete — name a friction or failure."
- "One rule worth promoting? One sentence. What would have made this session better if it were already guidance?"

Skip optional fields if the user is brief.

## Step 3: Check for Today's File
File path: `.jaewon/reflections/{YYYY-MM-DD}.md`. If it exists, this becomes an additional entry under a `## Session #{N}` heading.

## Step 4: Write the Reflection
Format:

```md
# Reflections — {YYYY-MM-DD}

## Session #{N} ({HH:MM})
**Branch:** {git branch}
**Commits:** {short SHAs from session-log.md, if any}

### What worked
- {concrete observation}

### What didn't
- {concrete friction}

### Rule worth promoting
{one-sentence rule}

**Affected:** {component, optional}
**Corroborates:** {prior reflection date, optional}
```

## Step 5: Hand Off
> Reflection saved. Run `/jaewon-plugin:evolve` when you have ≥3 reflections to synthesize them into proposed edits. Or wait — accumulated reflections are fine; the SessionStart nudge will surface backlog.

</Steps>

<Tool_Usage>
- `Read` for `.jaewon/session-log.md`, `.jaewon/status.json`, `.jaewon/reflections/YYYY-MM-DD.md` (if exists)
- `Write` for the reflection file (create or append)
- `Bash` for `git rev-parse --abbrev-ref HEAD` and `git log --oneline -5`
</Tool_Usage>

<Examples>
<Good>
What worked: "/jaewon-plugin:review caught the silent error swallow in api-handler.js:42 before commit."
What didn't: "decision-feature blocked twice because I gave 'make API resilient' as scope. Took two rounds to specify."
Rule: "When user gives a vague verb like 'resilient' or 'clean', surface a list of concrete behaviors and ask them to pick — don't just re-ask 'be more specific'."
Affected: skills/decision-feature/
Why good: Concrete worked/didn't; rule is narrow and actionable; affected component named.
</Good>

<Bad>
What worked: "Things went well."
What didn't: "Some friction."
Rule: "Improve the experience."
Why bad: Reflections this vague produce no synthesizable signal. Push back: name a specific moment.
</Bad>
</Examples>

<Final_Checklist>
- [ ] Recent context pulled (one-paragraph summary)
- [ ] Three core questions answered concretely
- [ ] Reflection appended to today's file (or new file created)
- [ ] User pointed at `/jaewon-plugin:evolve` (no immediate auto-fire)
</Final_Checklist>

Task: {{ARGUMENTS}}
