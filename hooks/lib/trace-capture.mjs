/**
 * trace-capture.mjs — File-edit trace appender for the learning loop
 *
 * CALLING SPEC:
 *   captureTrace(projectDir, event) -> void
 *   Appends one JSONL line to .jaewon/traces/YYYY-MM-DD.jsonl describing
 *   a Write/Edit event. Input shape:
 *     { tool: 'Write'|'Edit', file: string, session_id?: string, extra?: object }
 *   Side effects: Appends to filesystem
 *   Fail-open: any error is swallowed.
 *
 * WHY THIS EXISTS:
 *   The synthesizer (Phase 4) needs an event feed: which files changed,
 *   in which session, when. Reading raw git history is too coarse — it
 *   misses intra-session decisions. The traces fill that gap.
 *
 * SIZE CAP:
 *   Each daily file is rotated when it exceeds 5MB (renamed with a numeric
 *   suffix). Daily granularity keeps queries cheap; 5MB is enough for a
 *   normal day of edits.
 *
 * NOT FOR:
 *   - Persistence beyond the current evolve cycle (`/jaewon-evolve` consumes
 *     and may prune the feed).
 *   - Audit logs of who-did-what; that's git's job.
 */
import { existsSync, mkdirSync, appendFileSync, statSync, renameSync } from 'fs';
import { join } from 'path';

const MAX_BYTES = 5_000_000;

export function captureTrace(projectDir, event = {}) {
  if (!projectDir) return;
  try {
    const tracesDir = join(projectDir, '.jaewon', 'traces');
    if (!existsSync(tracesDir)) mkdirSync(tracesDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    let path = join(tracesDir, `${date}.jsonl`);

    if (existsSync(path)) {
      try {
        const size = statSync(path).size;
        if (size > MAX_BYTES) {
          let suffix = 1;
          while (existsSync(join(tracesDir, `${date}.${suffix}.jsonl`))) suffix += 1;
          renameSync(path, join(tracesDir, `${date}.${suffix}.jsonl`));
        }
      } catch { /* ignore rotation errors */ }
    }

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      tool: event.tool || 'unknown',
      file: event.file || null,
      session_id: event.session_id || null,
      ...(event.extra ? { extra: event.extra } : {})
    }) + '\n';
    appendFileSync(path, line, 'utf-8');
  } catch {
    // Fail-open
  }
}
