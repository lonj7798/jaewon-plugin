#!/usr/bin/env node
/**
 * stop-guard.mjs — Block stop if work remains
 *
 * CALLING SPEC:
 *   Runs on Stop hook event.
 *   Checks both checklist.json AND status.json for active work.
 *   If tasks/work remain: blocks stop with reason + next action.
 *   If all done/blocked/idle: allows stop.
 *   CRITICAL: Checks stop_hook_active to prevent infinite loop.
 *   Side effects: Reads filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus } from './lib/state.mjs';
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
  const status = readStatus(settings, projectDir);
  const checklist = readChecklist(settings, projectDir);

  // --- Check 1: Checklist tasks ---
  if (checklist) {
    const counts = countByStatus(checklist);

    if (counts.pending > 0 || counts.in_progress > 0) {
      const next = findNextUnblocked(checklist);

      if (next) {
        const reason = [
          `⚠ ${counts.pending + counts.in_progress} tasks remaining (${counts.done}/${counts.total} done).`,
          `Next: ${next.id} — ${next.name}.`,
          'Continue working on the remaining tasks.'
        ].join(' ');

        console.log(JSON.stringify({ decision: 'block', reason }));
        return;
      }
    }
  }

  // --- Check 2: Active phase in status.json ---
  const activePhase = status.plan?.phase || status.hud?.active_phase;
  const activeTask = status.hud?.active_task;
  const progress = status.hud?.progress;
  const lastUpdated = status.hud?.last_updated;

  // Skip stale status (older than 30 minutes or from a different session)
  const isStale = (() => {
    if (!lastUpdated) return true;
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age > 30 * 60 * 1000; // 30 minutes
  })();

  if (!isStale && activePhase && activePhase !== 'idle' && activePhase !== 'done') {
    // Parse progress like "3/8" to see if work remains
    let workRemains = true;
    if (progress) {
      const match = progress.match(/^(\d+)\/(\d+)/);
      if (match && parseInt(match[1]) >= parseInt(match[2])) {
        workRemains = false; // All done
      }
    }

    if (workRemains) {
      const parts = [`⚠ Active phase: "${activePhase}".`];
      if (progress) parts.push(`Progress: ${progress}.`);
      if (activeTask) parts.push(`Current task: ${activeTask}.`);
      parts.push('Check status and continue working on remaining items.');

      console.log(JSON.stringify({ decision: 'block', reason: parts.join(' ') }));
      return;
    }
  }

  // No active work — allow stop
  process.exit(0);
}

main().catch(() => process.exit(0));
