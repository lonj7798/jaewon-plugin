/**
 * hud-handler.js — HUD MCP tool
 *
 * CALLING SPEC:
 *   registerHUDTools(server, paths) -> void
 *   Registers jaewon_hud tool.
 *   Side effects: Registers MCP tool
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { readJSON } from '../lib/file-ops.js';

const COLORS = {
  RED: 'RED', GREEN: 'GREEN', YELLOW: 'YELLOW',
  BLUE: 'BLUE', PURPLE: 'PURPLE', WHITE: 'WHITE', ORANGE: 'ORANGE'
};

export function registerHUDTools(server, paths) {
  server.tool(
    'jaewon_hud',
    'Get the current HUD display showing pipeline status, task progress, and TDD phases.',
    {},
    async () => {
      const status = readJSON(paths.status) || {};
      const checklist = loadChecklist(status, paths);
      const tasks = checklist ? flattenTasks(checklist) : [];
      const counts = countTasks(tasks);
      const activeTask = tasks.find(t => t.status === 'in_progress') || null;
      const color = resolveColor(status, counts, activeTask);
      const hud = formatHUD(color, status, counts, tasks, activeTask);

      return {
        content: [{ type: 'text', text: hud }]
      };
    }
  );
}

function loadChecklist(status, paths) {
  if (!status.plan?.checklist_path) return null;
  const checklistPath = join(paths.projectDir, status.plan.checklist_path);
  return readJSON(checklistPath);
}

function flattenTasks(checklist) {
  if (!checklist?.phases) return [];
  return checklist.phases.flatMap(phase => phase.tasks || []);
}

function countTasks(tasks) {
  return {
    done: tasks.filter(t => t.status === 'done').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    total: tasks.length
  };
}

function resolveColor(status, counts, activeTask) {
  if (!status.plan?.current_version) return COLORS.WHITE;
  if (counts.blocked > 0 && counts.pending === 0 && counts.in_progress === 0) return COLORS.ORANGE;

  if (activeTask) {
    if (activeTask.tdd_stage === 'red') return COLORS.RED;
    if (activeTask.tdd_stage === 'green') return COLORS.GREEN;
    if (activeTask.tdd_stage === 'refactor') return COLORS.YELLOW;
    if (activeTask.type === 'debug') return COLORS.PURPLE;
  }

  const phase = status.plan?.phase;
  if (phase === 'plan' || phase === 'planning') return COLORS.BLUE;
  if (phase === 'debug' || phase === 'investigating') return COLORS.PURPLE;
  if (phase === 'review' || phase === 'refactor') return COLORS.YELLOW;
  if (counts.total > 0 && counts.done === counts.total) return COLORS.GREEN;

  return COLORS.BLUE;
}

function formatHUD(color, status, counts, tasks, activeTask) {
  const lines = [];
  const version = status.plan?.current_version || 'no plan';
  const phase = status.plan?.phase || 'idle';

  // Summary line
  const parts = [`[${color}]`, version, `${counts.done}/${counts.total} done`];
  if (counts.blocked > 0) parts.push(`${counts.blocked} blocked`);
  if (activeTask) {
    const name = activeTask.title || activeTask.name || activeTask.id;
    parts.push(`active: ${name}`);
  }
  lines.push(parts.join(' | '));
  lines.push('');
  lines.push(`Plan: ${version} | Phase: ${phase} | Branch: ${status.git?.current_branch || 'unknown'}`);
  lines.push(`Progress: ${counts.done}/${counts.total} done, ${counts.in_progress} in-progress, ${counts.blocked} blocked, ${counts.pending} pending`);

  if (tasks.length > 0) {
    lines.push('');
    lines.push('Tasks:');
    for (const task of tasks) {
      const icon = task.status === 'done' ? '[x]' : task.status === 'in_progress' ? '[>]' : task.status === 'blocked' ? '[!]' : '[ ]';
      const tdd = task.tdd_stage ? ` [${task.tdd_stage}]` : '';
      lines.push(`  ${icon} ${task.id}: ${task.title || task.name || task.id}${tdd}`);
    }
  }

  if (status.blocked && status.blocked.length > 0) {
    lines.push('');
    lines.push('Blocked:');
    for (const b of status.blocked) {
      lines.push(`  - ${b.task_id || b.id || 'unknown'}: ${b.reason || b.description || 'no reason'}`);
    }
  }

  return lines.join('\n');
}
