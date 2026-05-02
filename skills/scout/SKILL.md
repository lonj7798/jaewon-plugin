---
name: scout
description: Codebase onboarding skill. Produces a structured scout-report.md (directory map, where-to-start, conventions, gotchas) on first entry into an unfamiliar repo. Uses retrieval-agent under the hood for parallel multi-lane exploration. Keywords: scout, onboard, get oriented, explore repo, what is this project.
---

<Purpose>
First entry into an unfamiliar repo restarts cold every time — re-reading the same files, re-discovering the same conventions, re-learning the same gotchas. This skill produces a one-time `scout-report.md` artifact that acts as a permanent orientation note: directory map, where to start reading, project conventions, known gotchas. Subsequent sessions read the report instead of re-exploring.
</Purpose>

<Use_When>
- User says "scout", "onboard", "get oriented", "what is this project", "explore"
- First entry into a repo where `docs/wiki/` and prior session-log don't yet exist
- After a major restructure that invalidates prior orientation
</Use_When>

<Do_Not_Use_When>
- The repo already has a recent `docs/wiki/scout-report.md` (≤30 days) — read it instead
- The repo is the user's primary project (they already know it)
- A specific lookup question — use `/jaewon-plugin:retrieve` instead
</Do_Not_Use_When>

<Execution_Policy>
- The scout report is one-shot per repo (regenerate on major restructure, not for incremental changes)
- Use `retrieval-agent` for the multi-lane exploration so the main session doesn't bloat with raw grep/read output
- Output goes to `docs/wiki/scout-report.md` (not `.jaewon/` — it's a durable repo artifact)
- Sections must be concrete: actual file paths, actual conventions, actual gotchas — not generic templates
</Execution_Policy>

<Steps>

## Step 1: Detect Project Type
Read top-level files: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `README.md`, `CLAUDE.md`, `AGENTS.md`. Identify language(s), build system, test framework. One-line summary.

## Step 2: Spawn Retrieval-Agent (Parallel Multi-Lane)

Brief:
> Scout this repo for first-time orientation. I need:
> 1. Directory map: top-level dirs + their purpose, in 1 sentence each (max 12 entries)
> 2. Where to start reading: the 5 most important files for understanding the architecture, ordered by entry-point > core > supporting
> 3. Conventions: code style, import ordering, error handling, test layout (any patterns visible from 3+ files)
> 4. Gotchas: things that surprised the agent during exploration — non-obvious dependencies, naming traps, files that look generic but aren't
> 5. Active areas: which dirs have most-recent commits (`git log --since='30 days ago' --name-only | sort | uniq -c | sort -rn | head -10`)
>
> Return a compact answer with refs. No file dumps.

## Step 3: Validate the Result
Confirm the agent returned the 5 sections with concrete refs. If any section is empty or generic, request a tighter rewrite once.

## Step 4: Compose scout-report.md
Format:

```md
# Scout Report — {project name}

**Generated:** {YYYY-MM-DD}
**Stack:** {language(s) + build + tests}

## 1. One-Line Project Description
{from README / CLAUDE.md, or inferred}

## 2. Directory Map
| Dir | Purpose |
|-----|---------|
| `{dir}` | {one sentence} |

## 3. Where to Start
1. `{file}` — {why this is the entry point}
2. `{file}` — {why this is core}
3. ... (up to 5)

## 4. Conventions
- **Code style:** {observed pattern with refs}
- **Imports:** {ordering / aliasing observed}
- **Error handling:** {pattern observed}
- **Tests:** {layout + framework + naming convention}

## 5. Gotchas
- {non-obvious thing}, see `{file:line}`

## 6. Active Areas (last 30 days)
- `{dir}` — {N commits}

## 7. Open Questions
- {anything the scout couldn't resolve from local sources alone}
```

## Step 5: Write and Hand-Off
Write `docs/wiki/scout-report.md`. Tell the user:
> Scout report written to `docs/wiki/scout-report.md`. Future sessions can read this file instead of re-exploring. Regenerate after major restructures.

</Steps>

<Tool_Usage>
- `Agent` (subagent_type: `retrieval-agent`) for the multi-lane exploration
- `Bash` for `git log --since=...` and basic project-type detection (`ls`, `cat package.json`)
- `Read` for top-level files (README, CLAUDE.md, AGENTS.md, package.json)
- `Write` for the final `docs/wiki/scout-report.md`
- Do NOT do the exploration yourself — that defeats the context-savings of retrieval-agent
</Tool_Usage>

<Examples>
<Good>
[Detect: Node + TS + Vitest] -> [Spawn retrieval-agent with the 5-section brief] -> [Receive compact answer with refs] -> [Compose scout-report.md, 80 lines, every section has concrete refs] -> [Write to docs/wiki/]
Why good: One-shot artifact; future sessions read it instead of re-exploring.
</Good>
<Bad>
[Skip retrieval-agent, run 8 Grep calls in main session, then summarize]
Why bad: Search trail bloats main-session context — exactly what retrieval-agent was built to prevent.
</Bad>
</Examples>

<Final_Checklist>
- [ ] Project type detected from top-level config files
- [ ] retrieval-agent spawned with 5-section brief
- [ ] Result has concrete refs in every section (no generic templates)
- [ ] scout-report.md written to `docs/wiki/scout-report.md`
- [ ] User told where to find it and when to regenerate
</Final_Checklist>

Task: {{ARGUMENTS}}
