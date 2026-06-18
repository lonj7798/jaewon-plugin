/**
 * hook-trace.mjs — Verifiable side-effect for every hook
 *
 * CALLING SPEC:
 *   traceHook(name, projectDir, info?) -> void
 *   Appends one JSONL line to .jaewon/hook-trace.jsonl with the hook name,
 *   timestamp, and optional info payload. Fail-open: any error is swallowed
 *   so a broken trace path never blocks a hook's primary work.
 *   Side effects: Appends to filesystem
 *
 * WHY THIS EXISTS:
 *   Silent rot is the dominant failure mode for hook-based enforcement.
 *   A registered hook is not a running hook. A running hook that produces
 *   no observable artifact cannot be distinguished from a no-op.
 *
 *   Every hook calls traceHook() at the start of its main flow. The smoke
 *   test asserts the corresponding line appears for a synthetic payload.
 *   If the line never appears, the hook is silently dead — surface it,
 *   don't paper over it.
 *
 * FORMAT:
 *   { "ts": "<ISO 8601>", "hook": "<name>", "info": { ... } }
 *
 * SIZE CAP:
 *   The trace file is rotated when it exceeds 1MB (renamed with the date
 *   suffix). This is a debug/observability artifact, not a long-term log.
 */
import { existsSync, mkdirSync, appendFileSync, statSync, renameSync } from 'fs';
import { dirname, join } from 'path';

const MAX_BYTES = 1_000_000;

export function traceHook(name, projectDir, info = {}) {
  if (!name || !projectDir) return;
  try {
    const baseDir = join(projectDir, '.jaewon');
    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
    const path = join(baseDir, 'hook-trace.jsonl');

    if (existsSync(path)) {
      try {
        const size = statSync(path).size;
        if (size > MAX_BYTES) {
          const date = new Date().toISOString().slice(0, 10);
          renameSync(path, join(baseDir, `hook-trace.${date}.jsonl`));
        }
      } catch { /* ignore rotation errors */ }
    }

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      hook: name,
      info
    }) + '\n';
    appendFileSync(path, line, 'utf-8');
  } catch {
    // Fail-open: never block a hook on its own observability path
  }
}
