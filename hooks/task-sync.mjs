#!/usr/bin/env node
/**
 * task-sync.mjs — Sync TaskCompleted events to checklist
 *
 * CALLING SPEC:
 *   Runs on TaskCompleted hook event.
 *   Reads task subject from stdin.
 *   Finds matching task in checklist by ID.
 *   Marks as done if found.
 *   Side effects: Reads/writes filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readChecklist, saveChecklist, updateTaskStatus } from './lib/checklist.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const projectDir = data.cwd || process.cwd();
  const taskId = data.task_id || data.subject || data.id || '';

  if (!taskId) {
    process.exit(0);
  }

  const settings = getSettings(projectDir);
  const checklist = readChecklist(settings, projectDir);

  if (!checklist) {
    process.exit(0);
  }

  // Try to find and update the task
  const updated = updateTaskStatus(checklist, taskId, 'done', {
    completed_at: new Date().toISOString()
  });

  // Check if anything actually changed
  const originalJson = JSON.stringify(checklist);
  const updatedJson = JSON.stringify(updated);

  if (originalJson !== updatedJson) {
    saveChecklist(settings, projectDir, updated);
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'TaskCompleted',
        additionalContext: `Task ${taskId} marked as done in checklist.`
      }
    }));
  }
}

main().catch(() => process.exit(0));
