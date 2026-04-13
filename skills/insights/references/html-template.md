# HTML Report Template

The insights report is a self-contained HTML file with inline CSS and JavaScript. No external CDN dependencies. Dark theme with accent colors.

## File Location

Save to: `~/.claude/usage-data/report.html`
Create `~/.claude/usage-data/` directory if it does not exist.

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Claude Code Insights</title>
  <style>/* Inline CSS -- dark theme, responsive layout */</style>
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
  <script>/* Inline JS -- chart rendering, interactivity */</script>
</body>
</html>
```

Use inline SVG for charts. No external CDN dependencies. Dark theme with accent colors.

## Report Sections

### At a Glance
- Total sessions, total hours, total tokens
- Date range of analyzed data
- Top 3 tools, top 3 languages

### What You Work On
- Project breakdown (sessions per project)
- Language distribution (pie or bar chart using inline SVG)
- File activity heatmap (most-read and most-written files)

### How You Use Claude Code
- Tool usage distribution (bar chart)
- Average session duration over time
- Token usage trends (input vs output)
- Peak usage times (hour of day, day of week)

### Wins
- Sessions that achieved their goal efficiently
- Notable accomplishments (large refactors, complex debugging, feature completions)
- Time saved estimates (where applicable)

### Friction Points
- Sessions with high retry counts
- Common error patterns
- Tools that are underutilized vs overutilized
- Patterns that suggest workarounds for missing features

### Features to Try
- Claude Code features detected as unused based on session patterns
- Skills or agents that could have helped in past sessions
- Workflow optimizations suggested by usage patterns

### Patterns
- Recurring workflow sequences (e.g., Read -> Grep -> Edit)
- Time-of-day productivity patterns
- Session length sweet spots (most productive session durations)

### Horizon
- Trends over time (getting faster? using more advanced features?)
- Projected usage based on current patterns
- Suggestions for next steps in Claude Code mastery
