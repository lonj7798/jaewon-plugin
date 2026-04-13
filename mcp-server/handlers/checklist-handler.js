/**
 * checklist-handler.js — Checklist read/update MCP tools
 *
 * CALLING SPEC:
 *   registerChecklistTools(server, paths) -> void
 *   Registers jaewon_checklist_read, jaewon_checklist_update, jaewon_task_status tools.
 *   Side effects: Registers MCP tools
 */
import { readJSON, writeJSON } from '../lib/file-ops.js';

const VALID_STATUSES = ['pending', 'in_progress', 'done', 'blocked'];

export function registerChecklistTools(server, paths) {
  // jaewon_checklist_read — Read full checklist with task statuses
  server.tool(
    'jaewon_checklist_read',
    'Read the current plan checklist from .jaewon/ status. Returns all phases, tasks, dependencies, and statuses. Returns null if no active plan.',
    {},
    async () => {
      const status = readJSON(paths.status);
      if (!status?.plan?.checklist_path) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'No active plan', checklist: null }) }]
        };
      }

      const checklistPath = paths.resolve(status.plan.checklist_path);
      const checklist = readJSON(checklistPath);

      if (!checklist) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Checklist file not found', path: status.plan.checklist_path }) }]
        };
      }

      // Add computed summary
      const tasks = (checklist.phases || []).flatMap(p => p.tasks || []);
      const summary = {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length
      };

      return {
        content: [{ type: 'text', text: JSON.stringify({ checklist, summary }, null, 2) }]
      };
    }
  );

  // jaewon_checklist_update — Update a task's status and optional extra fields
  server.tool(
    'jaewon_checklist_update',
    'Update a task\'s status in the checklist. Provide task_id and new status (pending, in_progress, done, blocked). Optionally include extra fields (tdd_phase, committed, etc.).',
    {
      task_id: { type: 'string', description: 'ID of the task to update' },
      status: { type: 'string', description: 'New status: pending, in_progress, done, blocked' },
      extra: { type: 'object', description: 'Optional extra fields to merge into the task', additionalProperties: true }
    },
    async ({ task_id, status, extra }) => {
      if (!VALID_STATUSES.includes(status)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}` }) }]
        };
      }

      const statusData = readJSON(paths.status);
      if (!statusData?.plan?.checklist_path) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'No active plan' }) }]
        };
      }

      const checklistPath = paths.resolve(statusData.plan.checklist_path);
      const checklist = readJSON(checklistPath);
      if (!checklist) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Checklist file not found' }) }]
        };
      }

      const tasks = (checklist.phases || []).flatMap(p => p.tasks || []);
      const task = tasks.find(t => t.id === task_id);
      if (!task) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Task not found: ${task_id}` }) }]
        };
      }

      task.status = status;
      if (extra && typeof extra === 'object') {
        Object.assign(task, extra);
      }

      writeJSON(checklistPath, checklist);
      return {
        content: [{ type: 'text', text: JSON.stringify({ updated: task }) }]
      };
    }
  );

  // jaewon_task_status — Get status of a specific task or summary counts
  server.tool(
    'jaewon_task_status',
    'Get the status of a specific task or summary of all tasks. If task_id provided, returns that task. Otherwise returns counts by status.',
    {
      task_id: { type: 'string', description: 'Optional task ID. Omit to get summary counts.' }
    },
    async ({ task_id }) => {
      const statusData = readJSON(paths.status);
      if (!statusData?.plan?.checklist_path) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'No active plan' }) }]
        };
      }

      const checklistPath = paths.resolve(statusData.plan.checklist_path);
      const checklist = readJSON(checklistPath);
      if (!checklist) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Checklist file not found' }) }]
        };
      }

      const tasks = (checklist.phases || []).flatMap(p => p.tasks || []);

      if (task_id) {
        const task = tasks.find(t => t.id === task_id);
        if (!task) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Task not found: ${task_id}` }) }]
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ task }) }]
        };
      }

      const summary = {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length
      };
      return {
        content: [{ type: 'text', text: JSON.stringify({ summary }) }]
      };
    }
  );
}
