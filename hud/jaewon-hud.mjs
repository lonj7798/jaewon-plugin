#!/usr/bin/env node
/**
 * jaewon-hud.mjs — Statusline script for Claude Code
 *
 * Output format:
 *   [GREEN] v0.2 | dev ● | 3/8 done | 5h:[■■■■□□□□]52%(2h31m) wk:[■□□□□□□□]10%(6d20h) | session:45m | ctx:[■■■■■□□□□□]47% | opus
 *
 * Receives JSON on stdin from Claude Code with context_window, model, transcript_path.
 * Reads .jaewon/status.json for project state.
 * Fetches rate limits from OAuth API (cached).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, execFileSync } from 'child_process';
import https from 'https';

// ============================================================================
// Constants
// ============================================================================
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const WARN_THRESHOLD = 70;
const CRIT_THRESHOLD = 90;
const USAGE_CACHE_TTL_MS = 30_000; // 30s cache for rate limits

// ============================================================================
// Stdin
// ============================================================================
function readStdinSync() {
  if (process.stdin.isTTY) return {};
  try {
    const chunks = [];
    const buf = Buffer.alloc(65536);
    let n;
    try { while ((n = readSync(0, buf, 0, buf.length)) > 0) chunks.push(buf.slice(0, n)); } catch { /**/ }
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const stdin = readStdinSync();
const cwd = stdin.cwd || process.cwd();

// ============================================================================
// Color helpers
// ============================================================================
function pctColor(pct) {
  if (pct >= CRIT_THRESHOLD) return RED;
  if (pct >= WARN_THRESHOLD) return YELLOW;
  return GREEN;
}

function bar(pct, width = 8) {
  const filled = Math.round((pct / 100) * width);
  return '■'.repeat(filled) + '□'.repeat(width - filled);
}

function colorize(color, text) {
  const codes = { RED, GREEN, YELLOW, BLUE: '\x1b[34m', PURPLE: '\x1b[35m', MAGENTA: '\x1b[35m', CYAN: '\x1b[36m', WHITE: '\x1b[37m', ORANGE: '\x1b[33m' };
  return `${codes[color] || ''}${text}${RESET}`;
}

// ============================================================================
// .jaewon/status.json
// ============================================================================
function readStatus() {
  const settingsPath = join(cwd, '.jaewon', 'settings.json');
  let baseDir = '.jaewon';
  if (existsSync(settingsPath)) {
    try { baseDir = JSON.parse(readFileSync(settingsPath, 'utf-8')).base_dir || '.jaewon'; } catch { /**/ }
  }
  const p = join(cwd, baseDir, 'status.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

// ============================================================================
// Checklist
// ============================================================================
function readChecklist(status) {
  if (!status?.plan?.checklist_path) return null;
  const p = join(cwd, status.plan.checklist_path);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function taskCounts(checklist) {
  if (!checklist?.phases) return null;
  const tasks = checklist.phases.flatMap(p => p.tasks || []);
  return {
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    total: tasks.length
  };
}

// ============================================================================
// Git
// ============================================================================
function getGit() {
  try {
    const branch = execSync('git branch --show-current 2>/dev/null', { cwd, encoding: 'utf-8', timeout: 2000 }).trim();
    let dirty = false;
    try { dirty = execSync('git status --porcelain 2>/dev/null', { cwd, encoding: 'utf-8', timeout: 2000 }).trim().length > 0; } catch { /**/ }
    return { branch, dirty };
  } catch { return { branch: null, dirty: false }; }
}

// ============================================================================
// Context window
// ============================================================================
function getContext() {
  if (stdin.context_window?.used != null && stdin.context_window?.total) {
    return Math.min(100, Math.round((stdin.context_window.used / stdin.context_window.total) * 100));
  }
  return null;
}

// ============================================================================
// Model
// ============================================================================
function getModel() {
  const id = stdin.model?.id || stdin.model?.display_name || (typeof stdin.model === 'string' ? stdin.model : null);
  if (!id) return null;
  const m = id.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return id.split('/').pop().split('-')[0];
}

// ============================================================================
// Rate limits (OAuth API with cache)
// ============================================================================
function getUsageCachePath() {
  const dir = join(cwd, '.jaewon');
  return join(dir, '.usage-cache.json');
}

function getCachedUsage() {
  try {
    const p = getUsageCachePath();
    if (!existsSync(p)) return null;
    const cache = JSON.parse(readFileSync(p, 'utf-8'));
    if (Date.now() - cache.timestamp < USAGE_CACHE_TTL_MS) return cache.data;
    return null;
  } catch { return null; }
}

function saveCachedUsage(data) {
  try {
    const p = getUsageCachePath();
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(p, JSON.stringify({ timestamp: Date.now(), data }));
  } catch { /**/ }
}

function fetchUsageSync() {
  // Try cache first
  const cached = getCachedUsage();
  if (cached) return cached;

  // Read OAuth token
  let accessToken = null;
  try {
    if (process.platform === 'darwin') {
      const raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf-8', timeout: 3000 }).trim();
      const creds = JSON.parse(raw);
      accessToken = creds?.claudeAiOauth?.accessToken;
    }
  } catch { /**/ }

  if (!accessToken) {
    try {
      const credPath = join(process.env.HOME || '', '.claude', '.credentials.json');
      if (existsSync(credPath)) {
        const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
        accessToken = creds?.claudeAiOauth?.accessToken;
      }
    } catch { /**/ }
  }

  if (!accessToken) return null;

  // Sync HTTP request via child process
  try {
    const script = `
      const https = require('https');
      const req = https.get('https://api.anthropic.com/api/oauth/usage', {
        headers: { 'Authorization': 'Bearer ${accessToken}', 'User-Agent': 'jaewon-hud/1.0' },
        timeout: 5000
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => process.stdout.write(d));
      });
      req.on('error', () => process.exit(1));
    `;
    const raw = execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { encoding: 'utf-8', timeout: 6000 });
    const usage = JSON.parse(raw);

    const data = {
      fiveHour: Math.min(100, Math.round((usage.five_hour?.utilization || 0) * 100)),
      fiveHourReset: usage.five_hour?.resets_at || null,
      weekly: Math.min(100, Math.round((usage.seven_day?.utilization || 0) * 100)),
      weeklyReset: usage.seven_day?.resets_at || null
    };
    saveCachedUsage(data);
    return data;
  } catch { return null; }
}

function formatResetTime(isoDate) {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d${hrs % 24}h`;
  return `${hrs}h${mins % 60}m`;
}

// ============================================================================
// Session duration
// ============================================================================
function getSessionDuration(status) {
  if (!status?.session?.last_start) return null;
  const start = new Date(status.session.last_start).getTime();
  const mins = Math.round((Date.now() - start) / 60000);
  if (mins < 0 || mins > 1440) return null; // sanity
  return mins;
}

// ============================================================================
// TDD color
// ============================================================================
function getTDDColor(status, counts) {
  if (status?.hud?.overall_color) return status.hud.overall_color;
  if (!status?.plan?.phase) return 'WHITE';
  if (status.plan.phase === 'plan') return 'BLUE';
  if (status.plan.phase === 'debug') return 'PURPLE';
  if (status.plan.phase === 'review') return 'YELLOW';
  if (!counts) return 'WHITE';
  if (counts.blocked > 0 && counts.done + counts.blocked === counts.total) return 'ORANGE';
  if (counts.done === counts.total) return 'GREEN';
  return 'GREEN';
}

// ============================================================================
// Render
// ============================================================================
const status = readStatus();
const checklist = readChecklist(status);
const git = getGit();
const ctxPct = getContext();
const model = getModel();
const counts = taskCounts(checklist);
const tddColor = getTDDColor(status, counts);
const usage = fetchUsageSync();
const sessionMins = getSessionDuration(status);

const parts = [];

// [COLOR] badge
parts.push(colorize(tddColor, `[${tddColor}]`));

// Plan version
if (status?.plan?.current_version) parts.push(status.plan.current_version);

// Git branch + dirty
if (git.branch) parts.push(`${git.branch}${git.dirty ? ` ${YELLOW}●${RESET}` : ''}`);

// Task progress
if (counts) {
  let s = `${counts.done}/${counts.total} done`;
  if (counts.blocked > 0) s += ` ${RED}${counts.blocked} blocked${RESET}`;
  parts.push(s);
}

// Rate limits: 5h + weekly
if (usage) {
  const fhPct = usage.fiveHour;
  const fhReset = formatResetTime(usage.fiveHourReset);
  const fhColor = pctColor(fhPct);
  let fh = `5h:${fhColor}[${bar(fhPct)}]${fhPct}%${RESET}`;
  if (fhReset) fh += `${DIM}(${fhReset})${RESET}`;

  const wkPct = usage.weekly;
  const wkReset = formatResetTime(usage.weeklyReset);
  const wkColor = pctColor(wkPct);
  let wk = `wk:${wkColor}[${bar(wkPct)}]${wkPct}%${RESET}`;
  if (wkReset) wk += `${DIM}(${wkReset})${RESET}`;

  parts.push(`${fh} ${wk}`);
}

// Session duration
if (sessionMins != null) {
  const sColor = sessionMins > 120 ? RED : sessionMins > 60 ? YELLOW : GREEN;
  parts.push(`session:${sColor}${sessionMins}m${RESET}`);
}

// Context window
if (ctxPct != null) {
  const cColor = pctColor(ctxPct);
  let ctx = `ctx:${cColor}[${bar(ctxPct, 10)}]${ctxPct}%${RESET}`;
  if (ctxPct >= 90) ctx += ` ${RED}CRITICAL${RESET}`;
  else if (ctxPct >= 75) ctx += ` ${YELLOW}COMPRESS?${RESET}`;
  parts.push(ctx);
}

// Model
if (model) parts.push(model);

process.stdout.write(parts.join(' | '));
