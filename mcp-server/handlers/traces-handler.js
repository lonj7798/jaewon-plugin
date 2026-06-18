/**
 * traces-handler.js — Trace feed MCP tool
 *
 * CALLING SPEC:
 *   registerTracesTools(server, paths) -> void
 *   Registers jaewon_traces tool.
 *   Side effects: Registers MCP tool
 *
 *   jaewon_traces actions:
 *     - "list":      list available trace files (date + size)
 *     - "read":      read recent N entries (optionally filtered by date)
 *     - "summarize": counts by tool/file/session for a date range
 *
 *   Backed by .jaewon/traces/YYYY-MM-DD.jsonl files written by file-tracker.
 *   Designed for the synthesizer (/jaewon-evolve) to consume without
 *   re-reading raw JSONL line-by-line in the main session.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const DATE_FILE_RE = /^(\d{4}-\d{2}-\d{2})(?:\.\d+)?\.jsonl$/;

function getTracesDir(paths) {
  return paths.traces || join(paths.baseDir || '.jaewon', 'traces');
}

function listTraceFiles(tracesDir) {
  if (!existsSync(tracesDir)) return [];
  return readdirSync(tracesDir)
    .filter(f => DATE_FILE_RE.test(f))
    .map(f => {
      const m = f.match(DATE_FILE_RE);
      const date = m ? m[1] : null;
      let size = 0;
      try { size = statSync(join(tracesDir, f)).size; } catch { /* ignore */ }
      return { file: f, date, size };
    })
    .sort((a, b) => b.file.localeCompare(a.file));
}

function readEntries(tracesDir, files, limit) {
  const entries = [];
  for (const f of files) {
    let raw = '';
    try { raw = readFileSync(join(tracesDir, f.file), 'utf-8'); } catch { continue; }
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try { entries.push(JSON.parse(line)); } catch { /* skip bad line */ }
      if (entries.length >= limit) return entries;
    }
  }
  return entries;
}

function summarize(entries) {
  const byTool = {};
  const byFile = {};
  const bySession = {};
  let earliest = null;
  let latest = null;
  for (const e of entries) {
    if (e.tool) byTool[e.tool] = (byTool[e.tool] || 0) + 1;
    if (e.file) byFile[e.file] = (byFile[e.file] || 0) + 1;
    if (e.session_id) bySession[e.session_id] = (bySession[e.session_id] || 0) + 1;
    if (e.ts) {
      if (!earliest || e.ts < earliest) earliest = e.ts;
      if (!latest || e.ts > latest) latest = e.ts;
    }
  }
  // Top-N for files (typically the long-tail dimension)
  const topFiles = Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  return {
    total: entries.length,
    earliest,
    latest,
    by_tool: byTool,
    by_session: bySession,
    top_files: topFiles
  };
}

export function registerTracesTools(server, paths) {
  server.tool(
    'jaewon_traces',
    'Read or summarize the file-edit trace feed (.jaewon/traces/YYYY-MM-DD.jsonl). Use action="list" to discover available dates, action="read" for raw entries, action="summarize" for aggregate counts.',
    {
      action: {
        type: 'string',
        enum: ['list', 'read', 'summarize'],
        description: 'list | read | summarize'
      },
      date: {
        type: 'string',
        description: 'Optional date filter, YYYY-MM-DD. Limits read/summarize to that day.'
      },
      limit: {
        type: 'number',
        description: 'Max entries to read (default 200, hard cap 5000).'
      }
    },
    async ({ action, date, limit }) => {
      const tracesDir = getTracesDir(paths);
      const action_ = action || 'list';
      const all = listTraceFiles(tracesDir);

      if (action_ === 'list') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ files: all }, null, 2) }]
        };
      }

      const filtered = date ? all.filter(f => f.date === date) : all;
      if (filtered.length === 0) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ entries: [], note: 'no trace files matched' }) }]
        };
      }

      const cap = Math.min(Math.max(limit || 200, 1), 5000);

      if (action_ === 'read') {
        const entries = readEntries(tracesDir, filtered, cap);
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: entries.length, entries }, null, 2) }]
        };
      }

      if (action_ === 'summarize') {
        const entries = readEntries(tracesDir, filtered, cap);
        const summary = summarize(entries);
        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `unknown action: ${action_}` }) }]
      };
    }
  );
}
