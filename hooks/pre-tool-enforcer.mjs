#!/usr/bin/env node
/**
 * pre-tool-enforcer.mjs — Block dangerous commands, enforce git policy
 *
 * CALLING SPEC:
 *   Runs on PreToolUse:Bash hook event.
 *   Reads tool_input.command from stdin.
 *   Blocks: rm -rf /, git push --force, git reset --hard, drop table.
 *   Warns: committing on main branch.
 *   Side effects: None (reads stdin, writes stdout)
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { getCurrentBranch } from './lib/session-helpers.mjs';

const BLOCKED_PATTERNS = [
  { pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/\s*$/, reason: 'Blocked: rm -rf / is destructive' },
  { pattern: /rm\s+-rf\s+\/(?!\w)/, reason: 'Blocked: rm -rf / is destructive' },
  { pattern: /git\s+push\s+.*--force(?!-)/, reason: 'Blocked: git push --force can destroy remote history' },
  { pattern: /git\s+push\s+.*-f(?:\s|$)/, reason: 'Blocked: git push -f can destroy remote history' },
  { pattern: /git\s+reset\s+--hard/, reason: 'Blocked: git reset --hard discards uncommitted work' },
  { pattern: /drop\s+table/i, reason: 'Blocked: DROP TABLE is irreversible' },
  { pattern: /truncate\s+table/i, reason: 'Blocked: TRUNCATE TABLE is irreversible' }
];

const WARN_PATTERNS = [
  { pattern: /git\s+commit/, check: 'main_branch' },
  { pattern: /git\s+push/, check: 'main_branch' }
];

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const command = data.tool_input?.command || '';
  if (!command) {
    process.exit(0);
  }

  // Check blocked patterns
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason
      }));
      return;
    }
  }

  // Check warning patterns
  const warnings = [];
  const projectDir = data.cwd || process.cwd();

  for (const { pattern, check } of WARN_PATTERNS) {
    if (!pattern.test(command)) continue;

    if (check === 'main_branch') {
      const branch = getCurrentBranch(projectDir);
      if (branch === 'main' || branch === 'master') {
        const settings = getSettings(projectDir);
        if (settings.git?.auto_manage) {
          warnings.push(`WARNING: ${command.split(' ').slice(0, 2).join(' ')} on ${branch} branch. Use '${settings.git.default_branch || 'dev'}' branch for development.`);
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: warnings.join('\n')
      }
    }));
    return;
  }

  // No issues — allow
  process.exit(0);
}

main().catch(() => process.exit(0));
