# Hook Event Selection Guide

Map the user's intent to the correct hook event. This is the most important decision -- wrong event means the hook never fires or fires at the wrong time.

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
| Inject context at session start | `SessionStart` | `startup` | stdout -> additionalContext |
| Re-inject after compaction | `SessionStart` | `compact` | Preserve context |
| Clean up on session end | `SessionEnd` | end reason | Cleanup scripts |
| Reload env on directory change | `CwdChanged` | (none) | `$CLAUDE_ENV_FILE` |
| Watch specific files | `FileChanged` | `.envrc\|.env` | Literal filenames |
| Track agent spawning | `SubagentStart` | agent type | |
| Verify agent output | `SubagentStop` | agent type | |
| Assign work to idle teammate | `TeammateIdle` | (none) | Exit 2 blocks idle |
| Gate task creation | `TaskCreated` | (none) | Exit 2 blocks creation |
| Audit config changes | `ConfigChange` | config source | |
