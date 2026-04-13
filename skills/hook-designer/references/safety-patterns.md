# Safety Patterns

Pre-built templates for common hook needs. Use these as starting points.

## Block Destructive Commands
```json
{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","if":"Bash(rm -rf *|rm -r /*)","command":"echo 'Blocked: destructive rm command' >&2 && exit 2"}]}]}}
```

## Protect Sensitive Files
```json
{"hooks":{"PreToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command","command":"FILE=$(cat | jq -r '.tool_input.file_path'); case \"$FILE\" in *.env*|*credential*|*secret*|*.pem|*.key) echo \"Blocked: $FILE is protected\" >&2; exit 2;; esac"}]}]}}
```

## Desktop Notification (macOS)
```json
{"hooks":{"Notification":[{"hooks":[{"type":"command","command":"osascript -e 'display notification \"Claude needs attention\" with title \"Claude Code\"'"}]}]}}
```

## Auto-Format After Edit
```json
{"hooks":{"PostToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command","command":"jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null; exit 0"}]}]}}
```

## Verify Tests Before Stop
```json
{"hooks":{"Stop":[{"hooks":[{"type":"agent","prompt":"Verify all unit tests pass. Run the test suite. $ARGUMENTS","timeout":120}]}]}}
```

## Re-inject Context After Compaction
```json
{"hooks":{"SessionStart":[{"matcher":"compact","hooks":[{"type":"command","command":"cat .claude/context-reminder.md"}]}]}}
```
