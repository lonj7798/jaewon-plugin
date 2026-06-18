#!/usr/bin/env node
/**
 * post-commit-scribe.mjs — Native git post-commit recordkeeping
 *
 * INVOCATION:
 *   Called by .git/hooks/post-commit (NOT by a Claude Code hook —
 *   PostToolUse:Bash does not dispatch reliably; see hooks/CLAUDE.md).
 *   Setup-jaewon installs the .git/hooks/post-commit shell wrapper.
 *
 * RESPONSIBILITY:
 *   1. Read current HEAD via `git rev-parse HEAD`.
 *   2. Compare against .jaewon/last-scribe-head marker.
 *   3. If HEAD advanced: append a session-log entry, update status.json,
 *      reset review-evidence.jsonl, write the new HEAD to the marker.
 *   4. If HEAD unchanged: silent no-op (handles blocked commits, hook
 *      duplication, spurious fires without wiping evidence).
 *
 * IDEMPOTENCY:
 *   Marker file holds the full 40-char SHA. Atomic write via temp + rename.
 *   Running this twice on the same HEAD is a no-op.
 *
 * FAIL-OPEN:
 *   Any error swallowed; the post-commit hook must never break the user's
 *   git workflow.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { resetReviewEvidence } from './lib/review-evidence.mjs';
import { traceHook } from './lib/hook-trace.mjs';

function git(cmd, projectDir) {
  return execSync(cmd, {
    cwd: projectDir, encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function atomicWrite(path, content) {
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
}

function readMarker(path) {
  if (!existsSync(path)) return null;
  try { return readFileSync(path, 'utf-8').trim() || null; } catch { return null; }
}

function appendSessionLog(projectDir, entry) {
  const logPath = join(projectDir, '.jaewon', 'session-log.md');
  const dir = dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(logPath)) writeFileSync(logPath, '# Session Log\n\n', 'utf-8');
  appendFileSync(logPath, entry + '\n', 'utf-8');
}

function updateStatusRecentCommits(projectDir, info) {
  const statusPath = join(projectDir, '.jaewon', 'status.json');
  if (!existsSync(statusPath)) return;
  try {
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.git = status.git || {};
    status.git.recent_commits = status.git.recent_commits || [];
    status.git.recent_commits.unshift({
      sha: info.sha,
      short: info.shortSha,
      subject: info.subject,
      ts: info.ts,
      branch: info.branch
    });
    status.git.recent_commits = status.git.recent_commits.slice(0, 20);
    status.git.last_commit = info.sha;
    atomicWrite(statusPath, JSON.stringify(status, null, 2));
  } catch {
    // Fail-open
  }
}

async function main() {
  const projectDir = process.cwd();
  let headSha;
  try {
    headSha = git('git rev-parse HEAD', projectDir);
  } catch {
    process.exit(0); // Not a git repo or git failed
  }
  if (!headSha || headSha.length < 40) process.exit(0);

  const baseDir = join(projectDir, '.jaewon');
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  const markerPath = join(baseDir, 'last-scribe-head');
  const previous = readMarker(markerPath);

  traceHook('post-commit-scribe', projectDir, {
    head: headSha.slice(0, 7),
    previous: previous ? previous.slice(0, 7) : null,
    advanced: previous !== headSha
  });

  // No advance — silent no-op so blocked commits / duplicate fires don't
  // wipe the review-evidence file.
  if (previous === headSha) process.exit(0);

  let subject = '', branch = '', ts = new Date().toISOString();
  try { subject = git('git log -1 --pretty=%s', projectDir); } catch { /* ignore */ }
  try { branch = git('git rev-parse --abbrev-ref HEAD', projectDir); } catch { /* ignore */ }

  const shortSha = headSha.slice(0, 7);
  appendSessionLog(projectDir, `- ${ts} \`${shortSha}\` (${branch}) — ${subject}`);
  updateStatusRecentCommits(projectDir, { sha: headSha, shortSha, subject, ts, branch });

  // Reset the review-evidence ledger AFTER the commit landed. Next commit
  // requires a fresh review pass.
  resetReviewEvidence(projectDir);

  // Advance the marker last (so an earlier crash doesn't claim success).
  atomicWrite(markerPath, headSha);

  process.exit(0);
}

main().catch(() => process.exit(0));
