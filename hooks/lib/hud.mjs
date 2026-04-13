/**
 * hud.mjs — HUD computation and formatting
 *
 * CALLING SPEC:
 *   hud = computeHUD(settings, projectDir) -> { color, counts, tasks, plan, summary }
 *   Reads status.json and checklist.json to compute HUD state.
 *   Side effects: Reads filesystem
 *
 *   formatted = formatFullHUD(hud) -> string
 *   Multi-line HUD with all tasks and status indicators.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   formatted = formatCompactHUD(hud) -> string
 *   One-line summary for context injection.
 *   Side effects: None
 *   Deterministic: Yes
 */
import { readStatus } from './state.mjs';
import { readChecklist, flattenTasks, countByStatus } from './checklist.mjs';

const COLORS = {
  RED: 'RED',         // tests written, failing (tdd_phase=red)
  GREEN: 'GREEN',     // tests passing (tdd_phase=green or done)
  YELLOW: 'YELLOW',   // refactoring/reviewing
  BLUE: 'BLUE',       // planning phase
  PURPLE: 'PURPLE',   // investigating (debug)
  WHITE: 'WHITE',     // idle (no plan)
  ORANGE: 'ORANGE'    // blocked
};

export function computeHUD(settings, projectDir) {
  const status = readStatus(settings, projectDir);
  const checklist = readChecklist(settings, projectDir);
  const tasks = checklist ? flattenTasks(checklist) : [];
  const counts = checklist ? countByStatus(checklist) : { done: 0, pending: 0, blocked: 0, in_progress: 0, total: 0 };

  const activeTask = tasks.find(t => t.status === 'in_progress') || null;
  const plan = status.plan || {};
  const color = resolveColor(status, counts, activeTask);

  const summary = buildSummary(color, plan, counts, activeTask);

  return { color, counts, tasks, plan, summary, activeTask, status };
}

function resolveColor(status, counts, activeTask) {
  // No plan = idle
  if (!status.plan?.current_version) return COLORS.WHITE;

  // All blocked = orange
  if (counts.blocked > 0 && counts.pending === 0 && counts.in_progress === 0) {
    return COLORS.ORANGE;
  }

  // Check active task TDD stage
  if (activeTask) {
    if (activeTask.tdd_stage === 'red') return COLORS.RED;
    if (activeTask.tdd_stage === 'green') return COLORS.GREEN;
    if (activeTask.tdd_stage === 'refactor') return COLORS.YELLOW;
    if (activeTask.type === 'debug') return COLORS.PURPLE;
  }

  // Check HUD override from status
  if (status.hud?.overall_color && status.hud.overall_color !== 'WHITE') {
    return status.hud.overall_color;
  }

  // Phase-based
  const phase = status.plan?.phase;
  if (phase === 'plan' || phase === 'planning') return COLORS.BLUE;
  if (phase === 'debug' || phase === 'investigating') return COLORS.PURPLE;
  if (phase === 'review' || phase === 'refactor') return COLORS.YELLOW;

  // All done
  if (counts.total > 0 && counts.done === counts.total) return COLORS.GREEN;

  // Default: has plan, work in progress
  return COLORS.BLUE;
}

function buildSummary(color, plan, counts, activeTask) {
  const parts = [`[${color}]`];

  if (plan.current_version) {
    parts.push(plan.current_version);
  }

  if (counts.total > 0) {
    parts.push(`${counts.done}/${counts.total} done`);
  }

  if (counts.blocked > 0) {
    parts.push(`${counts.blocked} blocked`);
  }

  if (activeTask) {
    const taskInfo = activeTask.title || activeTask.name || activeTask.id;
    parts.push(`active: ${taskInfo}`);
  }

  return parts.join(' | ');
}

export function formatFullHUD(hud) {
  const lines = [];
  lines.push(`## HUD — ${hud.summary}`);
  lines.push('');

  if (hud.plan.current_version) {
    lines.push(`Plan: ${hud.plan.current_version} | Phase: ${hud.plan.phase || 'unknown'}`);
  }

  lines.push(`Progress: ${hud.counts.done}/${hud.counts.total} done, ${hud.counts.in_progress} in-progress, ${hud.counts.blocked} blocked, ${hud.counts.pending} pending`);
  lines.push('');

  if (hud.tasks.length > 0) {
    lines.push('### Tasks');
    for (const task of hud.tasks) {
      const icon = statusIcon(task.status);
      const tdd = task.tdd_stage ? ` [${task.tdd_stage}]` : '';
      const title = task.title || task.name || task.id;
      lines.push(`${icon} ${task.id}: ${title}${tdd}`);
    }
  }

  if (hud.status.blocked && hud.status.blocked.length > 0) {
    lines.push('');
    lines.push('### Blocked');
    for (const b of hud.status.blocked) {
      lines.push(`- ${b.task_id || b.id || 'unknown'}: ${b.reason || b.description || 'no reason given'}`);
    }
  }

  return lines.join('\n');
}

export function formatCompactHUD(hud) {
  return hud.summary;
}

function statusIcon(status) {
  switch (status) {
    case 'done': return '[x]';
    case 'in_progress': return '[>]';
    case 'blocked': return '[!]';
    case 'pending': return '[ ]';
    default: return '[-]';
  }
}

export { COLORS };
