---
name: hook-designer
description: Create new hooks, modify and improve existing hooks, and test hook behavior. Use when users want to create a hook from scratch, edit or optimize an existing hook, test a hook with sample inputs, or understand which hook event/type to use. Make sure to use this skill whenever the user mentions hooks, automation, blocking commands, auto-formatting, notifications, or wants Claude Code to do something automatically — even if they don't explicitly say "hook".
---

# Hook Designer

A skill for creating new hooks and iteratively improving them.

At a high level, the process of creating a hook goes like this:

- Understand what the user wants to automate or prevent
- Design the hook (pick the right event, matcher, type)
- Write a draft of the hook config + script
- Test it with sample inputs (both should-trigger and should-not cases)
- Evaluate the results with the user
- Improve based on feedback
- Install when ready

Your job is to figure out where the user is in this process and help them progress. Maybe they're like "I want a hook that blocks dangerous commands" — help narrow scope, draft it, test it, iterate. Or maybe they already have a broken hook — go straight to debug/improve.

Be flexible. If the user says "just make it work", skip the deep interview and give them something fast. If they want to understand hooks deeply, teach as you go.

## Communicating with the user

Hooks are a powerful but confusing feature. Many users don't know the difference between PreToolUse and PostToolUse, or when to use `command` vs `prompt` type. Pay attention to context cues — if the user seems new to hooks, explain terms briefly. If they're experienced, get to the point.

- "matcher" and "event" might need brief explanation
- "stdin/stdout" and "exit codes" — explain if the user hasn't shown they know these
- "additionalContext" — explain what it does (injects text into Claude's next response)

## Designing a Hook

### Capture Intent

Start by understanding what the user wants. The conversation might already contain the answer (e.g., "I keep accidentally running rm -rf"). Extract what you can from context, then fill gaps:

1. What should this hook do? (block, allow, log, transform, notify)
2. When should it trigger? (before/after a tool, on session start/end, etc.)
3. What's the scope? (all Bash commands? only git? specific files?)
4. What happens on failure? (allow by default? block by default?)

Don't batch questions. Ask one at a time and build on answers.

### Event Selection

Map the user's intent to the correct hook event. This is the most important decision — wrong event = hook never fires or fires at wrong time.

| "I want to..." | Event | Matcher | Notes |
|-----------------|-------|---------|-------|
| Block dangerous commands | `PreToolUse` | `Bash` | Check `tool_input.command` |
| Prevent writes to files | `PreToolUse` | `Edit\|Write` | Check `tool_input.file_path` |
| Auto-format after edits | `PostToolUse` | `Edit\|Write` | Run formatter on file |
| Log all commands | `PostToolUse` | `Bash` | Append to log file |
| Validate before commit | `PreToolUse` | `Bash` + `if: "Bash(git commit*)"` | `if` field narrows further |
| Auto-approve specific permissions | `PermissionRequest` | tool name | Return `behavior: allow` |
| Verify work before stopping | `Stop` | (none) | Check tests, checklist |
| Get notified when Claude needs input | `Notification` | (none) | Desktop notification |
| Inject context at session start | `SessionStart` | `startup` | stdout → additionalContext |
| Re-inject after compaction | `SessionStart` | `compact` | Preserve context |
| Clean up on session end | `SessionEnd` | end reason | Cleanup scripts |
| Reload env on directory change | `CwdChanged` | (none) | `$CLAUDE_ENV_FILE` |
| Watch specific files | `FileChanged` | `.envrc\|.env` | Literal filenames |
| Track agent spawning | `SubagentStart` | agent type | |
| Verify agent output | `SubagentStop` | agent type | |
| Assign work to idle teammate | `TeammateIdle` | (none) | Exit 2 blocks idle |
| Gate task creation | `TaskCreated` | (none) | Exit 2 blocks creation |
| Audit config changes | `ConfigChange` | config source | |

### Hook Type Decision

| Need | Type | Why |
|------|------|-----|
| Regex, pattern match, file check | `command` | Fast, deterministic, no LLM cost |
| Needs LLM judgment | `prompt` | Single-turn yes/no evaluation |
| Needs to inspect files + run commands | `agent` | Multi-turn with tool access |
| Call external service | `http` | POST event data to URL |

**Decision flow:**
```
Can it be done with regex/string matching?
  YES → command
  NO → Does it need to read/analyze code?
    YES → Multiple files + reasoning? → agent
    NO  → Single judgment call? → prompt
  NO → External service? → http
```

### Write the Hook

Based on the design, generate:

1. **Hook config JSON** — the entry for settings.json or hooks.json
2. **Script file** (if command type) — reads stdin JSON, performs check, outputs decision

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
# Extract fields with jq
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Your check here
if echo "$COMMAND" | grep -q 'dangerous-pattern'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: reason"}}' 
else
  exit 0  # allow
fi
```

#### Key Output Patterns
- **PreToolUse block**: `permissionDecision: "deny"` + reason
- **PreToolUse allow**: `permissionDecision: "allow"` or just exit 0
- **Stop block**: `decision: "block"` + reason
- **Context injection**: `additionalContext: "text for Claude"`
- **Exit code 2**: Blocking error (stderr fed to Claude)
- **Exit code 0**: Success (stdout parsed as JSON)

### Test the Hook

Before installing, always test. Create sample inputs and verify behavior.

#### Test Cases

Come up with 3-5 test cases — things a real user would trigger:

```bash
# Should block
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | ./hook.sh
echo $?  # expect non-zero or deny JSON

# Should allow
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | ./hook.sh
echo $?  # expect 0

# Edge case: empty input
echo '{}' | ./hook.sh
echo $?  # should not crash
```

Run all test cases and verify:
- [ ] Correct decisions (block/allow) for each case
- [ ] Valid JSON output (or clean exit 0)
- [ ] Handles missing/malformed input gracefully
- [ ] Completes within timeout

Share results with the user. If something's wrong, fix and retest.

### Iterate

After testing, improve based on results:

1. **Too aggressive?** Hook blocking things it shouldn't → narrow the pattern
2. **Too permissive?** Hook allowing things it should block → expand the pattern
3. **Wrong event?** Hook not firing → check event type and matcher
4. **Too slow?** Hook timing out → simplify logic or increase timeout

Keep iterating until the user is happy. Don't over-engineer — a simple hook that works beats a complex one that breaks.

### Install

When the hook is ready:

1. **Pick the right location:**
   - `~/.claude/settings.json` — personal, all projects
   - `.claude/settings.json` — project-specific, shareable
   - `.claude/settings.local.json` — project-specific, gitignored
   - Plugin `hooks/hooks.json` — bundled with plugin

2. **Merge carefully** — read existing hooks, add the new one without clobbering
3. **If same event+matcher exists** — warn user, ask: replace, append, or cancel
4. **Save script** to `.claude/hooks/` or plugin `scripts/` directory
5. **Verify** — tell user to check `/hooks` menu in Claude Code

## Safety Patterns

Pre-built templates for common needs. Use these as starting points:

### Block Destructive Commands
```json
{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","if":"Bash(rm -rf *|rm -r /*)","command":"echo 'Blocked: destructive rm command' >&2 && exit 2"}]}]}}
```

### Protect Sensitive Files
```json
{"hooks":{"PreToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command","command":"FILE=$(cat | jq -r '.tool_input.file_path'); case \"$FILE\" in *.env*|*credential*|*secret*|*.pem|*.key) echo \"Blocked: $FILE is protected\" >&2; exit 2;; esac"}]}]}}
```

### Desktop Notification (macOS)
```json
{"hooks":{"Notification":[{"hooks":[{"type":"command","command":"osascript -e 'display notification \"Claude needs attention\" with title \"Claude Code\"'"}]}]}}
```

### Auto-Format After Edit
```json
{"hooks":{"PostToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command","command":"jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null; exit 0"}]}]}}
```

### Verify Tests Before Stop
```json
{"hooks":{"Stop":[{"hooks":[{"type":"agent","prompt":"Verify all unit tests pass. Run the test suite. $ARGUMENTS","timeout":120}]}]}}
```

### Re-inject Context After Compaction
```json
{"hooks":{"SessionStart":[{"matcher":"compact","hooks":[{"type":"command","command":"cat .claude/context-reminder.md"}]}]}}
```

## Anti-Patterns

Warn users about these common mistakes:

| Mistake | What Goes Wrong | Fix |
|---------|----------------|-----|
| Empty matcher on PreToolUse | Fires on EVERY tool call, massive slowdown | Always specify tool name matcher |
| Stop hook without `stop_hook_active` check | Infinite loop — Claude never stops | Check `stop_hook_active` flag first |
| No timeout | Hung hook freezes Claude Code | Always set timeout (5-30s) |
| PostToolUse hook that writes files | Triggers itself → infinite loop | Guard with re-entrancy check |
| Prompt type for regex checks | Wastes tokens, adds latency | Use command type for deterministic checks |
| HTTP hook to untrusted endpoint | Leaks code/credentials | Review data sensitivity, HTTPS only |
| Hook that crashes without JSON | Default behavior may surprise user | Wrap in try-catch, always output valid JSON |
| `permissionDecision: "allow"` thinking it bypasses deny rules | It doesn't — deny rules always win | Hooks tighten, never loosen past deny rules |

## Reference

For full hook event schemas, JSON input/output formats, and advanced features:
- Hook events reference: https://code.claude.com/docs/en/hooks
- Hooks guide with examples: https://code.claude.com/docs/en/hooks-guide
- Plugin hooks: `hooks/hooks.json` in any plugin

Task: {{ARGUMENTS}}
