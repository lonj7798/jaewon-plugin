# Hook Anti-Patterns

Warn users about these common mistakes:

| Mistake | What Goes Wrong | Fix |
|---------|----------------|-----|
| Empty matcher on PreToolUse | Fires on EVERY tool call, massive slowdown | Always specify tool name matcher |
| Stop hook without `stop_hook_active` check | Infinite loop -- Claude never stops | Check `stop_hook_active` flag first |
| No timeout | Hung hook freezes Claude Code | Always set timeout (5-30s) |
| PostToolUse hook that writes files | Triggers itself -> infinite loop | Guard with re-entrancy check |
| Prompt type for regex checks | Wastes tokens, adds latency | Use command type for deterministic checks |
| HTTP hook to untrusted endpoint | Leaks code/credentials | Review data sensitivity, HTTPS only |
| Hook that crashes without JSON | Default behavior may surprise user | Wrap in try-catch, always output valid JSON |
| `permissionDecision: "allow"` thinking it bypasses deny rules | It doesn't -- deny rules always win | Hooks tighten, never loosen past deny rules |
