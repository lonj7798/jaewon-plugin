#!/usr/bin/env node
/**
 * pre-compact.mjs — Write handoff before context compaction
 *
 * CALLING SPEC:
 *   Runs on PreCompact hook event.
 *   Writes handoff.md so context survives compaction.
 *   SessionStart re-injects handoff.md on next load.
 *   Side effects: Reads/writes filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';
import { readChecklist, flattenTasks, countByStatus } from './lib/checklist.mjs';
import { writeHandoff, getCurrentBranch } from './lib/session-helpers.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);
  const checklist = readChecklist(settings, projectDir);
  const now = new Date().toISOString();

  const branch = getCurrentBranch(projectDir);
  if (branch) {
    status.git.current_branch = branch;
  }

  const tasks = checklist ? flattenTasks(checklist) : [];
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

  // Update status with compaction timestamp
  status.hud.last_updated = now;
  saveStatus(settings, projectDir, status);

  const counts = checklist ? countByStatus(checklist) : { done: 0, total: 0 };

  // Wiki lint hint: full sync before compaction
  let wikiHint = '';
  const { existsSync: fsExists } = await import('fs');
  const { join: pathJoin } = await import('path');
  const schemaPath = pathJoin(projectDir, 'docs', 'wiki', 'SCHEMA.md');
  if (fsExists(schemaPath)) {
    wikiHint = ' Wiki: PreCompact — consider spawning wiki-maintainer for full lint + index rebuild before context loss.';
  }

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreCompact',
      additionalContext: `Handoff written before compaction. ${counts.done}/${counts.total} tasks done.${wikiHint}`
    }
  }));
}

main().catch(() => process.exit(0));
