---
name: retrieve
description: Context-aware retrieval lane. Spawns the retrieval-agent to fetch information from project files, .jaewon/ state, docs/wiki, git/PR history, or external docs without bloating the main session with the full search trace. Returns a compact distilled answer with citations. Keywords: retrieve, lookup, recall, find context, fetch info, where is, have we seen, how does X work.
---

<Purpose>
Retrieve is the context-savings retrieval skill. Instead of letting the main session iterate on Grep/Read/web calls (which bloat conversation history and trigger early compaction), it spawns the read-only retrieval-agent in an isolated lane. The agent infers the question from a bounded recent-context slice, fans out across the right source lanes, and returns ONLY the distilled answer + citations.
</Purpose>

<Use_When>
- User asks a lookup / recall / "have we seen this?" / "how does X work?" question
- Main session is approaching compaction and needs to offload search work
- The answer might live in multiple lanes (code, .jaewon state, wiki, git history, web) and the right lane is not obvious
- A long iterative search would otherwise consume meaningful context
</Use_When>

<Do_Not_Use_When>
- The exact file/line is already known — just Read directly
- A single Grep would clearly answer it — Grep directly
- The question is actually a bug investigation — use `debug` skill
- The question is a planning decision — use `initial-plan` or `add-feature`
- The user wants to modify code — retrieval is read-only by design
</Do_Not_Use_When>

<Execution_Policy>
- Main session ORCHESTRATES only — it does not perform the retrieval itself
- Retrieval-agent runs read-only; Write and Edit are blocked
- Pass a bounded recent-context slice (last user message + the immediate question; do NOT pass the full transcript)
- Local lanes (project, .jaewon, wiki, git) are tried before external (web)
- Independent lanes fan out in parallel inside the agent
- Output is compact: short answer + ≤8 evidence bullets + refs + unknowns
</Execution_Policy>

<Steps>

## Step 1: Frame the Retrieval Question
Restate the user's request as one sentence. If the request is vague, infer the most likely intent rather than asking back — the whole point is to save the main session a clarification round-trip.

## Step 2: Build the Brief
Compose a brief for the retrieval-agent containing:
- **Question**: one-sentence retrieval target
- **Context slice**: last 1–3 user messages + the immediate code/topic at hand (bounded, not the whole transcript)
- **Hints** (optional): scope ("only this repo"), freshness ("only post-v0.2"), forbidden lanes ("no web")

## Step 3: Spawn Retrieval-Agent
Spawn the `retrieval-agent` (read-only, isolated). Pass the brief as the prompt. Do not include unrelated history.

## Step 4: Validate the Result
Confirm the returned result has:
- Question restatement and Intent tag
- Compact Answer (no inlined large file dumps)
- Evidence bullets with concrete refs (file:line / commit / URL / PR)
- Confidence rating
- Unknowns section

If the result is missing structure or pads quotes excessively, request a tighter rewrite once. Do not loop further — accept partial.

## Step 5: Inject the Distilled Result
Surface the agent's Answer + Evidence to the user. Do NOT relay the agent's internal trace, intermediate searches, or speculative considerations. The main session quotes the result; it does not replay the hunt.

## Step 6: Optional Follow-up
If the result includes a "Suggested next step", offer it to the user as a single-line option. Do not auto-execute.

</Steps>

<Tool_Usage>
- `Agent` (subagent_type: `retrieval-agent`) for spawning the retrieval lane
- `SendMessage` for teammate dispatch (preferred when teams are active); `Agent` fallback otherwise
- Do NOT run Grep/Glob/Read in the main session for this skill — that defeats the context-savings purpose
- Do NOT fetch web content in the main session — let the agent decide if web is needed
</Tool_Usage>

<Examples>
<Good>
[User: "How does the teammate dispatcher pick which agent to assign?"] -> [Build brief with question + the 2 most recent user turns] -> [Spawn retrieval-agent] -> [Agent returns: 4-sentence answer + 5 evidence bullets pointing at hooks/teammate-dispatcher.mjs and helpers] -> [Main session quotes the distilled result]
Why good: Main session does zero direct searching. Output is compact. Refs are concrete.
</Good>
<Bad>
[User asks a recall question] -> [Main session runs 6 Grep calls, reads 4 full files, then summarizes]
Why bad: The search trail is now in main-session context — the skill exists to prevent exactly this.
</Bad>
<Bad>
[Spawn retrieval-agent] -> [Agent returns 1,200 lines of grep output without distillation] -> [Main session relays it all]
Why bad: Distillation is the agent's job. Reject and request a compact rewrite, or just summarize ≤8 key bullets yourself.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Agent returns INCONCLUSIVE / "not found in any lane": present honestly; do NOT loop into a deeper search without user confirmation
- Result exceeds ~400 lines: ask the agent for a tighter rewrite once, then accept
- Agent recommends a follow-up retrieval: surface as a single suggestion, do not auto-spawn
- Question turns out to be a bug investigation: hand off to `debug` skill
- Question turns out to need code changes: hand off to `add-feature` or `implement`
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Question framed in one sentence
- [ ] Brief built with bounded context slice (not full transcript)
- [ ] Retrieval-agent spawned read-only
- [ ] Result has Intent, Answer, Evidence with refs, Confidence, Unknowns
- [ ] No inlined large file dumps in the result
- [ ] Main session relayed only the distilled answer, not the trace
- [ ] Local lanes were tried before web (or web was justified)
</Final_Checklist>

Task: {{ARGUMENTS}}
