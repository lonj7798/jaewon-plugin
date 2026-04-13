/**
 * paths.js — Settings-aware path resolution
 *
 * CALLING SPEC:
 *   paths = resolvePaths() -> Paths
 *   Reads settings.json and returns resolved absolute paths.
 *   Side effects: Reads filesystem
 *
 *   absolutePath = paths.resolve(relativePath) -> string
 *   Resolves a relative path against the project root.
 */
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const DEFAULTS = {
  base_dir: '.jaewon',
  paths: {
    status: '{base}/status.json',
    plans: 'docs/plans',
    notes: '{base}/notes',
    blocked: '{base}/blocked',
    logs: '{base}/logs',
    debug_history: '{base}/debug-history',
    context: '{base}/context'
  }
};

export function resolvePaths() {
  const projectDir = process.cwd();
  const baseDir = DEFAULTS.base_dir;
  const settingsPath = join(projectDir, baseDir, 'settings.json');

  let settings = DEFAULTS;
  if (existsSync(settingsPath)) {
    try {
      const raw = readFileSync(settingsPath, 'utf-8');
      const userSettings = JSON.parse(raw);
      settings = { ...DEFAULTS, ...userSettings, paths: { ...DEFAULTS.paths, ...(userSettings.paths || {}) } };
    } catch { /* use defaults */ }
  }

  const base = settings.base_dir || '.jaewon';
  const resolved = {};
  for (const [key, val] of Object.entries(settings.paths)) {
    const replaced = typeof val === 'string' ? val.replace(/\{base\}/g, base) : val;
    resolved[key] = join(projectDir, replaced);
  }

  return {
    ...resolved,
    projectDir,
    baseDir: join(projectDir, base),
    resolve: (relativePath) => resolve(projectDir, relativePath)
  };
}
