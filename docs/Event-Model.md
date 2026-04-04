> 🧭 **Navigate:** [[PAI GUI Project]] · [[PAI GUI Architecture]] · [[PAI GUI Wireframes]] · [[PAI GUI Build Plan]]

# Claude Code Stream Event Model

> The complete taxonomy of events emitted by `claude --output-format stream-json`. This is the data contract Claudio must consume to visualize what's happening under the hood.

## How It Works

Claude Code's `--output-format stream-json` emits **newline-delimited JSON** (NDJSON) to stdout. Each line is a self-contained event with a `type` discriminant. All events carry `uuid` and `session_id` for correlation.

```
{"type":"system","subtype":"init","session_id":"abc-123",...}
{"type":"assistant","session_id":"abc-123","message":{...}}
{"type":"tool_progress","session_id":"abc-123","tool_name":"Read",...}
{"type":"result","subtype":"success","session_id":"abc-123",...}
```

---

## Event Taxonomy

### Category 1: Session Lifecycle

These events bookend a session. They're where Claudio gets metadata for the session chrome (model badge, cost counter, duration).

| Event         | Subtype                 | Key Fields                                                                                                                     | When                                                                                                                                  |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `system`      | `init`                  | `model`, `tools[]`, `mcp_servers[]`, `skills[]`, `agents[]`, `permissionMode`, `cwd`, `claude_code_version`, `fast_mode_state` | Session start — first event emitted                                                                                                   |
| `system`      | `status`                | `status` (compacting \| null), `permissionMode`                                                                                | Session state changes (e.g. context compaction starting)                                                                              |
| `system`      | `session_state_changed` | `state` (idle \| running \| requires_action)                                                                                   | Transitions between waiting for user, processing, and needing input                                                                   |
| `system`      | `compact_boundary`      | `compact_metadata` (trigger, pre_tokens, preserved_segment)                                                                    | Context window compaction occurred                                                                                                    |
| `auth_status` | —                       | `isAuthenticating`, `output[]`, `error`                                                                                        | Auth flow (API key validation, OAuth)                                                                                                 |
| `result`      | `success`               | `duration_ms`, `duration_api_ms`, `total_cost_usd`, `usage`, `modelUsage`, `num_turns`, `stop_reason`, `result`                | Session completed successfully                                                                                                        |
| `result`      | `error_*`               | Same + `errors[]`                                                                                                              | Session ended with error (`error_during_execution`, `error_max_turns`, `error_max_budget_usd`, `error_max_structured_output_retries`) |

### Category 2: Conversation Content

The core chat messages — what the user sees in the main chat view.

| Event | Key Fields | When |
|-------|------------|------|
| `user` | `message` (API message object), `isSynthetic`, `tool_use_result`, `priority` | User sent a message (or synthetic tool result) |
| `assistant` | `message` (API message object), `parent_tool_use_id`, `error` | Complete assistant response |
| `stream_event` | `event` (RawMessageStreamEvent), `parent_tool_use_id` | Partial streaming chunks during generation |
| `streamlined_text` | `text` | Simplified text content (streamlined output mode) |
| `prompt_suggestion` | `suggestion` | Predicted next user prompt |

### Category 3: Tool Execution

What Claude is *doing* — file reads, edits, bash commands, searches. This is the "under the hood" view.

| Event | Key Fields | When |
|-------|------------|------|
| `tool_progress` | `tool_use_id`, `tool_name`, `parent_tool_use_id`, `elapsed_time_seconds`, `task_id` | Tool is running (periodic heartbeat) |
| `tool_use_summary` | `summary`, `preceding_tool_use_ids[]` | Batch summary after tool calls ("Read 2 files, wrote 1 file") |
| `streamlined_tool_use_summary` | `tool_summary` | Simplified version for streamlined mode |

### Category 4: Hooks

PAI's hook system — pre/post processing on events like `UserPromptSubmit`, `PreToolUse`, etc.

| Event | Subtype | Key Fields | When |
|-------|---------|------------|------|
| `system` | `hook_started` | `hook_id`, `hook_name`, `hook_event` | Hook execution began |
| `system` | `hook_progress` | `hook_id`, `hook_name`, `stdout`, `stderr`, `output` | Hook is running (streaming output) |
| `system` | `hook_response` | `hook_id`, `hook_name`, `exit_code`, `outcome` (success \| error \| cancelled), `stdout`, `stderr` | Hook completed |

### Category 5: Tasks & Agents

Background agents and task delegation — maps to the [[PAI GUI Wireframes#Agent Drawer]].

| Event | Subtype | Key Fields | When |
|-------|---------|------------|------|
| `system` | `task_started` | `task_id`, `tool_use_id`, `description`, `task_type`, `workflow_name`, `prompt` | Agent/task spawned |
| `system` | `task_progress` | `task_id`, `description`, `usage` (total_tokens, tool_uses, duration_ms), `last_tool_name`, `summary` | Agent progress update |
| `system` | `task_notification` | `task_id`, `status`, `output_file`, `summary`, `usage` | Agent completed or status changed |

### Category 6: Rate Limits & Costs

API usage tracking — status bar indicators.

| Event | Key Fields | When |
|-------|------------|------|
| `rate_limit_event` | `rate_limit_info` (status, resetsAt, rateLimitType, utilization, overageStatus, overageResetsAt) | Rate limit state changed |

Rate limit types: `five_hour`, `seven_day`, `seven_day_opus`, `seven_day_sonnet`, `overage`

### Category 7: File & System Operations

Background system events — debug/advanced view.

| Event | Subtype | Key Fields | When |
|-------|---------|------------|------|
| `system` | `files_persisted` | `files[]` (filename, file_id), `failed[]`, `processed_at` | Files saved to disk |
| `system` | `local_command_output` | `content` | Slash command output (/voice, /cost, etc.) |
| `system` | `api_retry` | `attempt`, `max_retries`, `retry_delay_ms`, `error_status`, `error` | API call being retried |
| `system` | `post_turn_summary` | `status_category`, `title`, `description`, `is_noteworthy`, `needs_action` | Internal turn summary |
| `system` | `elicitation_complete` | `mcp_server_name`, `elicitation_id` | MCP elicitation finished |

---

## Visualization Design

### How Each Category Maps to Claudio's UI

```
┌─────────────────────────────────────────────────────────┐
│  STATUS BAR                                              │
│  [Model: opus-4-6] [Cost: $0.12] [Rate: ██░░ 65%]      │  ← Cat 1 (init) + Cat 6 (rate_limit)
│  [State: running] [Duration: 2m 14s]                     │  ← Cat 1 (session_state, result)
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MAIN CHAT VIEW (80% of screen)                          │  ← Cat 2 (user, assistant, stream_event)
│                                                          │
│  ┌─ User ──────────────────────────────────────────┐     │
│  │ Fix the auth bug in login.ts                     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─ Assistant ─────────────────────────────────────┐     │
│  │ I'll fix the authentication...                   │     │
│  │                                                  │     │
│  │ ┌─ Tool: Read ────────────────── 0.3s ─┐        │     │  ← Cat 3 (tool_progress)
│  │ │ 📄 src/auth/login.ts                  │        │     │
│  │ └──────────────────────────────────────┘        │     │
│  │                                                  │     │
│  │ ┌─ Tool: Edit ────────────────── 0.1s ─┐        │     │
│  │ │ ✏️ src/auth/login.ts (lines 42-45)    │        │     │
│  │ └──────────────────────────────────────┘        │     │
│  │                                                  │     │
│  │ [ISC: 4/6 ✓] [Agents: 2] [Phase: BUILD 4/7]    │     │  ← PAI-specific badges (parsed from assistant content)
│  └──────────────────────────────────────────────────┘     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  ACTIVITY RAIL (collapsible)                             │
│                                                          │
│  ▶ Hooks (3)                                             │  ← Cat 4
│    ✓ SessionStart:compact (0.8s)                         │
│    ⏳ CapabilityRecommender (running...)                  │
│    ✓ VoiceStateInject (0.2s)                             │
│                                                          │
│  ▶ Agents (1)                                            │  ← Cat 5
│    ⏳ Explore agent: "Find auth patterns" (12s, 4 tools) │
│                                                          │
│  ▶ System (2)                                            │  ← Cat 7
│    ℹ️ Context compacted (128k → 64k tokens)               │
│    ⚠️ API retry (attempt 2/3, 429)                        │
└─────────────────────────────────────────────────────────┘
```

### Component Proposals

| UI Component | Events Consumed | Interaction |
|-------------|----------------|-------------|
| **Session Header Bar** | `system/init`, `result` | Shows model, version, cwd. Updates with cost/duration on completion |
| **Rate Limit Gauge** | `rate_limit_event` | Progress bar with utilization %. Tooltip shows reset time. Turns amber at 80%, red at 95% |
| **State Indicator** | `system/session_state_changed` | Dot: green=idle, blue=running, amber=requires_action |
| **Chat Bubbles** | `user`, `assistant`, `stream_event` | Standard chat UI. Stream events render as typing animation |
| **Tool Accordion** | `tool_progress`, `tool_use_summary` | Inline collapsible showing tool name, file, elapsed time. Grouped by parent_tool_use_id |
| **Hook Timeline** | `system/hook_started`, `hook_progress`, `hook_response` | Vertical timeline in activity rail. Color-coded by outcome |
| **Agent Cards** | `system/task_started`, `task_progress`, `task_notification` | Cards in slide-in drawer (per [[PAI GUI Wireframes]]). Show token usage, tool count, status |
| **Compaction Banner** | `system/compact_boundary` | Inline banner: "Context compacted — older messages summarized" |
| **API Retry Toast** | `system/api_retry` | Transient notification: "Retrying API call (attempt 2/3)..." |
| **Prompt Suggestions** | `prompt_suggestion` | Chips below input field with suggested next messages |

### Event Flow Diagram

```
Session Start
    │
    ▼
system/init ──────────────────► Session Header populates
    │
    ▼
system/hook_started ──────────► Hook Timeline: new entry
system/hook_response ─────────► Hook Timeline: entry completes
    │
    ▼
user ─────────────────────────► Chat: user bubble
    │
    ▼
stream_event (tokens) ────────► Chat: assistant typing animation
    │
    ├── tool_progress ────────► Tool Accordion: progress bar
    │   tool_use_summary ─────► Tool Accordion: collapsed summary
    │
    ├── task_started ─────────► Agent Card: new card appears
    │   task_progress ────────► Agent Card: updates token/tool count
    │   task_notification ────► Agent Card: marks complete
    │
    ├── rate_limit_event ─────► Rate Limit Gauge: updates fill
    │
    ├── hook_started ─────────► Hook Timeline: new entry (mid-turn hooks)
    │   hook_response ────────► Hook Timeline: entry completes
    │
    └── compact_boundary ─────► Compaction Banner: inline marker
    │
    ▼
assistant (complete) ─────────► Chat: full assistant bubble
    │
    ▼
result/success ───────────────► Session Header: final cost/duration
```

---

## Implementation Notes

### Source Files (in `~/dev/claude-code/`)

| File | What It Defines |
|------|----------------|
| `src/entrypoints/sdk/coreSchemas.ts` | Zod schemas for ALL event types — the canonical source of truth |
| `src/entrypoints/sdk/coreTypes.ts` | TypeScript types derived from schemas |
| `src/entrypoints/sdk/controlSchemas.ts` | Control message schemas (input events) |
| `src/cli/print.ts` | How events get formatted for terminal output |
| `src/cli/structuredIO.ts` | The stream-json serializer |
| `src/utils/streamJsonStdoutGuard.ts` | Ensures clean NDJSON output (no console.log pollution) |

### Consuming in Claudio

Since Claudio uses Claude Agent SDK's `embed` export (see [[PAI GUI Architecture]]), we may get structured events directly rather than parsing NDJSON. But the event model is the same — these are the SDK's internal event types exposed through the streaming interface.

**Two consumption paths:**

1. **SDK embed** (preferred) — `@anthropic-ai/claude-agent-sdk/embed` gives typed event callbacks
2. **Process bridge** — `@anthropic-ai/claude-agent-sdk/bridge` connects to a running `claude` process and streams events
3. **Raw NDJSON** — spawn `claude -p --output-format stream-json` and parse stdout line by line

All three emit the same event types documented above.

### Key Design Decisions for Claudio

1. **Tool calls are nested** — `parent_tool_use_id` creates a tree. An agent's tools have `parent_tool_use_id` pointing to the Task tool call that spawned them. Claudio needs a tree renderer, not just a flat list.

2. **Stream events are high-frequency** — During generation, `stream_event` fires per-token. Claudio must debounce/batch these for rendering (requestAnimationFrame, not per-event React renders).

3. **Hooks fire at predictable points** — `hook_started`/`hook_response` bracket every hook. They always complete (success/error/cancelled). Claudio can show a determinate timeline for hooks.

4. **Rate limits are advisory** — `rate_limit_event` doesn't mean "stopped". It means "approaching limit". The UI should warn, not block.

5. **Result is always last** — `result` (success or error_*) is guaranteed to be the final event. Claudio can use it as the "session complete" signal.

---

*Created 2026-04-03 by Greg · Source: Claude Code v1.0.33 stream-json analysis*
