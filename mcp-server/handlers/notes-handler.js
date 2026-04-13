/**
 * notes-handler.js — Notes and plan save MCP tools
 *
 * CALLING SPEC:
 *   registerNotesTools(server, paths) -> void
 *   Registers jaewon_note_add and jaewon_plan_save tools.
 *   Side effects: Registers MCP tools
 *
 *   jaewon_note_add: Appends a note to .jaewon/notes/{topic}.md
 *   jaewon_plan_save: Saves a plan document to docs/plans/v{X.Y}/{filename}
 */
import { join } from 'path';
import { appendMarkdown } from '../lib/file-ops.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export function registerNotesTools(server, paths) {
  // jaewon_note_add — Append a note to a topic file
  server.tool(
    'jaewon_note_add',
    'Append a timestamped note to .jaewon/notes/{topic}.md. Creates the topic file if it does not exist.',
    {
      topic: {
        type: 'string',
        description: 'Topic name for the note (becomes the filename, e.g., "architecture" -> notes/architecture.md)'
      },
      content: {
        type: 'string',
        description: 'The note content to append (markdown supported)'
      }
    },
    async ({ topic, content }) => {
      if (!topic || !content) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Both topic and content are required' }) }]
        };
      }

      const sanitized = topic.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const notesDir = paths.notes || join(paths.baseDir, 'notes');
      const filePath = join(notesDir, `${sanitized}.md`);

      const timestamp = new Date().toISOString();
      const entry = `### ${timestamp}\n\n${content}`;

      appendMarkdown(filePath, entry);

      return {
        content: [{ type: 'text', text: JSON.stringify({ saved: true, path: filePath, topic: sanitized }) }]
      };
    }
  );

  // jaewon_plan_save — Save a plan document to a versioned plan directory
  server.tool(
    'jaewon_plan_save',
    'Save a plan document to docs/plans/v{version}/{filename}. Creates the version directory if it does not exist.',
    {
      version: {
        type: 'string',
        description: 'Plan version (e.g., "0.1", "1.0"). Used as directory name: docs/plans/v{version}/'
      },
      filename: {
        type: 'string',
        description: 'Filename for the plan document (e.g., "00-overview.md", "checklist.json")'
      },
      content: {
        type: 'string',
        description: 'The plan document content to save'
      }
    },
    async ({ version, filename, content }) => {
      if (!version || !filename || !content) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'version, filename, and content are all required' }) }]
        };
      }

      const sanitizedVersion = version.replace(/[^a-zA-Z0-9._-]/g, '');
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
      const plansDir = paths.plans || join(paths.projectDir, 'docs', 'plans');
      const versionDir = join(plansDir, `v${sanitizedVersion}`);
      const filePath = join(versionDir, sanitizedFilename);

      // Create version directory if needed
      if (!existsSync(versionDir)) {
        mkdirSync(versionDir, { recursive: true });
      }

      writeFileSync(filePath, content, 'utf-8');

      return {
        content: [{ type: 'text', text: JSON.stringify({ saved: true, path: filePath, version: sanitizedVersion, filename: sanitizedFilename }) }]
      };
    }
  );
}
