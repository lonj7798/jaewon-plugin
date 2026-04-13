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
- User wants project-specific learnings — read `.jaewon/insights.md` directly
- User wants session state — use `status` skill
- User wants to debug a specific session — use `debug` skill
</Do_Not_Use_When>

<Execution_Policy>
- Read-only on session data — never modify session files
- Generate report in a single pass — do not iterate
- Use AI analysis sparingly — batch sessions for efficiency
- Report is self-contained HTML — no external dependencies
</Execution_Policy>

<Steps>

## Step 1: Read Session Data

1. Scan `~/.claude/projects/` for session directories
2. Scan `~/.claude/usage-data/` for any existing usage metadata
3. For each session, locate:
   - Session transcript or log file
   - Tool usage records
   - Token usage data
   - Timestamps (start, end, duration)
4. Skip sessions with no meaningful data (empty or corrupted files)
5. Report: total sessions found, date range, data completeness

## Step 2: Extract Metadata

For each session, extract:

| Field | Source | Description |
|-------|--------|-------------|
| session_id | Directory name | Unique session identifier |
| start_time | First timestamp | When the session started |
| end_time | Last timestamp | When the session ended |
| duration | Computed | End - Start time |
| tools_used | Tool calls | List of tools invoked with counts |
| languages | File extensions | Programming languages touched |
| tokens_in | Usage data | Input tokens consumed |
| tokens_out | Usage data | Output tokens generated |
| files_read | Read calls | Files accessed |
| files_written | Write/Edit calls | Files created or modified |
| errors | Error patterns | Errors encountered |

Aggregate across sessions:
- Total sessions, total duration, total tokens
- Most-used tools (ranked by invocation count)
- Most-used languages (ranked by file count)
- Average session length
- Sessions per day/week

## Step 3: AI Analysis

For each session (or batched groups of similar sessions), analyze:

| Facet | Question |
|-------|----------|
| Goal | What was the user trying to accomplish? |
| Friction | Where did the user get stuck or retry? |
| Outcome | Was the goal achieved? Partially? Not at all? |
| Patterns | What workflow patterns emerged? |
| Efficiency | Were appropriate tools used, or were there workarounds? |

Produce a per-session summary (2-3 sentences) and cross-session insights.

## Step 4: Generate HTML Report

Generate a self-contained HTML file with inline CSS and JavaScript. Reference pattern: `~/.claude/usage-data/report.html`.

### Report Sections

**At a Glance**
- Total sessions, total hours, total tokens
- Date range of analyzed data
- Top 3 tools, top 3 languages

**What You Work On**
- Project breakdown (sessions per project)
- Language distribution (pie or bar chart using inline SVG)
- File activity heatmap (most-read and most-written files)

**How You Use Claude Code**
- Tool usage distribution (bar chart)
- Average session duration over time
- Token usage trends (input vs output)
- Peak usage times (hour of day, day of week)

**Wins**
- Sessions that achieved their goal efficiently
- Notable accomplishments (large refactors, complex debugging, feature completions)
- Time saved estimates (where applicable)

**Friction Points**
- Sessions with high retry counts
- Common error patterns
- Tools that are underutilized vs overutilized
- Patterns that suggest workarounds for missing features

**Features to Try**
- Claude Code features detected as unused based on session patterns
- Skills or agents that could have helped in past sessions
- Workflow optimizations suggested by usage patterns

**Patterns**
- Recurring workflow sequences (e.g., Read -> Grep -> Edit)
- Time-of-day productivity patterns
- Session length sweet spots (most productive session durations)

**Horizon**
- Trends over time (getting faster? using more advanced features?)
- Projected usage based on current patterns
- Suggestions for next steps in Claude Code mastery

### HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Claude Code Insights</title>
  <style>/* Inline CSS — dark theme, responsive layout */</style>
</head>
<body>
  <nav><!-- Section links --></nav>
  <main>
    <section id="at-a-glance"><!-- Summary cards --></section>
    <section id="work"><!-- Project and language charts --></section>
    <section id="usage"><!-- Tool and token charts --></section>
    <section id="wins"><!-- Accomplishments --></section>
    <section id="friction"><!-- Pain points --></section>
    <section id="features"><!-- Suggestions --></section>
    <section id="patterns"><!-- Workflow analysis --></section>
    <section id="horizon"><!-- Trends and projections --></section>
  </main>
  <script>/* Inline JS — chart rendering, interactivity */</script>
</body>
</html>
```

Use inline SVG for charts. No external CDN dependencies. Dark theme with accent colors.

## Step 5: Save and Open

1. Save the report to `~/.claude/usage-data/report.html`
2. Create `~/.claude/usage-data/` directory if it does not exist
3. Open the report in the default browser: `open ~/.claude/usage-data/report.html` (macOS) or `xdg-open` (Linux)
4. Report the file path to the user

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
```
[Scans 47 sessions across 3 projects]
[Extracts: 12 hours total, 85% Bash/Read/Write, 60% TypeScript]
[Finds: 3 sessions with high friction (auth debugging)]
[Generates report with charts and actionable insights]
[Opens in browser]
```
Why good: Comprehensive analysis, actionable output, opens automatically.
</Good>

<Bad>
```
[Reads only the last 3 sessions]
```
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
