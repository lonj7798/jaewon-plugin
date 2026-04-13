/**
 * logging-handler.js — Logging toggle MCP tool
 *
 * CALLING SPEC:
 *   registerLoggingTools(server, paths) -> void
 *   Registers jaewon_logging_toggle tool.
 *   Side effects: Registers MCP tool, reads/writes status.json
 */
import { readJSON, writeJSON } from '../lib/file-ops.js';

const VALID_ACTIONS = ['enable', 'disable'];
const VALID_LEVELS = ['debug', 'info', 'warn', 'error'];

const DEFAULT_LOGGING = {
  enabled: false,
  level: 'info',
  modules: ['*']
};

export function registerLoggingTools(server, paths) {
  server.tool(
    'jaewon_logging_toggle',
    'Toggle debug logging per module. Enable/disable logging with level and module scope.',
    {
      action: {
        type: 'string',
        description: 'Action to perform: "enable" or "disable"'
      },
      level: {
        type: 'string',
        description: 'Log level: debug, info, warn, error. Defaults to "debug" when enabling.'
      },
      modules: {
        type: 'array',
        items: { type: 'string' },
        description: 'Module names to scope logging to. Defaults to ["*"] (all modules).'
      }
    },
    async ({ action, level, modules }) => {
      if (!VALID_ACTIONS.includes(action)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid action "${action}". Must be one of: ${VALID_ACTIONS.join(', ')}` }) }]
        };
      }

      if (level && !VALID_LEVELS.includes(level)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(', ')}` }) }]
        };
      }

      const status = readJSON(paths.status) || {};
      const currentLogging = status.logging || { ...DEFAULT_LOGGING };

      if (action === 'enable') {
        currentLogging.enabled = true;
        currentLogging.level = level || 'debug';
        currentLogging.modules = modules && modules.length > 0 ? modules : currentLogging.modules;
      } else {
        currentLogging.enabled = false;
        currentLogging.level = 'info';
        currentLogging.modules = ['*'];
      }

      status.logging = currentLogging;
      if (status.hud) {
        status.hud.last_updated = new Date().toISOString();
      }
      writeJSON(paths.status, status);

      const summary = action === 'enable'
        ? `Logging enabled: level=${currentLogging.level}, modules=${currentLogging.modules.join(', ')}`
        : 'Logging disabled, reset to defaults';

      return {
        content: [{ type: 'text', text: JSON.stringify({ action, logging: currentLogging, message: summary }) }]
      };
    }
  );
}
