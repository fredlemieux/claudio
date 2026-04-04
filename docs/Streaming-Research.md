# Streaming Research: Claudio Real-Time Output

> Research date: 2026-04-04
> Goal: Replace `Command.create().execute()` (waits for full response) with real-time streaming

---

## Current State

`useClaude.ts` uses `Command.create("claude", args).execute()` which buffers the entire stdout and only returns when the process exits. For a Claude response that takes 30-120 seconds, the user sees nothing until it is completely done.

The CLI already supports `--output-format stream-json` which emits NDJSON (one JSON object per line) to stdout in real time. The Event-Model.md documents the full taxonomy of these events.

---

## Approaches Investigated

### 1. Tauri Shell Plugin `spawn()` with stdout Events (RECOMMENDED)

**How it works:** `Command.create("claude", args).spawn()` returns a `Child` handle and emits events via `command.stdout.on('data', line => ...)`. The Tauri shell plugin's Rust implementation reads stdout through `BufReader::lines()`, delivering one line at a time to the JS event listener via Tauri's Channel IPC. Since `--output-format stream-json` produces NDJSON (one JSON object per newline), each `data` event is exactly one parseable JSON event.

**Evidence it works:**
- The spawn implementation (from `@tauri-apps/plugin-shell/dist-js/index.js` lines 352-382) uses a `Channel` with `onmessage` that routes `Stdout` events to `this.stdout.emit('data', payload)`.
- The capability config (`default.json`) already has `shell:allow-spawn` configured for the `claude` command.
- The `childRef` in `useClaude.ts` already stores a `Child` reference for kill support -- the spawn pattern was clearly anticipated.

**Previous developer concern:** "spawn() with stream-json doesn't deliver events for long-running processes in Tauri 2." This was likely caused by one of two things:
1. **stdout buffering in the child process.** Claude Code uses Node.js which, when stdout is a pipe (not a TTY), buffers output in 64KB chunks by default. However, `--output-format stream-json` explicitly flushes after each JSON line (the codebase has `streamJsonStdoutGuard.ts` that ensures clean NDJSON output). This should not be an issue.
2. **Missing `shell:allow-spawn` permission.** If only `shell:allow-execute` was configured, `spawn()` calls would silently fail or error. The current config has both permissions, so this is resolved.

**Verdict:** This is the right approach. It requires zero Rust changes, uses only the existing Tauri shell plugin, and the data format (NDJSON) aligns perfectly with line-by-line delivery.

---

### 2. Rust-Side Streaming Bridge (Tauri Command + Events)

**How it works:** Write a custom Tauri command in Rust that spawns `claude` via `tokio::process::Command`, reads stdout line by line with `BufReader`, and emits each line to the frontend via `app.emit("claude-event", payload)`.

**Pros:**
- Full control over buffering, backpressure, and error handling
- Can parse JSON on the Rust side and emit typed events
- Can implement reconnection / process supervision

**Cons:**
- Significant Rust code to write and maintain (50-100 lines minimum)
- Duplicates what the shell plugin already does
- Adds `tokio` dependency to the Tauri backend
- The Architecture.md envisions the Rust layer as a "bridge" but the shell plugin already IS that bridge for this use case

**Verdict:** Overkill for now. Worth revisiting only if the shell plugin approach has real buffering issues in practice.

---

### 3. Claude Agent SDK `embed` Export

**How it works:** Import `@anthropic-ai/claude-agent-sdk/embed` and use `query()` which returns an `AsyncIterator` with typed streaming events. No process spawning needed -- the SDK manages the Claude Code lifecycle internally.

**Status:** The SDK is not currently installed in Claudio (`node_modules/@anthropic-ai/` does not exist). The Architecture.md lists this as the "primary" integration path, and the Event-Model.md notes it as "preferred."

**Pros:**
- Official, purpose-built for embedding Claude Code
- Typed events, no NDJSON parsing needed
- `query()` returns `AsyncIterator` with `includePartialMessages: true`
- Multi-turn session management built in
- V2 Session API (`send()` / `stream()`) for persistence

**Cons:**
- The SDK embed export runs Claude Code as a Node.js library, NOT as a subprocess. This means it needs Node.js runtime access from within the Tauri webview, which Tauri does not provide (webview is a browser context, not Node).
- To use `embed`, you would need to run it on the Rust side (via `deno_core` or a sidecar Node process), which defeats the simplicity advantage.
- Alternatively, the `bridge` export connects to a *running* Claude Code process -- but that requires the user to have Claude Code running separately, adding UX complexity.

**Verdict:** The SDK embed is the long-term ideal (as Architecture.md states), but it requires significant infrastructure (Rust-side Node runtime or sidecar process). It is not the right first step. The shell plugin spawn approach gives us streaming TODAY while we build toward SDK integration.

---

### 4. Tauri Sidecar

**How it works:** Bundle `claude` as a Tauri sidecar binary. Uses `Command.sidecar()` instead of `Command.create()`.

**Verdict:** Not applicable. Claude Code is installed globally via npm and auto-updates. Bundling it as a sidecar would freeze the version and bloat the app. The current `Command.create("claude", ...)` approach that resolves from PATH is correct.

---

## Recommended Approach: Shell Plugin spawn() + stream-json

Switch from `execute()` to `spawn()` with `--output-format stream-json`. Each stdout line is a complete JSON event that maps directly to the Event-Model taxonomy.

### Code Sketch

```typescript
import { Command, type Child } from "@tauri-apps/plugin-shell";

interface StreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  [key: string]: unknown;
}

// Inside sendMessage():
const baseArgs = [
  "-p", trimmed,
  "--output-format", "stream-json",
  "--model", model,
];
const args = claudeSessionId
  ? [...baseArgs, "--resume", claudeSessionId]
  : baseArgs;

const command = Command.create("claude", args, cwd ? { cwd } : undefined);

// --- Wire up streaming event handlers BEFORE spawn ---

// Each 'data' event is one NDJSON line = one complete JSON object
command.stdout.on("data", (line: string) => {
  if (!line.trim()) return;

  try {
    const event: StreamEvent = JSON.parse(line);
    handleStreamEvent(event);
  } catch {
    addLog("warn", "stdout", `Non-JSON line: ${line.slice(0, 100)}`);
  }
});

command.stderr.on("data", (line: string) => {
  addLog("error", "stderr", line);
});

command.on("close", (payload) => {
  childRef.current = null;
  setIsStreaming(false);
  addLog("info", "process", `Process exited: code=${payload.code}`);
});

command.on("error", (error) => {
  addLog("error", "process", `Process error: ${error}`);
  setIsStreaming(false);
});

// --- Spawn the process ---
const child = await command.spawn();
childRef.current = child;


// --- Event handler ---
function handleStreamEvent(event: StreamEvent) {
  switch (event.type) {
    case "system":
      if (event.subtype === "init") {
        addLog("info", "system", `Session init: model=${event.model}`);
      }
      // Handle task_started, task_progress, task_notification for agents
      break;

    case "assistant": {
      // Complete assistant message -- extract text content
      const msg = event.message as { content?: Array<{ type: string; text?: string }> };
      const text = msg?.content
        ?.filter((b: { type: string }) => b.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("") ?? "";
      updateContent(text);
      break;
    }

    case "stream_event": {
      // Partial streaming token -- append to current content
      // event.event is a RawMessageStreamEvent (Anthropic API type)
      const streamEvt = event.event as {
        type: string;
        delta?: { type: string; text?: string };
      };
      if (streamEvt.type === "content_block_delta" && streamEvt.delta?.text) {
        appendContent(streamEvt.delta.text);
      }
      break;
    }

    case "tool_progress":
      // Update tool call indicators
      handleToolProgress(event);
      break;

    case "result": {
      // Session complete -- final cost/duration
      if (event.session_id) {
        setClaudeSessionId(sessionId!, event.session_id as string);
      }
      const costUsd = (event.total_cost_usd ?? event.cost_usd) as number | undefined;
      const durationMs = (event.duration_ms) as number | undefined;
      finalizeMessage(costUsd, durationMs);
      break;
    }

    case "rate_limit_event":
      // Surface rate limit info in UI
      break;

    default:
      addLog("debug", "stream", `Unhandled event: ${event.type}/${event.subtype ?? ""}`);
  }
}

// Helper: append partial tokens without full re-render
let contentBuffer = "";
function appendContent(delta: string) {
  contentBuffer += delta;
  // Debounce UI updates to ~60fps
  requestAnimationFrame(() => {
    updateContent(contentBuffer);
  });
}
```

### Key Differences from Current Code

| Aspect | Current (`execute()`) | Proposed (`spawn()`) |
|--------|----------------------|---------------------|
| Output format | `--output-format json` | `--output-format stream-json` |
| Data delivery | Single blob after exit | Line-by-line during execution |
| User sees response | After 30-120s | Within 1-2s (first token) |
| Tool visibility | None during execution | Real-time tool progress events |
| Agent visibility | None | Real-time task_started/progress |
| Kill support | Works but user waits | Works and user sees partial output |

---

## Known Gotchas

1. **Buffering edge case.** If Claude Code's Node process has its stdout buffering overridden (e.g., by a parent shell or CI environment), lines may arrive in chunks rather than one-at-a-time. The parser should handle partial lines by buffering until a newline is seen. In practice, `stream-json` mode flushes per-line, so this is unlikely but worth defending against.

2. **`stream_event` is high-frequency.** During token generation, `stream_event` fires per-token (potentially hundreds per second). The code sketch above uses `requestAnimationFrame` debouncing. For production, consider batching deltas in a ref and flushing on rAF, rather than calling `updateContent` (which triggers React state updates) per token.

3. **`--include-partial-messages` flag.** The CLI has this flag which includes partial message chunks within `assistant` events. Without it, `assistant` events only fire when the full message is complete. For real-time streaming, use `stream_event` for partial tokens and `assistant` for the final complete message. Do NOT use `--include-partial-messages` -- it is redundant with `stream_event` and adds noise.

4. **Session ID is in the `result` event.** Unlike the current JSON output format where `session_id` is in the top-level response, in stream-json it arrives in the `result` event at the very end. The session sidebar should show "new session" until the result event provides the ID.

5. **Error events.** If Claude Code crashes mid-stream, the `close` event fires with a non-zero exit code but there may be no `result` event. The `close` handler must detect this and show an error state. Check `payload.code !== 0 && payload.signal === null` for crashes vs `payload.signal !== null` for kills.

6. **`CLAUDECODE` environment variable.** Claude Code refuses to start if the `CLAUDECODE` env var is set (prevents nesting). If Claudio itself is launched from within a Claude Code session during development, you will need to unset this variable in the spawn options: `{ cwd, env: { CLAUDECODE: '' } }`.

7. **Line splitting in Tauri shell.** The Tauri shell plugin's Rust side uses `BufReader::lines()` which splits on `\n`. Each `data` event should be one complete line. However, if a JSON event contains literal newlines in string values (unlikely in NDJSON but possible in error messages), it could split incorrectly. The NDJSON spec guarantees one object per line with no embedded newlines, so Claude Code's output should be safe.

---

## Migration Path

1. **Phase 1 (this PR):** Switch `execute()` to `spawn()` + `stream-json`. Parse `stream_event` for real-time text. Parse `result` for session ID and cost. Keep existing UI, just make it stream.

2. **Phase 2:** Add tool progress indicators using `tool_progress` events. Show what Claude is doing (reading files, writing code) in real time.

3. **Phase 3:** Add agent tracking using `task_started` / `task_progress` / `task_notification` events. Populate the Agent Drawer.

4. **Phase 4 (long-term):** Evaluate SDK embed integration. This would replace the subprocess approach entirely but requires Rust-side Node runtime or a sidecar architecture.

---

*Research by Marcus Webb, 2026-04-04*
