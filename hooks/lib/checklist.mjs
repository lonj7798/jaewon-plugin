/**
 * checklist.mjs — Checklist operations
 *
 * CALLING SPEC:
 *   checklist = readChecklist(settings, projectDir) -> Checklist | null
 *   Reads checklist.json from current plan. Returns null if no plan.
 *   Side effects: Reads filesystem
 *
 *   saveChecklist(settings, projectDir, checklist) -> void
 *   Writes checklist.json back to plan directory.
 *   Side effects: Writes filesystem
 *
 *   tasks = flattenTasks(checklist) -> Task[]
 *   Returns all tasks across all phases as flat array.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   task = findNextUnblocked(checklist) -> Task | null
 *   Finds first pending task with all dependencies met.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   tasks = findNewlyUnblocked(checklist, completedTaskId) -> Task[]
 *   After completing a task, returns newly unblocked tasks.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   checklist = updateTaskStatus(checklist, taskId, status, extra?) -> Checklist
 *   Returns new checklist with updated task status.
 *   Side effects: None (returns new object)
 *   Deterministic: Yes
 *
 *   counts = countByStatus(checklist) -> { done, pending, blocked, in_progress, total }
 *   Counts tasks by status.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   result = validateCompletionState(checklist) -> { valid: boolean, issues: string[] }
 *   Checks for stale in_progress/processing tasks.
 *   Side effects: None
 *   Deterministic: Yes
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function readChecklist(settings, projectDir) {
  const planPath = settings.paths?.plans;
  if (!planPath) return null;

  // Try to find checklist from status
  const statusPath = join(projectDir, settings.paths.status);
  let checklistPath = null;

  try {
    if (existsSync(statusPath)) {
      const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      if (status.plan?.checklist_path) {
        checklistPath = join(projectDir, status.plan.checklist_path);
      }
    }
  } catch { /* ignore */ }

  if (!checklistPath || !existsSync(checklistPath)) return null;

  try {
    return JSON.parse(readFileSync(checklistPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveChecklist(settings, projectDir, checklist) {
  const statusPath = join(projectDir, settings.paths.status);
  let checklistPath = null;

  try {
    if (existsSync(statusPath)) {
      const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      if (status.plan?.checklist_path) {
        checklistPath = join(projectDir, status.plan.checklist_path);
      }
    }
  } catch { /* ignore */ }

  if (checklistPath) {
    writeFileSync(checklistPath, JSON.stringify(checklist, null, 2), 'utf-8');
  }
}

export function flattenTasks(checklist) {
  if (!checklist?.phases) return [];
  return checklist.phases.flatMap(phase => phase.tasks || []);
}

export function findNextUnblocked(checklist) {
  const tasks = flattenTasks(checklist);
  const doneIds = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));

  return tasks.find(task => {
    if (task.status !== 'pending') return false;
    const deps = task.depends_on || [];
    return deps.every(depId => doneIds.has(depId));
  }) || null;
}

export function findNewlyUnblocked(checklist, completedTaskId) {
  const tasks = flattenTasks(checklist);
  const doneIds = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
  doneIds.add(completedTaskId);

  return tasks.filter(task => {
    if (task.status !== 'pending') return false;
    const deps = task.depends_on || [];
    if (!deps.includes(completedTaskId)) return false;
    return deps.every(depId => doneIds.has(depId));
  });
}

export function updateTaskStatus(checklist, taskId, status, extra = {}) {
  const updated = JSON.parse(JSON.stringify(checklist));
  for (const phase of updated.phases) {
    for (const task of phase.tasks) {
      if (task.id === taskId) {
        task.status = status;
        Object.assign(task, extra);
        return updated;
      }
    }
  }
  return updated;
}

export function countByStatus(checklist) {
  const tasks = flattenTasks(checklist);
  return {
    done: tasks.filter(t => t.status === 'done').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    total: tasks.length
  };
}

export function validateCompletionState(checklist) {
  const tasks = flattenTasks(checklist);
  const issues = [];

  for (const task of tasks) {
    if (task.status === 'in_progress' || task.status === 'processing') {
      issues.push(`Task ${task.id} ("${task.name}") is still "${task.status}" — should be "done" or "blocked"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
