#!/usr/bin/env node
/**
 * subagent-start.mjs — Update status when agent starts working
 *
 * CALLING SPEC:
 *   Runs on SubagentStart hook event.
 *   Sets active_task and phase in status.json so HUD reflects current work.
 *   Side effects: Reads/writes filesystem
 */
import { readStdin } from './lib/stdin.mjs';
import { getSettings } from './lib/settings.mjs';
import { readStatus, saveStatus } from './lib/state.mjs';

async function main() {
  const input = await readStdin(3000);
  let data = {};
  try { data = JSON.parse(input); } catch { /* empty */ }

  const agentType = data.agent_type || '';
  const projectDir = data.cwd || process.cwd();
  const settings = getSettings(projectDir);
  const status = readStatus(settings, projectDir);

  // Determine phase from agent type
  const phaseMap = {
    'planner': 'plan', 'architect': 'plan', 'critic': 'plan',
    'test-generator': 'implement', 'implementer': 'implement',
    'tracer': 'debug', 'fixer': 'debug',
    'reviewer': 'review', 'wiki-maintainer': 'wiki',
    'git-manager': 'git'
  };

  // Extract agent name from subagent_type (e.g., "jaewon-plugin:planner" → "planner")
  const agentName = agentType.includes(':') ? agentType.split(':').pop() : agentType;
  const phase = phaseMap[agentName] || status.plan?.phase || null;

  // Update status
  if (phase) {
    status.plan = { ...status.plan, phase };
  }
  status.hud = {
    ...status.hud,
    active_task: data.agent_id || agentName || null,
    overall_color: phase === 'plan' ? 'BLUE'
      : phase === 'debug' ? 'PURPLE'
      : phase === 'review' ? 'YELLOW'
      : phase === 'implement' ? 'GREEN'
      : status.hud?.overall_color || 'WHITE',
    last_updated: new Date().toISOString()
  };

  saveStatus(settings, projectDir, status);

  // Inject context about what's starting
  if (agentName) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `Agent started: ${agentName} (phase: ${phase || 'unknown'})`
      }
    }));
  }
}

main().catch(() => process.exit(0));
