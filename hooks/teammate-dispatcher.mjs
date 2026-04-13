#!/usr/bin/env node
/**
 * teammate-dispatcher.mjs — Assign next task to idle teammate
 *
 * CALLING SPEC:
 *   Runs on TeammateIdle hook event.
 *   Reads checklist, finds next unblocked task.
 *   If found: blocks idle (exit 2), stderr describes next task.
 *   If none: allows idle (exit 0).
 *   Side effects: Reads filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readChecklist, findNextUnblocked } from './lib/checklist.mjs';
import { readStatus } from './lib/state.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const checklist = readChecklist(settings, projectDir);

  // No checklist — allow idle
  if (!checklist) {
    process.exit(0);
  }

  const next = findNextUnblocked(checklist);

  if (!next) {
    // No unblocked tasks — allow idle
    process.exit(0);
  }

  // Build task description for stderr
  const status = readStatus(settings, projectDir);
  const planDoc = status.plan?.plan_path || 'unknown';

  const description = [
    `Next task: ${next.id} — ${next.name}.`,
    next.description ? `Description: ${next.description}.` : '',
    `Plan doc: ${planDoc}.`
  ].filter(Boolean).join(' ');

  process.stderr.write(description + '\n');
  process.exit(2);
}

main().catch(() => process.exit(0));
