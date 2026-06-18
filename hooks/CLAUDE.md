# jaewon-plugin/hooks — Hook Implementation Rules

This directory holds all Claude Code lifecycle hook scripts. Hooks are registered in `hooks.json` and executed via `run.cjs` (the CommonJS shim that dynamically imports the target ESM `.mjs` module).

The rules below are not style preferences — they exist because we (or another harness) saw each one fail silently. Read before editing `hooks.json` or adding a new hook.

## Platform constraints (do not learn these the hard way)

### PreToolUse matcher dedup (Claude Code 2.1.101+)

`PreToolUse` entries are deduplicated semantically by matcher. Multiple top-level entries with `"matcher": "Bash"` (or with regex-equivalent strings like `"^Bash$"`) collapse so that **only one hook script runs per tool invocation**. Multiple `hooks[]` items inside a single matcher block can also collapse.

**Symptom:** the hook is wired correctly, returns `{ continue: true }` during manual replay, but never appears in the session's hook trace, while a sibling hook on the same matcher does. Sibling project (Guya) silently bypassed its review gate for 16 days under this regression.

**Rule:** there is exactly one entry per `(event, matcher)` pair. If multiple checks need to run on the same matcher, use a single dispatcher script that fans out internally and aggregates the result. Do not "tidy up" by re-splitting into separate `hooks.json` entries.

Cost of the dispatcher pattern: ~2× Node cold-start per invocation (~150 ms). Each sub-check still no-ops fast on commands it doesn't care about.

### PostToolUse:Bash does not dispatch

`PostToolUse` events for `Bash` are not delivered reliably by Claude Code. Any hook registered against `PostToolUse:Bash` may never run, with no error.

**Consequence:** anything that needs to run after a Bash command (post-commit recordkeeping, test-result capture, etc.) must use either:
- A native git hook (`.git/hooks/post-commit`, etc.) installed by `setup-jaewon`, or
- Another reliably-dispatched event (`PostToolUse:Write|Edit`, `Stop`, `SubagentStop`).

**Resolved:** `test-tracker.mjs` (formerly `PostToolUse:Bash`) was confirmed dead — the smoke test showed the script itself works, but `.jaewon/hook-trace.jsonl` never recorded a production firing — and was removed in the v0.3 prune (2026-06-17). Test-run / commit recordkeeping is left to the native `post-commit-scribe` git hook.

## Verifiable-side-effect contract

Every enforcement hook **must** produce an observable side-effect that another check can confirm:

- A line in `.jaewon/hook-trace.jsonl` (preferred — machine-readable)
- A stderr log entry
- An evidence file (e.g., `.jaewon/review-evidence.jsonl`) read by a downstream gate

**Why:** silent rot is the dominant failure mode for hook-based enforcement. Three sibling-project regressions (auto-fire dead 6 days, matcher dedup 16 days, symlinked-realpath `import.meta.url` mismatch since install) all came from "this can't fail" guards that did. A registered hook is not a running hook. A running hook that does nothing is not an enforced hook.

**Rule:** if a hook claims to do X, it writes an artifact proving X. The smoke test in `hooks/__tests__/` runs each hook with a synthetic payload and asserts the artifact appears.

## Output contract

- Read JSON event payload from stdin (use `lib/stdin.mjs`).
- Write a single JSON object to stdout. Diagnostics go to stderr.
- Use `systemMessage` for context injection on events that do not support `hookSpecificOutput` (only `PreToolUse`, `PostToolUse`, and `UserPromptSubmit` accept `hookSpecificOutput.additionalContext`).
- Exit 0 even on internal errors — fail-open is the default. A crashing hook should not block the user.

## Current registry (hooks.json)

| Event | Matcher | Script | Notes |
|-------|---------|--------|-------|
| `SessionStart` | `*` | `session-start.mjs` | Initializes `.jaewon/`; injects context |
| `Stop` | `""` | `stop-guard.mjs` | Blocks exit on unverified work |
| `SubagentStart` | `*` | `subagent-start.mjs` | Logs subagent dispatch |
| `SubagentStop` | `*` | `subagent-tracker.mjs` | Updates checklist + progress.md |
| `TeammateIdle` | `""` | `teammate-dispatcher.mjs` | Assigns next task |
| `PreCompact` | `*` | `pre-compact.mjs` | Flush state before compaction |
| `SessionEnd` | `*` | `session-end.mjs` | Persist final state, write insights |
| `PreToolUse` | `Bash` | `pre-tool-enforcer.mjs` | LOD enforcement on Bash calls (single entry — see dedup rule) |
| `PostToolUse` | `Write\|Edit` | `file-tracker.mjs` | Logs file edits |
| `TaskCompleted` | `""` | `task-sync.mjs` | Sync TaskCompleted events to state |

## Adding a new hook — checklist

1. Verify the event name is reliably dispatched by Claude Code (or use an alternative event).
2. If using `PreToolUse:Bash` and a hook is already registered there, **extend the existing dispatcher** — do not add a second entry.
3. Read stdin via `lib/stdin.mjs`; respect the timeout in `hooks.json`.
4. Emit a verifiable side-effect (`.jaewon/hook-trace.jsonl` line, log, or evidence file).
5. Add a row to the registry table above.
6. Add a smoke-test case in `hooks/__tests__/hooks-smoke.test.mjs` that asserts the side-effect appears for a synthetic payload.
7. If the hook's purpose intersects with a Claude Code event that does not dispatch reliably, install a native git hook in `setup-jaewon` instead.

## Regression history (the bugs that wrote these rules)

This list is intentionally short — keep it scannable so the lessons stay live.

- **Sibling project (Guya), 2026-04-08 → 2026-04-24:** `PreToolUse:Bash` review gate silently bypassed for 16 days under matcher dedup. Two entries under `matcher: "Bash"` collapsed; only the last ran. Fixed by introducing the dispatcher pattern.
- **Sibling project (Guya), 2026-04-27:** `PreToolUse:Skill` auto-evidence silently no-op'd since plugin install. Root cause: `fileURLToPath(import.meta.url) === process.argv[1]` test failed because Claude Code symlinks plugins and Node 24 resolves `import.meta.url` to the realpath while `process.argv[1]` keeps the symlink path. Fixed by wrapping both sides in `realpathSync()`.
- **Pattern across both:** silent rot of trusted enforcement. Defense is observability, not smarter guards.
