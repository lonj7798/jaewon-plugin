# Session Metadata Specification

## Per-Session Metadata Extraction

For each session, extract these fields:

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

## Aggregate Metrics

Compute across all sessions:
- Total sessions, total duration, total tokens
- Most-used tools (ranked by invocation count)
- Most-used languages (ranked by file count)
- Average session length
- Sessions per day/week

## AI Analysis Facets

For each session (or batched groups of similar sessions), analyze:

| Facet | Question |
|-------|----------|
| Goal | What was the user trying to accomplish? |
| Friction | Where did the user get stuck or retry? |
| Outcome | Was the goal achieved? Partially? Not at all? |
| Patterns | What workflow patterns emerged? |
| Efficiency | Were appropriate tools used, or were there workarounds? |

Produce a per-session summary (2-3 sentences) and cross-session insights.
