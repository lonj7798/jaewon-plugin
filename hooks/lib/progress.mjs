/**
 * progress.mjs — Render and persist live progress for the implement skill
 *
 * CALLING SPEC:
 *   md = renderProgress(checklist, options?) -> string
 *   Renders a markdown progress table from a checklist. Pure function.
 *   Side effects: None
 *   Deterministic: Yes
 *
 *   writeProgressFile(settings, projectDir, checklist, options?) -> string | null
 *   Writes the rendered markdown to .jaewon/progress.md. Returns the path
 *   written, or null if checklist is empty or write fails.
 *   Side effects: Writes filesystem
 *
 * STATUS GLYPHS:
 *   [✓] done        [✗] blocked
 *   [~] in_progress [ ] pending
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const GLYPH = {
  done: '[✓]',
  blocked: '[✗]',
  in_progress: '[~]',
  pending: '[ ]'
};

function glyphFor(status) {
  return GLYPH[status] || GLYPH.pending;
}

function shortCommit(extra) {
  if (!extra) return '';
  const c = extra.commit || extra.commit_hash;
  return c ? String(c).slice(0, 7) : '';
}

export function renderProgress(checklist, options = {}) {
  const phases = checklist?.phases || [];
  const ts = options.timestamp || new Date().toISOString();
  const planVersion = checklist?.plan_version || checklist?.version || 'unknown';

  const counts = { done: 0, in_progress: 0, blocked: 0, pending: 0, total: 0 };
  for (const phase of phases) {
    for (const task of (phase.tasks || [])) {
      counts.total += 1;
      counts[task.status] = (counts[task.status] || 0) + 1;
    }
  }

  const headerColor =
    counts.total > 0 && counts.done === counts.total ? 'GREEN'
      : counts.blocked > 0 && counts.pending === 0 ? 'ORANGE'
      : counts.in_progress > 0 ? 'GREEN'
      : 'WHITE';

  const lines = [];
  lines.push(`# Progress — ${planVersion}`);
  lines.push('');
  lines.push(`Updated: ${ts}`);
  lines.push(`Status: **${headerColor}** — ${counts.done}/${counts.total} done · ${counts.in_progress} in progress · ${counts.blocked} blocked · ${counts.pending} pending`);
  lines.push('');

  for (const phase of phases) {
    const tasks = phase.tasks || [];
    if (tasks.length === 0) continue;
    lines.push(`## ${phase.id || ''} ${phase.name || ''}`.trim());
    lines.push('');
    lines.push('| Task | Status | Stage | Detail |');
    lines.push('|------|--------|-------|--------|');
    for (const task of tasks) {
      const g = glyphFor(task.status);
      const id = task.id || '';
      const title = (task.title || task.name || '').replace(/\|/g, '\\|');
      const stage = task.tdd_stage || '';
      const commit = shortCommit(task);
      let detail = '';
      if (task.status === 'done' && commit) detail = `commit ${commit}`;
      else if (task.status === 'blocked') detail = task.block_reason || 'see .jaewon/blocked/';
      else if (task.status === 'in_progress') detail = task.agent_type ? `${task.agent_type} active` : 'in flight';
      lines.push(`| ${g} ${id} ${title} | ${task.status || 'pending'} | ${stage} | ${detail} |`);
    }
    lines.push('');
  }

  if (counts.total === 0) {
    lines.push('_No tasks in checklist._');
    lines.push('');
  }

  return lines.join('\n');
}

export function writeProgressFile(settings, projectDir, checklist, options = {}) {
  if (!checklist) return null;
  const baseDir = settings?.base_dir || '.jaewon';
  const progressPath = join(projectDir, baseDir, 'progress.md');
  const dir = dirname(progressPath);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const md = renderProgress(checklist, options);
    writeFileSync(progressPath, md, 'utf-8');
    return progressPath;
  } catch {
    return null;
  }
}
