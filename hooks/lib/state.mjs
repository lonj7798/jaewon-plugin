/**
 * state.mjs — Status.json reader/writer
 *
 * CALLING SPEC:
 *   status = readStatus(settings, projectDir) -> Status
 *   Reads .jaewon/status.json. Returns defaults if missing.
 *   Side effects: Reads filesystem
 *
 *   saveStatus(settings, projectDir, status) -> void
 *   Writes status to .jaewon/status.json.
 *   Side effects: Writes filesystem
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DEFAULT_STATUS = {
  version: 1,
  project: {
    name: null,
    path: null,
    detected_stack: []
  },
  plan: {
    current_version: null,
    plan_path: null,
    checklist_path: null,
    phase: null
  },
  session: {
    current_id: null,
    last_start: null,
    last_end: null,
    total_sessions: 0
  },
  git: {
    current_branch: null,
    recent_commits: [],
    auto_manage: true
  },
  logging: {
    enabled: false,
    level: 'info',
    modules: ['*']
  },
  hud: {
    overall_color: 'WHITE',
    progress: null,
    active_task: null,
    active_phase: null,
    blocked_count: 0,
    last_updated: null
  },
  blocked: [],
  execution_mode: 'teammate_first'
};

export function readStatus(settings, projectDir) {
  const statusPath = join(projectDir, settings.paths.status);

  if (!existsSync(statusPath)) {
    return { ...DEFAULT_STATUS };
  }

  try {
    const raw = readFileSync(statusPath, 'utf-8');
    return { ...DEFAULT_STATUS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATUS };
  }
}

export function saveStatus(settings, projectDir, status) {
  const statusPath = join(projectDir, settings.paths.status);
  const dir = dirname(statusPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  status.hud.last_updated = new Date().toISOString();
  writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');
}

export { DEFAULT_STATUS };
