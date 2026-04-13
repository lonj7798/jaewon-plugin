#!/usr/bin/env node
/**
 * file-tracker.mjs — LOD compliance check + file tracking
 *
 * CALLING SPEC:
 *   Runs on PostToolUse:Write|Edit hook event.
 *   Gets file path from tool_input.
 *   Counts lines — warns if > 800 LOC.
 *   Tracks in status.json tracking.recent_files.
 *   Side effects: Reads/writes filesystem
 */
import { existsSync, readFileSync } from 'fs';
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';

const LOC_LIMIT = 800;
const MAX_RECENT_FILES = 20;

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const filePath = data.tool_input?.file_path || data.tool_input?.path || '';
  if (!filePath) {
    process.exit(0);
  }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);
  const warnings = [];

  // Count lines if file exists
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lineCount = content.split('\n').length;

      if (lineCount > LOC_LIMIT) {
        warnings.push(`LOD WARNING: ${filePath} is ${lineCount} lines (limit: ${LOC_LIMIT}). Consider splitting into smaller modules.`);
      }
    } catch { /* ignore read errors */ }
  }

  // Track recent files
  if (!status.tracking) {
    status.tracking = { recent_files: [] };
  }
  if (!status.tracking.recent_files) {
    status.tracking.recent_files = [];
  }

  // Add to front, dedupe, trim
  const recent = status.tracking.recent_files.filter(f => f !== filePath);
  recent.unshift(filePath);
  status.tracking.recent_files = recent.slice(0, MAX_RECENT_FILES);

  saveStatus(settings, projectDir, status);

  if (warnings.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: warnings.join('\n')
      }
    }));
    return;
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
