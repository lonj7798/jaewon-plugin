#!/usr/bin/env node
/**
 * subagent-tracker.mjs — Update checklist on agent completion
 *
 * CALLING SPEC:
 *   Runs on SubagentStop hook event.
 *   Parses agent's last message for task completion signal.
 *   Updates checklist.json with task status.
 *   Injects additionalContext with newly unblocked tasks.
 *   Side effects: Reads/writes filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';
import {
  readChecklist,
  saveChecklist,
  updateTaskStatus,
  findNewlyUnblocked,
  countByStatus
} from './lib/checklist.mjs';

/**
 * Extract task ID from agent message.
 * Matches patterns: [p1-t1], [phase-1-task-1], Task: p1-t1, task_id: p1-t1
 */
function extractTaskId(message) {
  if (!message || typeof message !== 'string') return null;

  // Pattern: [p1-t1] or [phase-1-task-1]
  const bracketMatch = message.match(/\[(p\d+-t\d+)\]/i)
    || message.match(/\[(phase-\d+-task-\d+)\]/i);
  if (bracketMatch) return bracketMatch[1].toLowerCase();

  // Pattern: Task: p1-t1 or task_id: p1-t1
  const prefixMatch = message.match(/(?:task|task_id):\s*(p\d+-t\d+)/i)
    || message.match(/(?:task|task_id):\s*(phase-\d+-task-\d+)/i);
  if (prefixMatch) return prefixMatch[1].toLowerCase();

  return null;
}

/**
 * Determine task status from agent message content.
 */
function extractStatus(message) {
  if (!message || typeof message !== 'string') return 'done';

  const lower = message.toLowerCase();
  if (lower.includes('blocked') || lower.includes('cannot proceed')) return 'blocked';
  if (lower.includes('failed') || lower.includes('failure')) return 'blocked';
  if (lower.includes('done') || lower.includes('completed') || lower.includes('complete')) return 'done';

  // Default to done — agent finished its work
  return 'done';
}

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const lastMessage = data.last_assistant_message || '';
  const taskId = extractTaskId(lastMessage);

  // Not a tracked task — nothing to do
  if (!taskId) {
    process.exit(0);
  }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const checklist = readChecklist(settings, projectDir);

  if (!checklist) {
    process.exit(0);
  }

  const status = extractStatus(lastMessage);
  const extra = {
    completed_at: new Date().toISOString(),
    agent_type: data.agent_type || 'unknown',
    agent_id: data.agent_id || null
  };

  const updated = updateTaskStatus(checklist, taskId, status, extra);
  saveChecklist(settings, projectDir, updated);

  // Update status.json HUD fields
  const projectStatus = readStatus(settings, projectDir);
  const counts = countByStatus(updated);
  const allDone = counts.total > 0 && counts.done >= counts.total;

  projectStatus.hud = {
    ...projectStatus.hud,
    overall_color: allDone ? 'GREEN'
      : counts.blocked > 0 && counts.pending === 0 ? 'ORANGE'
      : counts.in_progress > 0 ? 'GREEN' : 'WHITE',
    progress: `${counts.done}/${counts.total}`,
    active_task: allDone ? null : (status === 'done' ? null : taskId),
    active_phase: allDone ? null : projectStatus.hud?.active_phase,
    blocked_count: counts.blocked,
    last_updated: new Date().toISOString()
  };

  // Clear plan.phase when all tasks complete
  if (allDone && projectStatus.plan) {
    projectStatus.plan.phase = 'done';
  }

  saveStatus(settings, projectDir, projectStatus);

  // Find tasks newly unblocked by this completion
  const newlyUnblocked = findNewlyUnblocked(updated, taskId);
  const unblockedList = newlyUnblocked.map(t => `${t.id} (${t.name})`).join(', ');

  // Wiki hint: task completed
  const wikiHint = `Wiki: task ${taskId} (${data.agent_type || 'agent'}) completed. Consider spawning wiki-maintainer for concept-level page updates.`;

  const context = [
    `Task ${taskId} ${status}.`,
    newlyUnblocked.length > 0
      ? `Newly unblocked: ${unblockedList}.`
      : 'No new tasks unblocked.',
    wikiHint
  ].join(' ');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SubagentStop',
      additionalContext: context
    }
  }));
}

main().catch(() => process.exit(0));
