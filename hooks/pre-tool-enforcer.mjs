#!/usr/bin/env node
/**
 * pre-tool-enforcer.mjs — Single PreToolUse:Bash dispatcher (per the rule
 * in hooks/CLAUDE.md). Blocks dangerous commands, enforces the review-evidence
 * gate on `git commit`, runs the cleanup-pattern + LOC scan over staged files,
 * and surfaces main-branch warnings.
 *
 * CALLING SPEC:
 *   Runs on PreToolUse:Bash hook event.
 *   Reads tool_input.command from stdin.
 *   Blocks: rm -rf /, git push --force, git reset --hard, drop table.
 *   Blocks (review gate): `git commit` without fresh review evidence OR with
 *     pre-commit-scan issues. Bypassed by `--no-verify`, merge/rebase, or
 *     `gate.enabled: false` in .jaewon/pre-commit-config.json.
 *   Warns: committing on main branch.
 *   Side effects: Writes stdout (decision JSON); reads filesystem
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { getCurrentBranch } from './lib/session-helpers.mjs';
import { traceHook } from './lib/hook-trace.mjs';
import { checkReviewEvidence } from './lib/review-evidence.mjs';
import { scanStaged, loadConfig } from './lib/pre-commit-scan.mjs';

const COMMIT_RE = /^\s*git\s+commit\b/;
// `\b` doesn't match between space and `-` (both non-word). Use explicit
// non-word boundaries instead.
const NO_VERIFY_RE = /(?:^|\s)--no-verify(?=\s|$)/;

function isMergeOrRebase(projectDir) {
  const gitDir = join(projectDir, '.git');
  return existsSync(join(gitDir, 'MERGE_HEAD'))
    || existsSync(join(gitDir, 'rebase-merge'))
    || existsSync(join(gitDir, 'rebase-apply'));
}

function gateConfig(projectDir) {
  const path = join(projectDir, '.jaewon', 'pre-commit-config.json');
  if (!existsSync(path)) return { enabled: true, requireBothPasses: true, maxAgeMinutes: 30 };
  try {
    const c = JSON.parse(readFileSync(path, 'utf-8'));
    return {
      enabled: c.gate?.enabled ?? true,
      requireBothPasses: c.gate?.requireBothPasses ?? true,
      maxAgeMinutes: c.gate?.maxAgeMinutes ?? 30
    };
  } catch {
    return { enabled: true, requireBothPasses: true, maxAgeMinutes: 30 };
  }
}

function runReviewGate(command, projectDir) {
  // 1) Skip when commit isn't actually happening (echo "git commit ..." etc.)
  if (!COMMIT_RE.test(command)) return null;
  // 2) Explicit human bypass
  if (NO_VERIFY_RE.test(command)) return null;
  // 3) Skip during merge/rebase — git wraps the auto-merge commit
  if (isMergeOrRebase(projectDir)) return null;
  // 4) Honor user toggle
  const cfg = gateConfig(projectDir);
  if (!cfg.enabled) return null;

  const reasons = [];

  const evidence = checkReviewEvidence(projectDir, {
    maxAgeMinutes: cfg.maxAgeMinutes,
    requireBothPasses: cfg.requireBothPasses
  });
  if (!evidence.ok) {
    reasons.push(`review gate: ${evidence.reason}. Run /jaewon-plugin:review (or skill 'review') first, or pass --no-verify to bypass.`);
  }

  try {
    const { issues } = scanStaged(projectDir, loadConfig(projectDir));
    if (issues.length > 0) {
      const summarized = issues.slice(0, 5).map(i =>
        `  - ${i.file}${i.line ? `:${i.line}` : ''} — ${i.rule} ${i.detail ? `(${i.detail})` : ''}`
      ).join('\n');
      const more = issues.length > 5 ? `\n  ...and ${issues.length - 5} more` : '';
      reasons.push(`pre-commit scan found ${issues.length} blocking issue(s):\n${summarized}${more}`);
    }
  } catch {
    // Fail-open on scan errors — don't block the user on a tool bug
  }

  if (reasons.length === 0) return null;
  return reasons.join('\n\n');
}

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
  const projectDir = data.cwd || process.cwd();
  traceHook('pre-tool-enforcer', projectDir, { cmd_prefix: command.slice(0, 60) });
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

  // Review gate: only fires for actual `git commit` (not echo / --no-verify /
  // merge / rebase / disabled). Returns a reason string to block, else null.
  const reviewBlock = runReviewGate(command, projectDir);
  if (reviewBlock) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: reviewBlock
    }));
    return;
  }

  // Check warning patterns
  const warnings = [];

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
