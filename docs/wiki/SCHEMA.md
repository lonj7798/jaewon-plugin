# Wiki Schema

Conventions for the wiki-maintainer agent. Read this before every operation.

## Directory Structure

```
docs/wiki/
├── index.md      # Auto-maintained catalog (wiki-maintainer rebuilds this)
├── log.md        # Chronological operations log (append-only)
├── SCHEMA.md     # This file — conventions and rules
└── pages/        # All wiki pages live here
```

## Page Size Limit

Pages MUST stay under 120 lines (~4K tokens). No exceptions.

## Page Header (Required)

Every page starts with:

```markdown
# Page Title
<!-- scope: what this page covers (1 line) -->
<!-- deps: [[prerequisite-pages]] if any -->
<!-- see-also: [[related-pages]] -->
```

Agents read these 4 lines to decide relevance without consuming the full body.

## Split Protocol

When a page exceeds 120 lines:

1. Create a hub page (`topic.md`) with header + summary paragraph + links to sub-pages
2. Split content into sub-pages (`topic-overview.md`, `topic-implementation.md`, etc.)
3. Each sub-page stays under 120 lines
4. Update index.md with new sub-pages

## Page Naming

- Lowercase with hyphens: `auth-middleware.md`, `decision-jwt-over-sessions.md`
- Descriptive names — the filename should tell you what the page is about
- No numbering prefixes — pages are linked, not ordered

## Wikilinks

Use `[[page-name]]` syntax (Obsidian-compatible). The page name matches the filename without `.md`:

- `[[auth-middleware]]` links to `pages/auth-middleware.md`
- `[[decision-jwt-over-sessions]]` links to `pages/decision-jwt-over-sessions.md`

## Index Format

`index.md` is a categorized catalog:

```markdown
# Wiki Index

## Modules
- [[auth-middleware]] — JWT-based request authentication
- [[user-model]] — User data model and validation

## Decisions
- [[decision-jwt-over-sessions]] — Chose JWT for stateless API

## Concepts
- [[hook-lifecycle]] — How hooks fire in Claude Code
```

Categories emerge from the pages — wiki-maintainer decides grouping.

## Log Format

`log.md` is append-only, newest at bottom:

```markdown
# Wiki Log

## [2026-04-13] Session #5 — ingest
Files updated: auth-middleware.md, user-model.md
New pages: decision-jwt-over-sessions.md
Index rebuilt.

## [2026-04-13] Session #5 — lint
Broken links: 0
Orphan pages: 1 (removed: old-draft.md)
```

## Content Guidelines

- **Be concise** — capture what matters, skip boilerplate
- **Link generously** — every concept mentioned that has (or should have) a page gets a [[wikilink]]
- **Capture the why** — decisions, tradeoffs, and rationale are more valuable than code descriptions
- **Evolve, don't replace** — add evolution sections when things change, preserving history
- **Free-form** — no rigid section templates. Structure each page as its content demands.

## What Gets a Page

| Create page for | Skip page for |
|----------------|---------------|
| Important modules (hooks, agents, services) | Trivial files (.gitkeep, configs) |
| Architectural decisions with rationale | Formatting-only changes |
| Cross-cutting concepts (patterns, flows) | Test fixture data |
| Integration points between components | Temporary/scratch files |
| Bugs with novel root causes | Routine bug fixes |

## Single Writer Rule

Only the `wiki-maintainer` agent writes to `docs/wiki/`. All other agents and the main session read only. This prevents conflicts and ensures consistent style.

Exception: `session-end.mjs` hook appends structured entries to `log.md` directly (simple timestamp + counts, no LLM reasoning needed).
