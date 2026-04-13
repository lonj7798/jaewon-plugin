#!/usr/bin/env node
/**
 * session-end.mjs — Persist state and write handoff on session end
 *
 * CALLING SPEC:
 *   Runs on SessionEnd hook event.
 *   Updates status.json with end timestamp.
 *   Appends session summary to session-log.md.
 *   Writes handoff.md for next session pickup.
 *   Optionally disables logging per settings.
 *   Side effects: Reads/writes filesystem
 */
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';
import { readChecklist, flattenTasks, countByStatus } from './lib/checklist.mjs';
import { writeHandoff, appendSessionLog, getCurrentBranch } from './lib/session-helpers.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);
  const checklist = readChecklist(settings, projectDir);
  const now = new Date().toISOString();

  // Update session end timestamp
  status.session.last_end = now;

  // Get branch info
  const branch = getCurrentBranch(projectDir);
  if (branch) {
    status.git.current_branch = branch;
  }

  // Compute task counts
  const counts = checklist ? countByStatus(checklist) : { done: 0, pending: 0, blocked: 0, in_progress: 0, total: 0 };
  const tasks = checklist ? flattenTasks(checklist) : [];

  // Append session log
  const sessionNum = status.session.total_sessions || 1;
  const startTime = status.session.last_start || 'unknown';
  appendSessionLog(settings, projectDir, {
    sessionNum,
    start: startTime,
    end: now,
    version: status.plan?.current_version || 'none',
    tasksCompleted: counts.done,
    branch: branch || 'unknown'
  });

  // Write handoff for next session
  const completedTasks = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  writeHandoff(settings, projectDir, {
    timestamp: now,
    version: status.plan?.current_version || 'none',
    phase: status.plan?.phase || 'unknown',
    branch: branch || 'unknown',
    completedTasks,
    pendingTasks,
    blocked: status.blocked || []
  });

  // Append to wiki log if it exists
  const wikiLogPath = join(projectDir, 'docs', 'wiki', 'log.md');
  if (existsSync(wikiLogPath)) {
    const logEntry = `\n## [${now.split('T')[0]}] Session #${sessionNum}\nTasks done: ${counts.done}/${counts.total} | Branch: ${branch || 'unknown'} | Plan: ${status.plan?.current_version || 'none'}\n`;
    try {
      appendFileSync(wikiLogPath, logEntry, 'utf-8');
    } catch { /* ignore */ }
  }

  // Auto-disable logging if configured
  if (settings.logging?.auto_disable_on_session_end) {
    status.logging.enabled = false;
  }

  saveStatus(settings, projectDir, status);

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionEnd',
      additionalContext: `Session #${sessionNum} ended. ${counts.done}/${counts.total} tasks done. Handoff written.`
    }
  }));
}

main().catch(() => process.exit(0));
