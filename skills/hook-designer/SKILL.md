---
name: hook-designer
description: Interactive skill to help design, generate, test, and install Claude Code hooks. Walks through intent interview, hook design, code generation, testing, and installation. Includes event selection guide, hook type decision guide, safety pattern templates, and anti-pattern warnings. Keywords: design hook, create hook, hook help, new hook.
---

<Purpose>
Hook-designer is an interactive skill that helps design, generate, test, and install Claude Code hooks. It walks through intent discovery, hook design, code generation, dry-run testing, and installation. It includes reference guides for event selection, hook type decisions, safety patterns, and anti-patterns to avoid.
</Purpose>

<Use_When>
- User says "design hook", "create hook", "hook help", "new hook"
- User wants to automate a behavior in Claude Code (block, allow, log, transform)
- User wants to understand which hook event or type to use
- User has a hook idea but does not know how to implement it
</Use_When>

<Do_Not_Use_When>
- User wants to modify an existing hook — read and edit the hook directly
- User wants to debug a broken hook — use `debug` skill
- User wants to understand what hooks exist — read `.claude/settings.json` or `hooks.json`
</Do_Not_Use_When>

<Execution_Policy>
- Interactive: ask questions before generating
- One question at a time during the interview
- Generate minimal, correct hook configurations
- Always test before installing
- Never overwrite existing hooks without confirmation
</Execution_Policy>

<Steps>

## Step 1: Intent Interview

Ask 3-5 questions (one at a time) to understand the hook's purpose:

### Question Categories

| Category | Purpose | Example Question |
|----------|---------|-----------------|
| What | What behavior to automate or prevent | "What should this hook do? (e.g., block dangerous commands, auto-format, notify)" |
| When | Which event triggers it | "When should this trigger? (e.g., before a tool runs, after a response, on session start)" |
| Action | Block, allow, log, or transform | "Should this block the action, allow it with modifications, or just log it?" |
| Scope | Which tools, files, or patterns | "Should this apply to all Bash commands, or only specific patterns?" |
| Safety | Failure mode and fallback | "If the hook fails, should Claude Code proceed (allow) or stop (block)?" |

### Interview Flow
1. Start with "What" — understand the core intent
2. Follow with "When" — narrow to the correct event
3. Then "Action" — determine hook behavior
4. Then "Scope" if needed — refine the matcher
5. Then "Safety" if the hook blocks — confirm failure mode

Minimum 3 questions. Stop when intent is clear.

## Step 2: Hook Design

Based on interview answers, determine the hook configuration:

### Event Selection

Map the user's intent to the correct hook event:

| Intent | Event | Matcher |
|--------|-------|---------|
| Before a tool runs | PreToolUse | Tool name (e.g., "Bash", "Write", "Edit") |
| After a tool runs | PostToolUse | Tool name |
| Before Claude responds | PreResponse | None (fires on all responses) |
| After Claude responds | PostResponse | None |
| Before Claude stops | Stop | None |
| When a subagent finishes | SubagentStop | None |
| On session start | SessionStart | None |
| On session end | SessionEnd | None |
| When a teammate is idle | TeammateIdle | None |
| On notification | Notification | None |
| On permission request | PreToolUse | Specific tool name |

### Hook Type Decision

| Condition | Type | Rationale |
|-----------|------|-----------|
| Deterministic check (regex, file existence, command pattern) | command | Fast, no LLM cost, predictable |
| Needs LLM judgment (code quality, intent analysis) | prompt | Uses Claude to evaluate |
| Needs file inspection + reasoning | agent | Spawns a focused agent |
| Calls external service (Slack, webhook, API) | http | HTTP request to endpoint |

### Safety Design
- Determine `timeout_ms` based on hook type:
  - command: 10000 (10s default)
  - prompt: 30000 (30s, LLM processing)
  - agent: 60000 (60s, agent execution)
  - http: 15000 (15s, network request)
- Determine failure behavior:
  - Blocking hooks (PreToolUse): should default to ALLOW on failure (safety-first)
  - Logging hooks (PostToolUse): can ignore failures
  - Critical safety hooks: may default to BLOCK on failure (discuss with user)

## Step 3: Generate Hook Configuration

Generate the hooks.json entry and script (if command type):

### hooks.json Entry Format
```json
{
  "hooks": {
    "{event}": [
      {
        "matcher": "{tool_name or empty}",
        "type": "{command|prompt|http|agent}",
        "command": "{script path or command}",
        "prompt": "{prompt text for prompt type}",
        "url": "{endpoint for http type}",
        "timeout_ms": {timeout},
        "description": "{human-readable description}"
      }
    ]
  }
}
```

### Script Generation (for command type)
Generate a script that:
1. Reads stdin for the event JSON payload
2. Parses the relevant fields (tool_name, tool_input, etc.)
3. Performs the check or action
4. Outputs the correct response format:
   - For PreToolUse: `{"decision": "allow"|"block", "reason": "..."}` or `{"decision": "allow", "additionalContext": "..."}`
   - For PostToolUse: `{"additionalContext": "..."}` (optional context injection)
   - For Stop: `{"decision": "allow"|"block", "reason": "..."}`
   - For other events: stdout text becomes additionalContext

### Script Template
```javascript
#!/usr/bin/env node
/**
 * {hook-name} — {description}
 *
 * Event: {event}
 * Type: command
 * Matcher: {matcher}
 */
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));

// Extract relevant fields
const { tool_name, tool_input } = input;

// Perform check
// ... hook logic here ...

// Output decision
const result = { decision: 'allow' };
process.stdout.write(JSON.stringify(result));
```

## Step 4: Test the Hook

Before installing, verify the hook works correctly:

### Dry-Run Testing
1. Create a sample input JSON matching the event payload format:
   ```json
   {
     "session_id": "test-session",
     "tool_name": "Bash",
     "tool_input": { "command": "rm -rf /" }
   }
   ```
2. Pipe the sample input to the hook script: `echo '{...}' | node hook-script.js`
3. Verify the output is valid JSON with the expected decision
4. Test edge cases:
   - Empty input
   - Missing fields
   - Input that should be allowed
   - Input that should be blocked (for blocking hooks)

### Validation Checks
- [ ] Script exits with code 0 (non-zero exit blocks by default)
- [ ] Output is valid JSON
- [ ] Output has the correct structure for the event type
- [ ] Hook handles missing/malformed input gracefully
- [ ] Timeout is reasonable for the hook's work

## Step 5: Install the Hook

1. Determine the correct settings file:
   - Project-level: `.claude/settings.json` (recommended for project-specific hooks)
   - User-level: `~/.claude/settings.json` (for personal hooks across all projects)
   - Plugin-level: `hooks/hooks.json` (for plugin hooks loaded via run.cjs)

2. Read the existing settings file
3. Merge the new hook entry into the existing hooks configuration
4. If a hook for the same event+matcher already exists:
   - Warn the user about the existing hook
   - Ask whether to replace, append (multiple hooks for same event), or cancel
5. Write the updated settings file
6. If a script was generated, save it to the hooks directory
7. Report the installed hook with its configuration

</Steps>

<Event_Selection_Guide>
Complete reference for mapping intents to hook events:

| User Intent | Hook Event | Matcher | Notes |
|-------------|-----------|---------|-------|
| Block dangerous shell commands | PreToolUse | Bash | Check tool_input.command for patterns |
| Prevent writes to protected files | PreToolUse | Write, Edit | Check tool_input.file_path |
| Auto-format code after writes | PostToolUse | Write, Edit | Run formatter on written file |
| Inject context before responses | PreResponse | (none) | Add project context to all responses |
| Log all tool usage | PostToolUse | (none) | No matcher = all tools |
| Verify tests pass before stopping | Stop | (none) | Block stop if tests fail |
| Track subagent completions | SubagentStop | (none) | Log agent results to state |
| Initialize project state | SessionStart | (none) | Create/read .jaewon/ files |
| Persist state on exit | SessionEnd | (none) | Write final state |
| Assign work to idle teammates | TeammateIdle | (none) | Dispatch from task queue |
| Notify on task completion | Notification | (none) | Send to Slack/Discord |
| Block file deletion | PreToolUse | Bash | Check for rm commands |
| Enforce commit message format | PreToolUse | Bash | Check git commit commands |
| Add calling spec to new files | PostToolUse | Write | Check if file is new, add spec |
</Event_Selection_Guide>

<Hook_Type_Decision_Guide>
Choose the right hook type based on the hook's logic:

| Logic Type | Hook Type | When to Use | Example |
|------------|-----------|-------------|---------|
| Pattern matching | command | Regex on commands, file paths, tool names | Block `rm -rf`, protect `.env` |
| File existence check | command | Check if file/dir exists before allowing | Verify tests exist before merge |
| JSON validation | command | Validate structure of tool input | Ensure Write has valid file path |
| Code quality judgment | prompt | Needs LLM to evaluate code quality | "Is this commit message descriptive?" |
| Intent analysis | prompt | Needs LLM to understand what user wants | "Does this change match the plan?" |
| Multi-file inspection | agent | Needs to read multiple files and reason | Check LOD compliance across modules |
| External notification | http | Send data to external service | Post to Slack webhook on completion |
| External validation | http | Check external system before allowing | Verify CI status before merge |

### Decision Flowchart
```
Can the check be done with regex/string matching?
  YES → command
  NO → Does it need to read/analyze code?
    YES → Does it need multiple files + reasoning?
      YES → agent
      NO → prompt
    NO → Does it call an external service?
      YES → http
      NO → command (with shell tools)
```
</Hook_Type_Decision_Guide>

<Safety_Patterns>
Pre-built safety templates for common hook needs:

### Pattern 1: Block Destructive Commands
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "type": "command",
      "command": "node hooks/block-destructive.mjs",
      "timeout_ms": 5000,
      "description": "Block rm -rf, git push --force, and other destructive commands"
    }]
  }
}
```
Blocks: `rm -rf /`, `git push --force`, `git reset --hard`, `docker system prune`, `DROP TABLE`.

### Pattern 2: Protect Sensitive Files
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write",
      "type": "command",
      "command": "node hooks/protect-files.mjs",
      "timeout_ms": 5000,
      "description": "Block writes to .env, credentials, and secrets files"
    }]
  }
}
```
Protects: `.env`, `.env.*`, `*credentials*`, `*secret*`, `*.pem`, `*.key`.

### Pattern 3: Auto-Format on Write
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write",
      "type": "command",
      "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"",
      "timeout_ms": 10000,
      "description": "Auto-format files after write using prettier"
    }]
  }
}
```

### Pattern 4: Verify Tests Before Stop
```json
{
  "hooks": {
    "Stop": [{
      "type": "command",
      "command": "node hooks/stop-guard.mjs",
      "timeout_ms": 30000,
      "description": "Block stop if tests are failing or work is unverified"
    }]
  }
}
```

### Pattern 5: External Notification
```json
{
  "hooks": {
    "Notification": [{
      "type": "http",
      "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
      "timeout_ms": 10000,
      "description": "Send notifications to Slack channel"
    }]
  }
}
```

### Pattern 6: Re-inject Context
```json
{
  "hooks": {
    "PreResponse": [{
      "type": "prompt",
      "prompt": "Before responding, re-read the project guidelines in CLAUDE.md and ensure your response follows them.",
      "timeout_ms": 15000,
      "description": "Re-inject project context before each response"
    }]
  }
}
```

### Pattern 7: Prevent Infinite Hook Loops
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "type": "command",
      "command": "node hooks/loop-guard.mjs",
      "timeout_ms": 5000,
      "description": "Track hook invocations and block if loop detected (>10 calls/minute)"
    }]
  }
}
```
Tracks invocation count in a temp file. Blocks if the same hook fires more than 10 times in 60 seconds.
</Safety_Patterns>

<Anti_Patterns>
Common mistakes to warn users about during hook design:

### Anti-Pattern 1: Empty PermissionRequest Matcher
**Problem**: Using an empty matcher on PreToolUse fires on EVERY tool call, including internal Claude Code operations. This causes massive slowdown.
**Fix**: Always specify a matcher for PreToolUse hooks. Use the specific tool name (Bash, Write, Edit, Read).

### Anti-Pattern 2: Stop Without stop_hook_active Check
**Problem**: A Stop hook that does not check if it was already invoked can create an infinite loop where the hook blocks stop, Claude tries to stop again, hook blocks again.
**Fix**: Check for a `stop_hook_active` flag in state. Set it on first invocation, clear it after the hook completes or allows stop.

### Anti-Pattern 3: Blocking Hook With No Timeout
**Problem**: A hook with no timeout (or very long timeout) that hangs will freeze Claude Code entirely.
**Fix**: Always set `timeout_ms`. Command hooks: 5-10s. Prompt hooks: 15-30s. Agent hooks: 30-60s. HTTP hooks: 10-15s.

### Anti-Pattern 4: Hook That Modifies Its Own Trigger
**Problem**: A PostToolUse hook on Write that itself writes a file triggers another PostToolUse, creating an infinite loop.
**Fix**: Use a guard file or environment variable to detect re-entrant invocation. Skip execution if the hook is already running.

### Anti-Pattern 5: Prompt Hook for Deterministic Checks
**Problem**: Using a prompt (LLM) hook for something that could be done with regex or string matching. Wastes tokens and adds latency.
**Fix**: Use command type for deterministic checks. Reserve prompt type for judgment calls that genuinely need LLM reasoning.

### Anti-Pattern 6: HTTP Hook to Untrusted Endpoint
**Problem**: Sending tool input (which may contain code, file contents, or credentials) to an external HTTP endpoint without considering data sensitivity.
**Fix**: Review what data the hook sends. Strip sensitive fields before sending. Use HTTPS only. Consider whether the data should leave the machine at all.

### Anti-Pattern 7: Hook That Silently Fails
**Problem**: A hook script that crashes (non-zero exit) without outputting valid JSON. The default behavior on script failure may not match what the user expects.
**Fix**: Always wrap hook logic in try-catch. On error, output a valid JSON response (either allow or block, depending on the safety design from Step 2). Log errors to a file for debugging.
</Anti_Patterns>

<Tool_Usage>
- `Read` for existing hooks.json, settings.json, hook scripts
- `Write` for new hook scripts and updated settings files
- `Bash` for testing hooks (piping sample input, checking exit codes)
- `Grep` for finding existing hook patterns in the codebase
- `Glob` for discovering existing hook scripts and settings files
</Tool_Usage>

<Examples>
<Good>
```
User: "I want a hook that blocks dangerous git commands"
[Interview] Asks: "Which commands? (force push, reset --hard, branch -D, all?)"
[Interview] Asks: "Project-level or global?"
[Design] Event: PreToolUse, Matcher: Bash, Type: command
[Generate] Script checks tool_input.command against destructive patterns
[Test] Dry-run with "git push --force" → blocks. "git push" → allows.
[Install] Adds to .claude/settings.json
```
Why good: Targeted questions, correct event/type, tested before install.
</Good>

<Bad>
```
[Generates a prompt-type hook for blocking rm -rf]
```
Why bad: This is a deterministic regex check. Use command type, not prompt type.
</Bad>

<Bad>
```
[Installs hook without testing]
```
Why bad: Always test. A broken hook can freeze Claude Code or block all operations.
</Bad>
</Examples>

<Final_Checklist>
- [ ] Intent interview completed (minimum 3 questions)
- [ ] Correct event and matcher selected
- [ ] Correct hook type selected (command/prompt/agent/http)
- [ ] Timeout set appropriately for the hook type
- [ ] Hook configuration generated as valid JSON
- [ ] Script generated (if command type) with proper stdin/stdout handling
- [ ] Dry-run tested with sample inputs (both allow and block cases)
- [ ] Edge cases tested (empty input, missing fields)
- [ ] No anti-patterns present in the design
- [ ] Installed to the correct settings file
- [ ] User informed of the installed hook and its behavior
</Final_Checklist>

Task: {{ARGUMENTS}}
