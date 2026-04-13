/**
 * debug-handler.js — Debug history MCP tool
 *
 * CALLING SPEC:
 *   registerDebugTools(server, paths) -> void
 *   Registers jaewon_debug_history tool.
 *   Side effects: Registers MCP tool, reads/writes debug history files
 */
import { readJSON, writeJSON, appendMarkdown } from '../lib/file-ops.js';
import { join } from 'path';

export function registerDebugTools(server, paths) {
  const debugHistoryDir = paths.debug_history || join(paths.baseDir, 'debug-history');
  const indexPath = join(debugHistoryDir, 'index.json');
  const patternsPath = join(debugHistoryDir, 'patterns.md');

  server.tool(
    'jaewon_debug_history',
    'Search and query the debug history. Find past bugs by keyword, get patterns, or add new bug entries.',
    {
      action: {
        type: 'string',
        description: 'Action: "search" (find past bugs), "patterns" (get pattern summary), "add" (record new bug)'
      },
      query: {
        type: 'string',
        description: 'Search keyword for "search" action. Matches against symptom, root_cause, and fix_layer fields.'
      },
      entry: {
        type: 'object',
        description: 'Bug entry for "add" action. Fields: name (string), symptom (string), root_cause (string), fix_layer (string), fix_description (string), regression_test (string), resolved (boolean).',
        additionalProperties: true
      }
    },
    async ({ action, query, entry }) => {
      if (action === 'search') {
        const index = readJSON(indexPath) || { bugs: [] };
        if (!query) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ results: index.bugs, total: index.bugs.length }) }]
          };
        }

        const lowerQuery = query.toLowerCase();
        const matches = index.bugs.filter(bug => {
          const searchable = [
            bug.symptom || '',
            bug.root_cause || '',
            bug.fix_layer || '',
            bug.name || '',
            bug.fix_description || ''
          ].join(' ').toLowerCase();
          return searchable.includes(lowerQuery);
        });

        return {
          content: [{ type: 'text', text: JSON.stringify({ query, results: matches, total: matches.length }) }]
        };
      }

      if (action === 'patterns') {
        const { existsSync, readFileSync } = await import('fs');
        if (!existsSync(patternsPath)) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ patterns: null, message: 'No patterns file found. Patterns are generated after multiple bugs are recorded.' }) }]
          };
        }
        const content = readFileSync(patternsPath, 'utf-8');
        return {
          content: [{ type: 'text', text: JSON.stringify({ patterns: content }) }]
        };
      }

      if (action === 'add') {
        if (!entry || !entry.name) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Entry must include at least a "name" field.' }) }]
          };
        }

        const index = readJSON(indexPath) || { bugs: [] };
        const date = new Date().toISOString().split('T')[0];
        const slug = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const id = `${date}-${slug}`;

        const bugEntry = {
          id,
          date,
          name: entry.name,
          symptom: entry.symptom || '',
          root_cause: entry.root_cause || '',
          fix_layer: entry.fix_layer || '',
          fix_description: entry.fix_description || '',
          regression_test: entry.regression_test || '',
          resolved: entry.resolved !== undefined ? entry.resolved : false
        };

        index.bugs.push(bugEntry);
        writeJSON(indexPath, index);

        // Write individual report
        const reportPath = join(debugHistoryDir, `${id}.md`);
        const reportContent = [
          `# Bug Report: ${entry.name}`,
          '',
          `**Date**: ${date}`,
          `**ID**: ${id}`,
          `**Resolved**: ${bugEntry.resolved ? 'Yes' : 'No'}`,
          '',
          '## Symptom',
          bugEntry.symptom || '_Not provided_',
          '',
          '## Root Cause',
          bugEntry.root_cause || '_Not provided_',
          '',
          '## Fix Layer',
          bugEntry.fix_layer || '_Not provided_',
          '',
          '## Fix Description',
          bugEntry.fix_description || '_Not provided_',
          '',
          '## Regression Test',
          bugEntry.regression_test || '_Not provided_'
        ].join('\n');

        appendMarkdown(reportPath, reportContent);

        return {
          content: [{ type: 'text', text: JSON.stringify({ added: bugEntry, report_path: reportPath }) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Invalid action "${action}". Must be one of: search, patterns, add` }) }]
      };
    }
  );
}
