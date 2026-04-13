#!/usr/bin/env node
/**
 * stop-guard.mjs — Block stop if tasks remain
 *
 * CALLING SPEC:
 *   Runs on Stop hook event.
 *   Reads checklist.json, checks for pending unblocked tasks.
 *   If tasks remain: blocks stop with reason.
 *   If all done/blocked: allows stop.
 *   CRITICAL: Checks stop_hook_active to prevent infinite loop.
 *   Side effects: Reads filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readChecklist, countByStatus, findNextUnblocked } from './lib/checklist.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  // CRITICAL: Prevent infinite loop — if stop hook already active, allow stop
  if (data.stop_hook_active) {
    process.exit(0);
  }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const checklist = readChecklist(settings, projectDir);

  // No checklist means no plan — allow stop
  if (!checklist) {
    process.exit(0);
  }

  const counts = countByStatus(checklist);

  // All tasks done or no pending tasks — allow stop
  if (counts.pending === 0 && counts.in_progress === 0) {
    process.exit(0);
  }

  // Check if any pending tasks are actually unblocked
  const next = findNextUnblocked(checklist);

  if (!next) {
    // All remaining tasks are blocked — allow stop
    process.exit(0);
  }

  // Tasks remain and some are unblocked — block stop
  const unblockedCount = counts.pending;
  const reason = [
    `${counts.pending + counts.in_progress} tasks remaining.`,
    `${unblockedCount} unblocked and ready.`,
    `Next: ${next.id} — ${next.name}.`,
    'Continue implementation.'
  ].join(' ');

  console.log(JSON.stringify({
    decision: 'block',
    reason
  }));
}

main().catch(() => process.exit(0));
