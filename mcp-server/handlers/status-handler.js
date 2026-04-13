/**
 * status-handler.js — Status MCP tools
 *
 * CALLING SPEC:
 *   registerStatusTools(server, paths) -> void
 *   Registers jaewon_status and jaewon_status_update tools.
 *   Side effects: Registers MCP tools
 */
import { readJSON, writeJSON } from '../lib/file-ops.js';

const DEFAULT_STATUS = {
  version: 1,
  project: { name: null, path: null, detected_stack: [] },
  plan: { current_version: null, plan_path: null, checklist_path: null, phase: null },
  session: { current_id: null, last_start: null, last_end: null, total_sessions: 0 },
  git: { current_branch: null, recent_commits: [], auto_manage: true },
  logging: { enabled: false, level: 'info', modules: ['*'] },
  hud: { overall_color: 'WHITE', progress: null, active_task: null, active_phase: null, blocked_count: 0, last_updated: null },
  blocked: [],
  execution_mode: 'teammate_first'
};

export function registerStatusTools(server, paths) {
  // jaewon_status — Read current status
  server.tool(
    'jaewon_status',
    'Read the current project status from .jaewon/status.json. Returns project state, plan info, session data, git branch, HUD state, and blocked tasks.',
    {},
    async () => {
      const status = readJSON(paths.status) || DEFAULT_STATUS;
      return {
        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
      };
    }
  );

  // jaewon_status_update — Update specific status fields
  server.tool(
    'jaewon_status_update',
    'Update specific fields in .jaewon/status.json. Pass a partial object with fields to update (deep merged).',
    {
      updates: {
        type: 'object',
        description: 'Partial status object with fields to update. Deep merged with existing status.',
        additionalProperties: true
      }
    },
    async ({ updates }) => {
      const current = readJSON(paths.status) || { ...DEFAULT_STATUS };
      const merged = deepMerge(current, updates);
      merged.hud.last_updated = new Date().toISOString();
      writeJSON(paths.status, merged);
      return {
        content: [{ type: 'text', text: `Status updated: ${Object.keys(updates).join(', ')}` }]
      };
    }
  );
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object') {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
