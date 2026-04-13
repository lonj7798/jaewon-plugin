#!/usr/bin/env node
/**
 * test-tracker.mjs — Test result capture + commit tracking
 *
 * CALLING SPEC:
 *   Runs on PostToolUse:Bash hook event.
 *   Detects test commands (pytest, npm test, jest, etc.).
 *   Detects git commit commands and tracks in status.
 *   Outputs additionalContext with test results summary.
 *   Side effects: Reads/writes filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';

const TEST_PATTERNS = [
  /\b(pytest|py\.test)\b/,
  /\bnpm\s+test\b/,
  /\bnpx\s+(jest|vitest|mocha)\b/,
  /\bjest\b/,
  /\bvitest\b/,
  /\bmocha\b/,
  /\bcargo\s+test\b/,
  /\bgo\s+test\b/,
  /\bmake\s+test\b/
];

const COMMIT_PATTERN = /\bgit\s+commit\b/;

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const command = data.tool_input?.command || '';
  if (!command) {
    process.exit(0);
  }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);
  const context = [];
  let modified = false;

  // Check for test commands
  const isTestCommand = TEST_PATTERNS.some(p => p.test(command));
  if (isTestCommand) {
    const output = data.tool_result?.stdout || data.tool_output || '';
    const exitCode = data.tool_result?.exit_code ?? data.exit_code ?? null;

    // Track test run in status
    if (!status.tracking) status.tracking = {};
    if (!status.tracking.test_runs) status.tracking.test_runs = [];

    const testRun = {
      command: command.substring(0, 200),
      timestamp: new Date().toISOString(),
      passed: exitCode === 0,
      exit_code: exitCode
    };

    status.tracking.test_runs.unshift(testRun);
    status.tracking.test_runs = status.tracking.test_runs.slice(0, 10);
    modified = true;

    if (exitCode === 0) {
      context.push('Tests PASSED.');
    } else if (exitCode !== null) {
      context.push(`Tests FAILED (exit code ${exitCode}).`);
    }
  }

  // Check for git commit
  if (COMMIT_PATTERN.test(command)) {
    if (!status.tracking) status.tracking = {};
    if (!status.git.recent_commits) status.git.recent_commits = [];

    status.git.recent_commits.unshift({
      timestamp: new Date().toISOString(),
      command: command.substring(0, 200)
    });
    status.git.recent_commits = status.git.recent_commits.slice(0, 10);
    modified = true;

    context.push('Git commit tracked.');
  }

  if (modified) {
    saveStatus(settings, projectDir, status);
  }

  if (context.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: context.join(' ')
      }
    }));
    return;
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
