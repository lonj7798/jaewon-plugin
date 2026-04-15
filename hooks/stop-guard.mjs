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
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus } from './lib/state.mjs';
import { readChecklist, countByStatus, findNextUnblocked } from './lib/checklist.mjs';

const MAX_BLOCKS = 3; // Allow stop after blocking this many times

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  // CRITICAL: Prevent infinite loop — if stop hook already active, allow stop
  if (data.stop_hook_active) {
    process.exit(0);
  }

  // Anti-loop: track consecutive blocks, allow stop after MAX_BLOCKS
  const projectDir = data.cwd || process.cwd();
  const counterFile = join(projectDir, '.jaewon', '.stop-block-count');
  const blockCount = readBlockCount(counterFile);

  if (blockCount >= MAX_BLOCKS) {
    resetBlockCount(counterFile);
    process.exit(0); // Allow stop — we've blocked enough times
  }

  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);
  const checklist = readChecklist(settings, projectDir);

  // --- Check 1: Checklist tasks ---
  if (checklist) {
    const counts = countByStatus(checklist);

    // If all tasks are done, allow stop regardless of phase field
    if (counts.total > 0 && counts.done >= counts.total) {
      process.exit(0);
    }

    if (counts.pending > 0 || counts.in_progress > 0) {
      const next = findNextUnblocked(checklist);

      if (next) {
        incrementBlockCount(counterFile);
        const reason = [
          `${counts.pending + counts.in_progress} tasks remaining.`,
          `${counts.done}/${counts.total} done.`,
          `Next: ${next.id} — ${next.name}.`,
          'Continue implementation.'
        ].join(' ');

        console.log(JSON.stringify({ decision: 'block', reason }));
        return;
      }
    }
  }

  // --- Check 2: Active phase in status.json ---
  // plan.phase is source of truth. null means explicitly cleared.
  const planPhase = status.plan?.phase;
  const activePhase = planPhase !== undefined ? planPhase : status.hud?.active_phase;
  const progress = status.hud?.progress;
  const lastUpdated = status.hud?.last_updated;

  // Skip stale status (older than 30 minutes)
  const isStale = (() => {
    if (!lastUpdated) return true;
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age > 30 * 60 * 1000;
  })();

  // Treat null, 'idle', 'done', 'plan' as non-blocking
  const idlePhases = [null, undefined, 'idle', 'done', 'plan'];
  if (!isStale && !idlePhases.includes(activePhase)) {
    let workRemains = true;
    if (progress) {
      const match = progress.match(/^(\d+)\/(\d+)/);
      if (match && parseInt(match[1]) >= parseInt(match[2])) {
        workRemains = false;
      }
    }

    if (workRemains) {
      incrementBlockCount(counterFile);
      const parts = [`⚠ Active phase: "${activePhase}".`];
      if (progress) parts.push(`Progress: ${progress}.`);
      parts.push('Check status and continue working on remaining items.');

      console.log(JSON.stringify({ decision: 'block', reason: parts.join(' ') }));
      return;
    }
  }

  // No active work — allow stop and reset counter
  resetBlockCount(counterFile);
  process.exit(0);
}

function readBlockCount(file) {
  try {
    if (existsSync(file)) {
      const data = JSON.parse(readFileSync(file, 'utf-8'));
      // Reset if last block was more than 5 minutes ago (different stop sequence)
      if (data.timestamp && Date.now() - data.timestamp > 5 * 60 * 1000) return 0;
      return data.count || 0;
    }
  } catch { /* ignore */ }
  return 0;
}

function incrementBlockCount(file) {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const count = readBlockCount(file) + 1;
  writeFileSync(file, JSON.stringify({ count, timestamp: Date.now() }), 'utf-8');
}

function resetBlockCount(file) {
  try { if (existsSync(file)) writeFileSync(file, JSON.stringify({ count: 0 }), 'utf-8'); } catch { /* ignore */ }
}

main().catch(() => process.exit(0));
