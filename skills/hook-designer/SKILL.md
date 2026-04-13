---
name: hook-designer
description: Create new hooks, modify and improve existing hooks, and test hook behavior. Use when users want to create a hook from scratch, edit or optimize an existing hook, test a hook with sample inputs, or understand which hook event/type to use. Make sure to use this skill whenever the user mentions hooks, automation, blocking commands, auto-formatting, notifications, or wants Claude Code to do something automatically — even if they don't explicitly say "hook".
---

# Hook Designer

A skill for creating new hooks and iteratively improving them.

## Core Workflow

1. **Capture intent** -- understand what the user wants to automate or prevent
2. **Design** -- pick the right event, matcher, and type
3. **Write** -- draft hook config + script
4. **Test** -- verify with sample inputs (should-trigger and should-not cases)
5. **Iterate** -- improve based on results and feedback
6. **Install** -- place in the right settings file

Figure out where the user is in this process and help them progress. Be flexible -- if they say "just make it work", skip deep interview. If they have a broken hook, go straight to debug.

## Communicating with the User

Hooks are powerful but confusing. Watch for context cues:
- "matcher" and "event" might need brief explanation
- "stdin/stdout" and "exit codes" -- explain if the user hasn't shown they know these
- "additionalContext" -- explain what it does (injects text into Claude's next response)

## Capture Intent

Extract from context, then fill gaps one question at a time:
1. What should this hook do? (block, allow, log, transform, notify)
2. When should it trigger? (before/after a tool, on session start/end, etc.)
3. What's the scope? (all Bash commands? only git? specific files?)
4. What happens on failure? (allow by default? block by default?)

## Event Selection

For the complete event selection guide with all 18 event mappings, see [event-guide.md](${CLAUDE_SKILL_DIR}/references/event-guide.md).

## Hook Type Decision

| Need | Type | Why |
|------|------|-----|
| Regex, pattern match, file check | `command` | Fast, deterministic, no LLM cost |
| Needs LLM judgment | `prompt` | Single-turn yes/no evaluation |
| Needs to inspect files + run commands | `agent` | Multi-turn with tool access |
| Call external service | `http` | POST event data to URL |

**Decision flow:**
```
Can it be done with regex/string matching?
  YES -> command
  NO -> Does it need to read/analyze code?
    YES -> Multiple files + reasoning? -> agent
    NO  -> Single judgment call? -> prompt
  NO -> External service? -> http
```

## Write the Hook

Generate hook config JSON and script file (if command type).

#### Hook Config Format
```json
{
  "hooks": {
    "{Event}": [
      {
        "matcher": "{tool_name or pattern}",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

#### Script Template (command type)
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if echo "$COMMAND" | grep -q 'dangerous-pattern'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: reason"}}'
else
  exit 0
fi
```

#### Key Output Patterns
- **PreToolUse block**: `permissionDecision: "deny"` + reason
- **PreToolUse allow**: `permissionDecision: "allow"` or just exit 0
- **Stop block**: `decision: "block"` + reason
- **Context injection**: `additionalContext: "text for Claude"`
- **Exit code 2**: Blocking error (stderr fed to Claude)
- **Exit code 0**: Success (stdout parsed as JSON)

## Test the Hook

Create 3-5 test cases (should-block, should-allow, edge cases). Verify:
- [ ] Correct decisions for each case
- [ ] Valid JSON output (or clean exit 0)
- [ ] Handles missing/malformed input gracefully
- [ ] Completes within timeout

## Iterate

1. **Too aggressive?** Narrow the pattern
2. **Too permissive?** Expand the pattern
3. **Wrong event?** Check event type and matcher
4. **Too slow?** Simplify logic or increase timeout

## Install

Pick the right location:
- `~/.claude/settings.json` -- personal, all projects
- `.claude/settings.json` -- project-specific, shareable
- `.claude/settings.local.json` -- project-specific, gitignored
- Plugin `hooks/hooks.json` -- bundled with plugin

Merge carefully. Warn if same event+matcher exists. Save script to `.claude/hooks/` or plugin `scripts/`.

## Safety Patterns

For 6 pre-built safety pattern templates, see [safety-patterns.md](${CLAUDE_SKILL_DIR}/references/safety-patterns.md).

## Anti-Patterns

For 8 common hook mistakes to avoid, see [anti-patterns.md](${CLAUDE_SKILL_DIR}/references/anti-patterns.md).

## Reference

- Hook events reference: https://code.claude.com/docs/en/hooks
- Hooks guide with examples: https://code.claude.com/docs/en/hooks-guide
- Plugin hooks: `hooks/hooks.json` in any plugin

Task: {{ARGUMENTS}}
