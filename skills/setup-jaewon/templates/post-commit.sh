#!/usr/bin/env bash
# .git/hooks/post-commit installed by jaewon-plugin setup-jaewon.
#
# This wrapper finds the plugin's post-commit-scribe.mjs in the Claude Code
# plugin cache and runs it. Exits silently if the plugin isn't found or
# .jaewon/ isn't initialized — never breaks the user's git workflow.
#
# Why a native git hook: PostToolUse:Bash does not dispatch reliably in
# Claude Code (see jaewon-plugin/hooks/CLAUDE.md). The post-commit work
# must run from git, not from Claude Code, so manual `git commit` from
# the terminal still records.

# Skip if .jaewon/ isn't initialized in this repo
if [ ! -d .jaewon ]; then
  exit 0
fi

# Locate the plugin in Claude Code's cache. Look for the most recent version.
PLUGIN_ROOT=""
CACHE_BASE="$HOME/.claude/plugins/cache/jaewon-plugin/jaewon-plugin"
if [ -d "$CACHE_BASE" ]; then
  # Pick the highest version directory (sorts naturally as v0.1, v0.2, ..., v0.10)
  PLUGIN_ROOT=$(ls -1 "$CACHE_BASE" 2>/dev/null | sort -V | tail -n 1)
  if [ -n "$PLUGIN_ROOT" ]; then
    PLUGIN_ROOT="$CACHE_BASE/$PLUGIN_ROOT"
  fi
fi

# Fallback: env var override (useful for dev / non-cache installs)
if [ -n "$JAEWON_PLUGIN_ROOT" ] && [ -d "$JAEWON_PLUGIN_ROOT" ]; then
  PLUGIN_ROOT="$JAEWON_PLUGIN_ROOT"
fi

if [ -z "$PLUGIN_ROOT" ] || [ ! -f "$PLUGIN_ROOT/hooks/post-commit-scribe.mjs" ]; then
  exit 0
fi

# Run the scribe. Suppress its output unless DEBUG_JAEWON_HOOK is set.
if [ -n "$DEBUG_JAEWON_HOOK" ]; then
  node "$PLUGIN_ROOT/hooks/post-commit-scribe.mjs"
else
  node "$PLUGIN_ROOT/hooks/post-commit-scribe.mjs" >/dev/null 2>&1
fi

exit 0
