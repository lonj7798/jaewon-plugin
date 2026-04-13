---
name: insights
description: Analyze Claude Code usage patterns and generate an HTML dashboard report. Reads session data, extracts metadata, performs AI analysis, and produces an interactive report. Keywords: insights, usage, analytics, report.
---

<Purpose>
Insights analyzes Claude Code usage patterns across sessions and generates an HTML dashboard report. It reads session data, extracts metadata (tools used, languages, tokens, timestamps), performs AI analysis on each session, and produces an interactive HTML report saved to ~/.claude/usage-data/report.html.
</Purpose>

<Use_When>
- User says "insights", "usage", "analytics", "report", "what did we learn"
- User wants to understand their Claude Code usage patterns
- User wants to see which tools and languages they use most
- User wants to identify friction points and wins
</Use_When>

<Do_Not_Use_When>
- User wants project-specific learnings -- read `.jaewon/insights.md` directly
- User wants session state -- use `status` skill
- User wants to debug a specific session -- use `debug` skill
</Do_Not_Use_When>

<Execution_Policy>
- Read-only on session data -- never modify session files
- Generate report in a single pass -- do not iterate
- Use AI analysis sparingly -- batch sessions for efficiency
- Report is self-contained HTML -- no external dependencies
</Execution_Policy>

<Steps>

## Step 1: Read Session Data
Scan `~/.claude/projects/` and `~/.claude/usage-data/` for session data. For each session, locate transcripts, tool usage records, token data, and timestamps. Skip empty/corrupted files. Report: total sessions, date range, data completeness.

## Step 2: Extract Metadata
Read [metadata-spec.md](${CLAUDE_SKILL_DIR}/references/metadata-spec.md) for the full metadata extraction table (11 fields) and AI analysis facets.
Extract per-session fields and compute aggregates (totals, rankings, averages).

## Step 3: AI Analysis
Analyze each session (or batched groups) for: Goal, Friction, Outcome, Patterns, Efficiency. Produce per-session summaries (2-3 sentences) and cross-session insights.

## Step 4: Generate HTML Report
Read [html-template.md](${CLAUDE_SKILL_DIR}/references/html-template.md) for the HTML report structure with all 8 sections.
Generate a self-contained HTML file with inline CSS/JS. Dark theme, inline SVG charts, no external dependencies.

## Step 5: Save and Open
1. Save to `~/.claude/usage-data/report.html` (create directory if needed)
2. Open in browser: `open` (macOS) or `xdg-open` (Linux)
3. Report the file path to the user

</Steps>

<Tool_Usage>
- `Read` for session data files in `~/.claude/projects/` and `~/.claude/usage-data/`
- `Glob` for discovering session directories and files
- `Grep` for extracting tool usage patterns and error patterns from transcripts
- `Write` for generating the HTML report file
- `Bash` for opening the report in a browser
</Tool_Usage>

<Examples>
<Good>
[Scans 47 sessions across 3 projects] -> [Extracts: 12 hours total, 85% Bash/Read/Write, 60% TypeScript] -> [Finds: 3 sessions with high friction] -> [Generates report with charts] -> [Opens in browser]
Why good: Comprehensive analysis, actionable output, opens automatically.
</Good>
<Bad>
[Reads only the last 3 sessions]
Why bad: Insights need broad data. Analyze all available sessions for meaningful patterns.
</Bad>
</Examples>

<Final_Checklist>
- [ ] All available session data scanned
- [ ] Metadata extracted for each session
- [ ] AI analysis completed with per-session summaries
- [ ] HTML report generated with all 8 sections
- [ ] Report is self-contained (no external dependencies)
- [ ] Report saved to `~/.claude/usage-data/report.html`
- [ ] Report opened in browser
</Final_Checklist>

Task: {{ARGUMENTS}}
