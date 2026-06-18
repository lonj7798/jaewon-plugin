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
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { readStdin } from './lib/stdin.mjs';
import { getSettings, DEFAULTS } from './lib/settings.mjs';
import { readStatus, DEFAULT_STATUS } from './lib/state.mjs';
import { computeHUD, formatCompactHUD } from './lib/hud.mjs';
import { getCurrentBranch } from './lib/session-helpers.mjs';
import { traceHook } from './lib/hook-trace.mjs';

// ~2000 tokens at ~4 chars/token. The session-start context block displaces
// every other piece of context the LLM could be using; budget keeps it honest.
const CONTEXT_BUDGET_CHARS = 8000;
// When handoff is over-budget, keep this many leading chars and a tail note.
// Head-only because the most relevant state is at the top of a handoff
// (current state, completed/pending tasks).
const HANDOFF_HEAD_CHARS = 5000;

function truncateHandoff(handoff) {
  if (handoff.length <= HANDOFF_HEAD_CHARS) return handoff;
  const head = handoff.slice(0, HANDOFF_HEAD_CHARS);
  const droppedChars = handoff.length - HANDOFF_HEAD_CHARS;
  return head + `\n\n_[handoff truncated: ${droppedChars} more chars in .jaewon/context/handoff.md]_`;
}

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

  // 1. Inject handoff context if exists (head-truncated to stay in budget)
  const handoffPath = join(projectDir, settings.paths.context, 'handoff.md');
  if (existsSync(handoffPath)) {
    try {
      const handoff = readFileSync(handoffPath, 'utf-8').trim();
      if (handoff) {
        contextParts.push('');
        contextParts.push('## Previous Session Handoff');
        contextParts.push(truncateHandoff(handoff));
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

  // 3.5 Evolve backlog nudge — surface unsynthesized reflections so the
  // learning loop doesn't quietly stall. Manual /jaewon-plugin:evolve only;
  // no auto-fire (Guya regression history: auto-fire silently rotted for 6
  // days when API key died).
  try {
    const reflectionsDir = join(baseDir, 'reflections');
    const evolveLog = join(baseDir, 'evolve', 'log.md');
    if (existsSync(reflectionsDir)) {
      const reflectionFiles = readdirSync(reflectionsDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      let lastEvolveTs = 0;
      if (existsSync(evolveLog)) {
        try { lastEvolveTs = statSync(evolveLog).mtimeMs; } catch { /* ignore */ }
      }
      const newer = reflectionFiles.filter(f => {
        try { return statSync(join(reflectionsDir, f)).mtimeMs > lastEvolveTs; } catch { return false; }
      });
      if (newer.length >= 3) {
        contextParts.push('');
        contextParts.push(`EVOLVE BACKLOG: ${newer.length} reflections since last /jaewon-plugin:evolve. Run it to synthesize lessons into proposals.`);
      }
    }
  } catch { /* nudge is non-critical */ }

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

  // Final budget enforcement: if everything together still blows past the
  // budget (huge handoff + warnings + long HUD), hard-cap with a tail note.
  let assembled = contextParts.join('\n');
  if (assembled.length > CONTEXT_BUDGET_CHARS) {
    const overflow = assembled.length - CONTEXT_BUDGET_CHARS;
    assembled = assembled.slice(0, CONTEXT_BUDGET_CHARS) +
      `\n\n_[context capped at ${CONTEXT_BUDGET_CHARS} chars; ${overflow} more dropped to protect main-session budget]_`;
  }

  traceHook('session-start', projectDir, {
    chars: assembled.length,
    over_budget: assembled.length > CONTEXT_BUDGET_CHARS,
    has_handoff: existsSync(handoffPath)
  });

  console.log(JSON.stringify({
    systemMessage: assembled
  }));
}

main().catch(() => process.exit(0));
