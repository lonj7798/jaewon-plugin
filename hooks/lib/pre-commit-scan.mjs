/**
 * pre-commit-scan.mjs — Deterministic cleanup-pattern + LOC scan over staged files
 *
 * CALLING SPEC:
 *   { issues } = scanStaged(projectDir, config?) -> { issues: Issue[] }
 *   Runs `git diff --cached --name-only --diff-filter=ACMR` to get staged
 *   files, then scans each for forbidden patterns and per-file LOC limits.
 *   Side effects: Spawns git, reads filesystem
 *   Deterministic: Yes (given the same staged files)
 *
 * Issue: { severity: "block"|"warn", file: string, line?: number,
 *          rule: string, detail: string }
 *
 * CONFIG (loaded from .jaewon/pre-commit-config.json, falls back to defaults):
 *   {
 *     "patterns": {
 *       "javascript": ["HACK","FIXME","debugger","console.log","// TODO"],
 *       "python":     ["HACK","FIXME","breakpoint()","pdb.set_trace"]
 *     },
 *     "complexity": { "maxFileLOC": 800, "maxFunctionLOC": 80 },
 *     "exemptPaths": ["docs/", ".jaewon/", "node_modules/"],
 *     "exemptExts":  [".md", ".json", ".yaml", ".yml", ".txt", ".lock"]
 *   }
 *
 * NOT FOR:
 *   - Logic checks (those are the reviewer agents' job).
 *   - Deep AST analysis (this is grep + line-count by design).
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, extname } from 'path';

const DEFAULT_CONFIG = {
  patterns: {
    javascript: ['\\bHACK\\b', '\\bFIXME\\b', '\\bdebugger\\b', 'console\\.log\\(', '// TODO\\b'],
    typescript: ['\\bHACK\\b', '\\bFIXME\\b', '\\bdebugger\\b', 'console\\.log\\(', '// TODO\\b'],
    python: ['\\bHACK\\b', '\\bFIXME\\b', '\\bbreakpoint\\(', 'pdb\\.set_trace', '# TODO\\b'],
    other: ['\\bHACK\\b', '\\bFIXME\\b']
  },
  complexity: {
    maxFileLOC: 800,
    maxFunctionLOC: 80
  },
  exemptPaths: ['docs/', '.jaewon/', 'node_modules/', '.git/', '_resources/', 'guya-plugin/'],
  exemptExts: ['.md', '.json', '.yaml', '.yml', '.txt', '.lock', '.lockb', '.log']
};

const LANG_BY_EXT = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python'
};

export function loadConfig(projectDir) {
  const configPath = join(projectDir, '.jaewon', 'pre-commit-config.json');
  if (!existsSync(configPath)) return DEFAULT_CONFIG;
  try {
    const user = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      patterns: { ...DEFAULT_CONFIG.patterns, ...(user.patterns || {}) },
      complexity: { ...DEFAULT_CONFIG.complexity, ...(user.complexity || {}) },
      exemptPaths: user.exemptPaths || DEFAULT_CONFIG.exemptPaths,
      exemptExts: user.exemptExts || DEFAULT_CONFIG.exemptExts
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function getStagedFiles(projectDir) {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: projectDir, encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isExempt(file, config) {
  if (config.exemptPaths.some(p => file.includes(p))) return true;
  const ext = extname(file).toLowerCase();
  if (config.exemptExts.includes(ext)) return true;
  return false;
}

function languageFor(file) {
  return LANG_BY_EXT[extname(file).toLowerCase()] || 'other';
}

function scanFileForPatterns(absPath, file, lang, config) {
  const issues = [];
  const patterns = (config.patterns[lang] || config.patterns.other).map(p => new RegExp(p));
  let content;
  try { content = readFileSync(absPath, 'utf-8'); } catch { return issues; }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const re of patterns) {
      if (re.test(line)) {
        issues.push({
          severity: 'block',
          file,
          line: i + 1,
          rule: `cleanup-pattern: ${re.source}`,
          detail: line.trim().slice(0, 120)
        });
      }
    }
  }
  return issues;
}

function scanFileForLOC(absPath, file, config) {
  const issues = [];
  let lineCount = 0;
  try { lineCount = readFileSync(absPath, 'utf-8').split('\n').length; } catch { return issues; }
  const maxFile = config.complexity.maxFileLOC;
  if (lineCount > maxFile) {
    issues.push({
      severity: 'block',
      file,
      rule: `loc-cap: file ${lineCount} > max ${maxFile}`,
      detail: 'split this file into smaller modules with single responsibilities'
    });
  }
  return issues;
}

export function scanStaged(projectDir, config) {
  const cfg = config || loadConfig(projectDir);
  const files = getStagedFiles(projectDir);
  const issues = [];
  for (const file of files) {
    if (isExempt(file, cfg)) continue;
    const absPath = join(projectDir, file);
    if (!existsSync(absPath)) continue;
    try {
      const stat = statSync(absPath);
      if (!stat.isFile()) continue;
    } catch { continue; }
    const lang = languageFor(file);
    issues.push(...scanFileForPatterns(absPath, file, lang, cfg));
    issues.push(...scanFileForLOC(absPath, file, cfg));
  }
  return { issues };
}
