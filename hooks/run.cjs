#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { resolve } = require('path');

const target = process.argv[2];
if (!target) process.exit(0);

// Resolve target, handle missing
const resolved = resolve(target);
if (!existsSync(resolved)) {
  process.exit(0); // Missing script = no-op, never block Claude
}

// Read stdin
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const input = Buffer.concat(chunks).toString('utf-8');
  const args = process.argv.slice(3);

  const result = spawnSync(process.execPath, [resolved, ...args], {
    input,
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env }
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status || 0);
});
