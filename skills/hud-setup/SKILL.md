---
name: hud-setup
description: Configure the jaewon-plugin HUD statusline. Shows TDD phase, plan version, git branch, task progress, context usage, and model in the terminal status bar. Use when setting up HUD, fixing HUD, or configuring statusline display.
disable-model-invocation: true
---

# HUD Setup

Configure the jaewon-plugin statusline HUD.

## What the HUD shows

```
[GREEN] v0.2 | dev ● | 3/8 done 1 blocked | ctx:45%██████░░░░ | opus
```

- **[COLOR]** — TDD phase (RED/GREEN/YELLOW/BLUE/WHITE/ORANGE)
- **v0.2** — plan version from .jaewon/status.json
- **dev ●** — git branch + dirty indicator
- **3/8 done** — task progress from checklist.json
- **ctx:45%** — context window usage with bar
- **opus** — current model

## Setup

1. Create the HUD wrapper script:

```bash
mkdir -p ~/.claude/hud
```

2. Write `~/.claude/hud/jaewon-hud.mjs`:

```javascript
#!/usr/bin/env node
// Wrapper that imports from the plugin
const { existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

// Find plugin in cache or use --plugin-dir path
const paths = [
  process.env.CLAUDE_PLUGIN_ROOT,
  join(require('os').homedir(), '.claude/plugins/cache/jaewon-plugin')
].filter(Boolean);

for (const p of paths) {
  const hud = join(p, 'hud', 'jaewon-hud.mjs');
  if (existsSync(hud)) {
    execSync(`node "${hud}"`, { stdio: ['inherit', 'inherit', 'inherit'] });
    process.exit(0);
  }
}
process.exit(0);
```

3. Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "command": "node ~/.claude/hud/jaewon-hud.mjs"
  }
}
```

4. Restart Claude Code. The HUD appears at the bottom of the terminal.

## Verify

After setup, the HUD should show on every turn. If it doesn't:
- Check `~/.claude/hud/jaewon-hud.mjs` exists
- Check `statusLine` is in `~/.claude/settings.json`
- Verify `.jaewon/status.json` exists in your project

Task: {{ARGUMENTS}}
