---
prd: true
id: PRD-20260406-mid-stream-input
status: DRAFT
mode: interactive
effort_level: Extended
created: 2026-04-06
updated: 2026-04-06
---

# Mid-Stream Input: How Should Claudio Handle Typing While Streaming?

> Understanding Claude Code's input queuing behavior and designing Claudio's UX around it.

## Research Findings

### What Claude Code Actually Does

**Interactive mode (no `-p`):** Input typed while Claude is streaming gets **queued internally**. When Claude finishes, the queued message is delivered as the next turn. This causes a known problem — Claude reads your queued message as a reply to its completed output, not to what you were looking at when you typed it. GitHub issue #26388 documents this as "queued messages get misinterpreted."

**With `-p` flag (how Claudio works today):** Each invocation is a single prompt. stdin is closed immediately (`< /dev/null`). There is **no way to inject mid-stream input**. The process must complete, then a new `-p --resume SESSION_ID` call sends the next message.

**Concurrent sessions:** Resuming the same session from two processes causes interleaved messages — not corruption, but jumbled conversation. Use `--fork-session` to avoid this.

### The Channels API (Q1 2026)

Claude Code introduced **Channels** — an MCP server that pushes events into a running session in real-time. This is the officially recommended approach for GUIs that want two-way communication while Claude is working.

A Channel acts as a chat bridge: your GUI is an MCP server, Claude Code connects to it, and messages flow both directions without needing to restart the process.

```bash
claude --channels plugin:your-gui@your-server
```

This would be the upgrade path from Claudio's current spawn-per-message model.

## What Claudio Does Today

Claudio uses the **queue-and-send-after** pattern:

1. User types while streaming → message goes into `promptQueue` (visible as pills in the UI)
2. When streaming finishes → first queued message is automatically sent via `--resume`
3. User can remove queued messages before they're sent

This is **actually the correct simple approach** and avoids the misinterpretation problem entirely. The user sees their queued messages explicitly and can edit/remove them before they're sent.

## Options for the Future

### Option A: Keep Queue-and-Send (Current — Recommended for Now)

**How it works:** Exactly what we have. User types during streaming, messages queue visually, auto-send on completion.

**Pros:**
- Already implemented and working
- Avoids the queued-message misinterpretation problem
- User has full control — can see, reorder, remove queued items
- Simple mental model: one message at a time

**Cons:**
- Not truly real-time — can't steer Claude mid-response
- Each message is a fresh `claude -p --resume` process spawn

**UI improvements to consider:**
- Show estimated position in queue ("2nd in line")
- Allow drag-to-reorder of queued messages
- "Send immediately" option that kills current process and sends the queued message
- Visual indicator that typing is being queued, not sent live

### Option B: Interrupt-and-Redirect

**How it works:** User types during streaming → kills the current process → sends the new message as a `--resume` continuation. Like hitting Ctrl+C in the terminal and typing something new.

**Pros:**
- Feels responsive — user can steer immediately
- Simple to implement (kill process, send new message)

**Cons:**
- Loses the in-progress response (or needs to preserve partial content)
- Expensive — wastes the tokens from the killed response
- Needs clear UI distinction between "queue this" vs "interrupt with this"

**UI design:**
- Enter = queue (default, safe)
- Shift+Enter or a dedicated "Interrupt" button = kill + send
- Show partial response with a "stopped" indicator

### Option C: Channels Integration (Future — Full Two-Way)

**How it works:** Claudio becomes a Channel MCP server. Instead of spawning `claude -p` per message, it maintains a persistent Claude Code session that it pushes messages into via the Channels API.

**Pros:**
- True real-time two-way communication
- Claude can read mid-stream messages naturally
- No process-per-message overhead
- Enables features like: approval prompts in the GUI, progress updates, tool permission dialogs

**Cons:**
- Significant architecture change (persistent session vs spawn-per-message)
- Channels is still "research preview" as of Q1 2026
- More complex error handling (session recovery, reconnection)
- Need to handle the known queued-message misinterpretation issue ourselves

**When to pursue:** When Channels exits research preview and the API stabilizes.

## Recommendation

**Short term:** Keep Option A (queue-and-send). Polish the UX:
- Make queue pills more prominent during streaming
- Add a "Stop and send" button for interrupt behavior
- Show clear visual state: "streaming... 2 messages queued"

**Medium term:** Add Option B as an opt-in behavior alongside the queue. Power users want to interrupt; casual users want to queue.

**Long term:** Evaluate Channels when it's stable. This would be a significant but worthwhile architecture shift — it would enable approval dialogs, tool permission prompts in the GUI, and true conversational flow during long-running tasks.

## References

- [Claude Code: How it works — sessions](https://docs.anthropic.com/en/docs/claude-code/how-claude-code-works#work-with-sessions)
- [Claude Code: Channels](https://docs.anthropic.com/en/docs/claude-code/channels)
- [GitHub #26388: Queued messages misinterpretation](https://github.com/anthropics/claude-code/issues/26388)
