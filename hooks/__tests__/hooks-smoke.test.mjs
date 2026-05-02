#!/usr/bin/env node
/**
 * hooks-smoke.test.mjs — Verifiable side-effect smoke test for hooks
 *
 * Runs each hook script with a synthetic stdin payload and asserts the
 * corresponding line appears in .jaewon/hook-trace.jsonl. This catches
 * the silent-no-op class of bug (matcher dedup, isMain symlink, dead
 * import) at smoke-test time instead of in production.
 *
 * Run with: node hooks/__tests__/hooks-smoke.test.mjs
 * Exits 0 on pass, 1 on fail.
 *
 * NOTE: This test confirms the hook scripts themselves work when invoked.
 * It does NOT confirm Claude Code dispatches them. For dispatch verification,
 * tail .jaewon/hook-trace.jsonl during a real session and check that each
 * registered hook produces an entry.
 */
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = resolve(HERE, '..');

const CASES = [
  {
    name: 'pre-tool-enforcer',
    script: 'pre-tool-enforcer.mjs',
    payload: { tool_input: { command: 'echo hello' } }
  },
  {
    name: 'stop-guard',
    script: 'stop-guard.mjs',
    payload: { stop_hook_active: false }
  },
  {
    name: 'teammate-dispatcher',
    script: 'teammate-dispatcher.mjs',
    payload: { teammate_id: 'tm-test-1' }
  },
  {
    name: 'subagent-tracker',
    script: 'subagent-tracker.mjs',
    payload: { last_assistant_message: 'Task [p1-t1] complete', agent_type: 'implementer' }
  },
  {
    name: 'test-tracker',
    script: 'test-tracker.mjs',
    payload: { tool_input: { command: 'npm test' } }
  }
];

function setupSandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'jaewon-hooks-smoke-'));
  mkdirSync(join(dir, '.jaewon'), { recursive: true });
  // Minimal settings/status so hooks that depend on them don't crash.
  writeFileSync(
    join(dir, '.jaewon', 'settings.json'),
    JSON.stringify({
      base_dir: '.jaewon',
      paths: {
        status: '.jaewon/status.json',
        plans: 'docs/plans',
        context: '.jaewon/context',
        session_log: '.jaewon/session-log.md'
      }
    }, null, 2)
  );
  writeFileSync(
    join(dir, '.jaewon', 'status.json'),
    JSON.stringify({ plan: {}, hud: {} }, null, 2)
  );
  return dir;
}

function runHook(scriptPath, payload, sandboxDir) {
  const augmented = { ...payload, cwd: sandboxDir };
  const result = spawnSync('node', [scriptPath], {
    input: JSON.stringify(augmented),
    encoding: 'utf-8',
    timeout: 5000
  });
  return result;
}

function readTrace(sandboxDir) {
  const path = join(sandboxDir, '.jaewon', 'hook-trace.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

let pass = 0;
let fail = 0;
const failures = [];

for (const c of CASES) {
  const sandbox = setupSandbox();
  const scriptPath = join(HOOKS_DIR, c.script);
  const result = runHook(scriptPath, c.payload, sandbox);

  // The hook is allowed to exit non-zero (e.g., stop-guard intentionally
  // exits non-zero to block). We only care about the side-effect.
  const traces = readTrace(sandbox);
  const matched = traces.find(t => t.hook === c.name);
  if (matched) {
    pass += 1;
    console.log(`PASS  ${c.name} — trace line emitted`);
  } else {
    fail += 1;
    failures.push({
      name: c.name,
      stderr: result.stderr,
      stdout: result.stdout,
      traces
    });
    console.log(`FAIL  ${c.name} — no trace line found`);
  }

  rmSync(sandbox, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailure detail:');
  for (const f of failures) {
    console.log(`\n--- ${f.name} ---`);
    if (f.stderr) console.log(`stderr: ${f.stderr.slice(0, 400)}`);
    if (f.stdout) console.log(`stdout: ${f.stdout.slice(0, 400)}`);
    console.log(`traces seen: ${JSON.stringify(f.traces.map(t => t.hook))}`);
  }
  process.exit(1);
}
process.exit(0);
