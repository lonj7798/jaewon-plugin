/**
 * review-evidence.mjs — Read/write the review-evidence ledger
 *
 * CALLING SPEC:
 *   recordReviewEvidence(projectDir, entry) -> void
 *   Append one JSONL entry to .jaewon/review-evidence.jsonl.
 *   Side effects: Appends to filesystem
 *
 *   readReviewEvidence(projectDir) -> Entry[]
 *   Read all current entries (most recent at the end).
 *   Side effects: Reads filesystem
 *
 *   resetReviewEvidence(projectDir) -> void
 *   Truncate the evidence file (called by post-commit-scribe after a
 *   successful commit lands).
 *   Side effects: Writes filesystem
 *
 *   { ok, reason, structural, deep } = checkReviewEvidence(projectDir, options)
 *   Verify that fresh structural + deep review evidence exists.
 *   options: { maxAgeMinutes: number, requireBothPasses: boolean }
 *
 * ENTRY SHAPE:
 *   { ts: ISO8601, pass: "structural"|"deep", verdict: "APPROVE"|"REQUEST_CHANGES",
 *     files: string[], issue_counts: {critical, major, minor}, agent: string }
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

function evidencePath(projectDir) {
  return join(projectDir, '.jaewon', 'review-evidence.jsonl');
}

export function recordReviewEvidence(projectDir, entry) {
  if (!projectDir || !entry) return;
  const baseDir = join(projectDir, '.jaewon');
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  const line = JSON.stringify({
    ts: entry.ts || new Date().toISOString(),
    pass: entry.pass,
    verdict: entry.verdict,
    files: entry.files || [],
    issue_counts: entry.issue_counts || { critical: 0, major: 0, minor: 0 },
    agent: entry.agent || null
  }) + '\n';
  appendFileSync(evidencePath(projectDir), line, 'utf-8');
}

export function readReviewEvidence(projectDir) {
  const path = evidencePath(projectDir);
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function resetReviewEvidence(projectDir) {
  const path = evidencePath(projectDir);
  try {
    writeFileSync(path, '', 'utf-8');
  } catch {
    // Fail-open
  }
}

export function checkReviewEvidence(projectDir, options = {}) {
  const maxAgeMinutes = options.maxAgeMinutes ?? 30;
  const requireBothPasses = options.requireBothPasses ?? true;
  const cutoff = Date.now() - maxAgeMinutes * 60_000;

  const all = readReviewEvidence(projectDir);
  const fresh = all.filter(e => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) && t >= cutoff;
  });

  const structural = fresh.find(e => e.pass === 'structural');
  const deep = fresh.find(e => e.pass === 'deep');

  if (requireBothPasses) {
    if (!structural) return { ok: false, reason: 'no fresh structural review evidence', structural, deep };
    if (!deep) return { ok: false, reason: 'no fresh deep review evidence', structural, deep };
  } else if (!structural && !deep) {
    return { ok: false, reason: 'no fresh review evidence (structural or deep)', structural, deep };
  }

  for (const ev of [structural, deep].filter(Boolean)) {
    if (ev.verdict === 'REQUEST_CHANGES') {
      return { ok: false, reason: `${ev.pass} review verdict was REQUEST_CHANGES`, structural, deep };
    }
  }

  return { ok: true, structural, deep };
}
