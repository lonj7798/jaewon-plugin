/**
 * settings.mjs — Settings loader + path resolver
 *
 * CALLING SPEC:
 *   settings = getSettings(projectDir) -> Settings
 *   Reads .jaewon/settings.json, resolves {base} templates.
 *   Returns defaults if file missing.
 *   Side effects: Reads filesystem
 *   Deterministic: Yes (same input -> same output)
 *
 *   resolved = resolvePathTemplates(settings) -> Settings
 *   Replaces {base} in all path values with settings.base_dir.
 *   Side effects: None
 *   Deterministic: Yes
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DEFAULTS = {
  version: 1,
  base_dir: '.jaewon',
  paths: {
    status: '{base}/status.json',
    session_log: '{base}/session-log.md',
    plans: 'docs/plans',
    interview: 'docs/interview',
    notes: '{base}/notes',
    blocked: '{base}/blocked',
    logs: '{base}/logs',
    debug_history: '{base}/debug-history',
    architecture: '{base}/architecture',
    metrics: '{base}/metrics',
    context: '{base}/context',
    preferences: '{base}/preferences'
  },
  git: {
    auto_manage: true,
    default_branch: 'dev',
    commit_per_task: true,
    commit_format: '{type}({phase}): {description} [{task_id}]'
  },
  execution: {
    mode: 'teammate_first',
    max_retries: 5,
    parallel_default: true
  },
  logging: {
    enabled: false,
    level: 'info',
    modules: ['*'],
    auto_disable_on_session_end: true
  },
  planning: {
    max_review_iterations: 5,
    lod_enforced: true,
    tdd_enforced: true
  }
};

export function resolvePathTemplates(settings) {
  const base = settings.base_dir || '.jaewon';
  const resolved = JSON.parse(JSON.stringify(settings));
  if (resolved.paths) {
    for (const [key, val] of Object.entries(resolved.paths)) {
      if (typeof val === 'string') {
        resolved.paths[key] = val.replace(/\{base\}/g, base);
      }
    }
  }
  return resolved;
}

export function getSettings(projectDir) {
  const baseDir = DEFAULTS.base_dir;
  const settingsPath = join(projectDir, baseDir, 'settings.json');

  if (!existsSync(settingsPath)) {
    return resolvePathTemplates(DEFAULTS);
  }

  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    const userSettings = JSON.parse(raw);
    // Merge with defaults (user overrides)
    const merged = { ...DEFAULTS, ...userSettings, paths: { ...DEFAULTS.paths, ...(userSettings.paths || {}) } };
    return resolvePathTemplates(merged);
  } catch {
    return resolvePathTemplates(DEFAULTS);
  }
}

export { DEFAULTS };
