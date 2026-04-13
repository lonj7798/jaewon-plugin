/**
 * session-helpers.mjs — Shared helpers for session lifecycle hooks
 *
 * CALLING SPEC:
 *   writeHandoff(settings, projectDir, data) -> void
 *   Writes .jaewon/context/handoff.md with current state.
 *   Side effects: Writes filesystem
 *
 *   appendSessionLog(settings, projectDir, data) -> void
 *   Appends session entry to .jaewon/session-log.md.
 *   Side effects: Writes filesystem
 *
 *   branch = getCurrentBranch(projectDir) -> string | null
 *   Returns current git branch name or null.
 *   Side effects: Spawns git process
 */
import { existsSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

export function writeHandoff(settings, projectDir, data) {
  const contextDir = join(projectDir, settings.paths.context);
  if (!existsSync(contextDir)) {
    mkdirSync(contextDir, { recursive: true });
  }

  const handoffPath = join(contextDir, 'handoff.md');
  const lines = [];

  lines.push(`# Handoff — ${data.timestamp}`);
  lines.push('');
  lines.push('## Current State');
  lines.push(`- Plan: ${data.version}, Phase: ${data.phase}, Branch: ${data.branch}`);
  lines.push('');

  if (data.completedTasks && data.completedTasks.length > 0) {
    lines.push('## Completed (this session)');
    for (const t of data.completedTasks) {
      lines.push(`- ${t.id}: ${t.title || t.name || 'untitled'}`);
    }
    lines.push('');
  }

  if (data.pendingTasks && data.pendingTasks.length > 0) {
    lines.push('## Pending');
    for (const t of data.pendingTasks) {
      const blockedNote = t.status === 'blocked' ? ' [BLOCKED]' : '';
      const inProgressNote = t.status === 'in_progress' ? ' [IN PROGRESS]' : '';
      lines.push(`- ${t.id}: ${t.title || t.name || 'untitled'}${blockedNote}${inProgressNote}`);
    }
    lines.push('');
  }

  if (data.blocked && data.blocked.length > 0) {
    lines.push('## Blockers');
    for (const b of data.blocked) {
      lines.push(`- ${b.task_id || b.id || 'unknown'}: ${b.reason || b.description || 'no reason'}`);
    }
    lines.push('');
  }

  writeFileSync(handoffPath, lines.join('\n'), 'utf-8');
}

export function appendSessionLog(settings, projectDir, data) {
  const logPath = join(projectDir, settings.paths.session_log || join(settings.base_dir, 'session-log.md'));
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const entry = [
    `## Session #${data.sessionNum} — ${data.start} to ${data.end}`,
    `Plan: ${data.version}, Tasks completed: ${data.tasksCompleted}, Branch: ${data.branch}`,
    ''
  ].join('\n');

  if (!existsSync(logPath)) {
    writeFileSync(logPath, `# Session Log\n\n${entry}\n`, 'utf-8');
  } else {
    appendFileSync(logPath, `\n${entry}\n`, 'utf-8');
  }
}

export function getCurrentBranch(projectDir) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}
