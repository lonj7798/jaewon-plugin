#!/usr/bin/env node
/**
 * server.js — jaewon-plugin MCP Server entry point
 *
 * CALLING SPEC:
 *   Starts MCP server over stdio transport.
 *   Registers tools from handler modules.
 *   Delegates all business logic to handlers.
 *   Side effects: Starts server process
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerStatusTools } from './handlers/status-handler.js';
import { registerChecklistTools } from './handlers/checklist-handler.js';
import { registerLoggingTools } from './handlers/logging-handler.js';
import { registerDebugTools } from './handlers/debug-handler.js';
import { registerNotesTools } from './handlers/notes-handler.js';
import { registerHUDTools } from './handlers/hud-handler.js';
import { resolvePaths } from './lib/paths.js';

const server = new McpServer({
  name: 'jaewon-plugin',
  version: '0.1.0'
});

// Resolve project paths from settings
const paths = resolvePaths();

// Register all tool handlers
registerStatusTools(server, paths);
registerChecklistTools(server, paths);
registerLoggingTools(server, paths);
registerDebugTools(server, paths);
registerNotesTools(server, paths);
registerHUDTools(server, paths);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
