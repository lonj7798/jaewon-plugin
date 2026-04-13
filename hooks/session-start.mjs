#!/usr/bin/env node
/**
 * session-start.mjs — Initialize .jaewon/ directory + Phase 5 session management
 *
 * CALLING SPEC:
 *   Runs on SessionStart hook event.
 *   Creates .jaewon/ with default settings and status if missing.
 *   Idempotent — safe to run multiple times.
 *   Phase 5: Injects handoff context, checks git branch, computes HUD.
 *   Side effects: Creates directories and files
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { readStdin } from './lib/stdin.mjs';
import { getSettings, DEFAULTS } from './lib/settings.mjs';
import { readStatus, DEFAULT_STATUS } from './lib/state.mjs';
import { computeHUD, formatCompactHUD } from './lib/hud.mjs';
import { getCurrentBranch } from './lib/session-helpers.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const baseDir = join(projectDir, settings.base_dir || '.jaewon');

  // Create base directory
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // Write default settings.json if missing
  const settingsPath = join(baseDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, JSON.stringify(DEFAULTS, null, 2), 'utf-8');
  }

  // Write default status.json if missing
  const statusPath = join(projectDir, settings.paths.status);
  if (!existsSync(statusPath)) {
    const status = {
      ...DEFAULT_STATUS,
      project: {
        ...DEFAULT_STATUS.project,
        name: projectDir.split('/').pop(),
        path: projectDir
      },
      session: {
        ...DEFAULT_STATUS.session,
        last_start: new Date().toISOString(),
        total_sessions: 1
      }
    };
    writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  } else {
    // Update session start time
    const status = readStatus(settings, projectDir);
    status.session.last_start = new Date().toISOString();
    status.session.total_sessions = (status.session.total_sessions || 0) + 1;
    writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  }

  // Create subdirectories
  const subdirs = ['notes', 'blocked', 'logs', 'context', 'debug-history', 'architecture', 'metrics', 'preferences'];
  for (const sub of subdirs) {
    const subPath = join(baseDir, sub);
    if (!existsSync(subPath)) {
      mkdirSync(subPath, { recursive: true });
    }
  }

  // Create docs/wiki/ if missing
  const wikiDir = join(projectDir, 'docs', 'wiki', 'pages');
  if (!existsSync(wikiDir)) {
    mkdirSync(wikiDir, { recursive: true });
  }

  // --- Phase 5: Extended session management ---

  const status = readStatus(settings, projectDir);
  const contextParts = [
    '## jaewon-plugin initialized',
    `Project: ${status.project.name || 'unknown'}`,
    `Plan: ${status.plan?.current_version || 'none'}`,
    `Session: #${status.session.total_sessions}`
  ];

  // 1. Inject handoff context if exists
  const handoffPath = join(projectDir, settings.paths.context, 'handoff.md');
  if (existsSync(handoffPath)) {
    try {
      const handoff = readFileSync(handoffPath, 'utf-8').trim();
      if (handoff) {
        contextParts.push('');
        contextParts.push('## Previous Session Handoff');
        contextParts.push(handoff);
      }
    } catch { /* ignore read errors */ }
  }

  // 2. Git branch check
  const branch = getCurrentBranch(projectDir);
  if (branch) {
    status.git.current_branch = branch;

    if (settings.git?.auto_manage) {
      if (branch === 'main' || branch === 'master') {
        contextParts.push('');
        contextParts.push(`WARNING: On '${branch}' branch. Switch to '${settings.git.default_branch || 'dev'}' for development.`);
      }
    }
  }

  // 3. Wiki staleness check
  const wikiLogPath = join(projectDir, 'docs', 'wiki', 'log.md');
  if (existsSync(wikiLogPath)) {
    try {
      const logContent = readFileSync(wikiLogPath, 'utf-8');
      const sessionMatches = logContent.match(/Session #(\d+)/g);
      if (sessionMatches && sessionMatches.length > 0) {
        const lastLoggedSession = parseInt(sessionMatches[sessionMatches.length - 1].match(/\d+/)[0]);
        const currentSession = status.session.total_sessions || 1;
        if (currentSession - lastLoggedSession >= 3) {
          contextParts.push('');
          contextParts.push('WIKI STALE: No wiki updates in 3+ sessions. Consider spawning wiki-maintainer for a full sync.');
        }
      }
    } catch { /* ignore */ }
  }

  // 4. Compute and inject HUD
  try {
    const hud = computeHUD(settings, projectDir);
    const hudLine = formatCompactHUD(hud);
    if (hudLine) {
      contextParts.push('');
      contextParts.push(`HUD: ${hudLine}`);
    }
  } catch { /* HUD is non-critical */ }

  // Save updated git branch to status (statusPath declared above)
  try {
    writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  } catch { /* ignore */ }

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: contextParts.join('\n')
    }
  }));
}

main().catch(() => process.exit(0));
