#!/usr/bin/env node
/**
 * jaewon-hud.mjs — Statusline script for Claude Code
 *
 * CALLING SPEC:
 *   Receives JSON on stdin from Claude Code: { context_window, model, cwd, ... }
 *   Reads .jaewon/status.json for project state
 *   Reads git status for branch + dirty indicator
 *   Outputs formatted statusline to stdout
 *   Side effects: Reads filesystem only
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// --- Read stdin from Claude Code ---
function readStdinSync() {
  try {
    const chunks = [];
    const buf = Buffer.alloc(65536);
    let bytesRead;
    try {
      while ((bytesRead = require('fs').readSync(0, buf, 0, buf.length)) > 0) {
        chunks.push(buf.slice(0, bytesRead));
      }
    } catch { /* EOF or no data */ }
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const stdin = readStdinSync();
const cwd = stdin.cwd || process.cwd();

// --- Read .jaewon/status.json ---
function readStatus() {
  const settingsPath = join(cwd, '.jaewon', 'settings.json');
  let baseDir = '.jaewon';
  if (existsSync(settingsPath)) {
    try {
      const s = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      baseDir = s.base_dir || '.jaewon';
    } catch { /* use default */ }
  }
  const statusPath = join(cwd, baseDir, 'status.json');
  if (!existsSync(statusPath)) return null;
  try {
    return JSON.parse(readFileSync(statusPath, 'utf-8'));
  } catch {
    return null;
  }
}

// --- Read checklist ---
function readChecklist(status) {
  if (!status?.plan?.checklist_path) return null;
  const p = join(cwd, status.plan.checklist_path);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

// --- Git info ---
function getGit() {
  try {
    const branch = execSync('git branch --show-current 2>/dev/null', { cwd, encoding: 'utf-8' }).trim();
    let dirty = false;
    try {
      const st = execSync('git status --porcelain 2>/dev/null', { cwd, encoding: 'utf-8' }).trim();
      dirty = st.length > 0;
    } catch { /* ignore */ }
    return { branch, dirty };
  } catch {
    return { branch: null, dirty: false };
  }
}

// --- Context % from stdin ---
function getContext() {
  if (stdin.context_window_percent != null) return stdin.context_window_percent;
  if (stdin.context_window && stdin.context_window.used != null && stdin.context_window.total) {
    return Math.round((stdin.context_window.used / stdin.context_window.total) * 100);
  }
  return null;
}

// --- Model from stdin ---
function getModel() {
  if (stdin.model) {
    const m = stdin.model.toLowerCase();
    if (m.includes('opus')) return 'opus';
    if (m.includes('sonnet')) return 'sonnet';
    if (m.includes('haiku')) return 'haiku';
    return stdin.model.split('/').pop().split('-')[0];
  }
  return null;
}

// --- Task counts from checklist ---
function getTaskCounts(checklist) {
  if (!checklist?.phases) return null;
  const tasks = checklist.phases.flatMap(p => p.tasks || []);
  return {
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    total: tasks.length
  };
}

// --- TDD color from status ---
function getTDDColor(status, counts) {
  if (!status?.plan?.phase) return 'WHITE';
  if (status.plan.phase === 'plan') return 'BLUE';
  if (status.hud?.overall_color) return status.hud.overall_color;
  if (!counts) return 'WHITE';
  if (counts.blocked > 0 && counts.done + counts.blocked === counts.total) return 'ORANGE';
  if (counts.done === counts.total) return 'GREEN';
  return 'GREEN';
}

// --- Context bar ---
function contextBar(pct) {
  if (pct == null) return '';
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  let color = '\x1b[32m'; // green
  if (pct > 70) color = '\x1b[33m'; // yellow
  if (pct > 90) color = '\x1b[31m'; // red
  return `ctx:${color}${pct}%${bar}\x1b[0m`;
}

// --- Color code for TDD phase ---
function colorize(color, text) {
  const codes = {
    RED: '\x1b[31m', GREEN: '\x1b[32m', YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m', PURPLE: '\x1b[35m', MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m', WHITE: '\x1b[37m', ORANGE: '\x1b[33m'
  };
  return `${codes[color] || ''}${text}\x1b[0m`;
}

// --- Build statusline ---
const status = readStatus();
const checklist = readChecklist(status);
const git = getGit();
const ctxPct = getContext();
const model = getModel();
const counts = getTaskCounts(checklist);
const tddColor = getTDDColor(status, counts);

const parts = [];

// TDD color badge
parts.push(colorize(tddColor, `[${tddColor}]`));

// Plan version
if (status?.plan?.current_version) {
  parts.push(status.plan.current_version);
}

// Git branch + dirty
if (git.branch) {
  parts.push(`${git.branch}${git.dirty ? ' ●' : ''}`);
}

// Task progress
if (counts) {
  let taskStr = `${counts.done}/${counts.total} done`;
  if (counts.blocked > 0) taskStr += ` ${counts.blocked} blocked`;
  if (counts.in_progress > 0) taskStr += ` ${counts.in_progress} active`;
  parts.push(taskStr);
}

// Context usage
const ctxStr = contextBar(ctxPct);
if (ctxStr) parts.push(ctxStr);

// Model
if (model) parts.push(model);

// Output
process.stdout.write(parts.join(' | '));
