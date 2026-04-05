import type {LogEntry} from "../components/DebugConsole.tsx";
import type {StreamStep} from "../types.ts";
import type {ISCriterion} from "../components/AlgorithmTracker";
import type {AgentInfo} from "../components/AgentDrawer";

export interface StreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  [key: string]: unknown;
}

/**
 * All side-effects that handleStreamEvent can produce, passed in as callbacks.
 * This decouples the event-parsing logic from React state and Tauri entirely —
 * making handleStreamEvent a pure function that's easy to unit test.
 */
export interface StreamEventCallbacks {
  addLog: (level: LogEntry["level"], source: LogEntry["source"], message: string) => void;
  addStep: (step: StreamStep) => void;
  appendContent: (delta: string) => void;
  setContent: (fullContent: string) => void;
  finalizeMessage: (costUsd?: number, durationMs?: number) => void;
  /** Called when the result event carries a session_id to persist for --resume */
  onSessionId: (claudeSessionId: string) => void;
  /** Returns the current accumulated content — used for multi-turn dedup logic */
  getBuffer: () => string;
  /** When sendMessage started — used as duration fallback if result event omits it */
  startTime: number;
  /** Called when a TodoWrite tool_use block contains ISC- prefixed todos */
  onISCCriteria?: (criteria: ISCriterion[]) => void;
  /** Called when an Agent/Task tool_use is detected — tracks agent lifecycle */
  onAgentUpdate?: (agent: AgentInfo) => void;
}

/** Normalize tool result content — can be a string or an array of content blocks */
function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block: { type?: string; text?: string }) =>
        block.type === "text" && block.text ? block.text : ""
      )
      .filter(Boolean)
      .join("\n");
  }
  return content ? String(content) : "";
}

/**
 * Pure function: handles a single stream event from Claude's --stream-json output.
 *
 * No React, no Tauri, no closures — all side-effects flow through `cb`.
 * Testable by passing synthetic events and asserting which callbacks fire.
 */
export function handleStreamEvent(
  event: StreamEvent,
  rawJsonStr: string,
  eventCallbacks: StreamEventCallbacks,
): void {
  switch (event.type) {
    case "system": {
      if (event.subtype === "init") {
        eventCallbacks.addLog("info", "system", `Session init: model=${event.model}`);
        eventCallbacks.addStep({
          id: crypto.randomUUID(), type: "system", timestamp: Date.now(),
          summary: `Session init — model: ${event.model}`,
          rawJson: rawJsonStr,
        });
      } else {
        eventCallbacks.addLog("debug", "system", `${event.subtype}: ${JSON.stringify(event).slice(0, 200)}`);
      }
      break;
    }

    case "assistant": {
      const msg = event.message as {
        content?: Array<{
          type: string;
          text?: string;
          thinking?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>
        }>;
      } | undefined;
      const blocks = msg?.content ?? [];
      eventCallbacks.addLog("debug", "stream", `assistant event: ${blocks.length} blocks`);

      for (const block of blocks) {
        if (block.type === "thinking" && block.thinking) {
          eventCallbacks.addStep({
            id: crypto.randomUUID(), type: "thinking", timestamp: Date.now(),
            summary: block.thinking.slice(0, 300) + (block.thinking.length > 300 ? "…" : ""),
            rawJson: rawJsonStr,
          });
        } else if (block.type === "text" && block.text) {
          eventCallbacks.addLog("debug", "stream", `text: ${block.text.length} chars`);
          // Append with separator — multi-turn responses produce multiple assistant events,
          // each with the complete text for that turn. stream_event deltas already built
          // the content for this turn, so skip if the buffer already ends with this text.
          const buffer = eventCallbacks.getBuffer();
          if (buffer && !buffer.endsWith(block.text)) {
            eventCallbacks.appendContent("\n\n" + block.text);
          } else if (!buffer) {
            eventCallbacks.setContent(block.text);
          }
          eventCallbacks.addStep({
            id: crypto.randomUUID(), type: "text", timestamp: Date.now(),
            summary: block.text.slice(0, 300) + (block.text.length > 300 ? "…" : ""),
            rawJson: rawJsonStr,
          });
        } else if (block.type === "tool_use") {
          const inputStr = block.input ? JSON.stringify(block.input) : "";
          const inputPreview = inputStr.slice(0, 200) + (inputStr.length > 200 ? "…" : "");
          eventCallbacks.addStep({
            id: crypto.randomUUID(), type: "tool_use", timestamp: Date.now(),
            toolName: block.name,
            summary: `${block.name}(${inputPreview})`,
            rawJson: rawJsonStr,
          });
          // Extract ISC criteria from TodoWrite calls — criteria live in tool calls, not text
          if (block.name === "TodoWrite" && eventCallbacks.onISCCriteria && block.input) {
            const todos = (block.input as { todos?: Array<{ content?: string; status?: string }> }).todos ?? [];
            const criteria: ISCriterion[] = todos
              .filter((t) => t.content?.match(/^ISC-/i))
              .map((t) => {
                const colonIdx = t.content!.indexOf(":");
                const id = colonIdx > -1 ? t.content!.slice(0, colonIdx).trim() : t.content!.trim();
                const description = colonIdx > -1 ? t.content!.slice(colonIdx + 1).trim() : "";
                const statusMap: Record<string, ISCriterion["status"]> = {
                  completed: "completed", in_progress: "in_progress",
                  pending: "pending", failed: "failed",
                };
                return { id, description, status: statusMap[t.status ?? "pending"] ?? "pending" };
              });
            if (criteria.length > 0) {
              eventCallbacks.addLog("debug", "app", `[ISC] TodoWrite → ${criteria.length} criteria: ${criteria.map(c => c.id).join(", ")}`);
              eventCallbacks.onISCCriteria(criteria);
            }
          }
          // Extract ISC criteria from TaskCreate (Claude Code's native task system)
          if (block.name === "TaskCreate" && eventCallbacks.onISCCriteria && block.input) {
            const content = (block.input as { content?: string; status?: string }).content ?? "";
            if (content.match(/^ISC-/i)) {
              const colonIdx = content.indexOf(":");
              const id = colonIdx > -1 ? content.slice(0, colonIdx).trim() : content.trim();
              const description = colonIdx > -1 ? content.slice(colonIdx + 1).trim() : content.trim();
              const rawStatus = (block.input as { status?: string }).status ?? "pending";
              const statusMap: Record<string, ISCriterion["status"]> = {
                completed: "completed", in_progress: "in_progress",
                pending: "pending", failed: "failed",
              };
              const criterion: ISCriterion = { id, description, status: statusMap[rawStatus] ?? "pending" };
              eventCallbacks.addLog("debug", "app", `[ISC] TaskCreate → ${id}: ${description}`);
              eventCallbacks.onISCCriteria([criterion]);
            }
          }
          // Detect agent spawns — "Agent" tool_use blocks contain description, subagent_type, prompt
          if (block.name === "Agent" && eventCallbacks.onAgentUpdate && block.input) {
            const input = block.input as { description?: string; subagent_type?: string; prompt?: string; run_in_background?: boolean };
            const agentType = input.subagent_type ?? "general-purpose";
            const agent: AgentInfo = {
              id: block.id ?? crypto.randomUUID(),
              name: input.description ?? "Agent",
              type: agentType,
              status: "running",
              description: (input.prompt ?? "").slice(0, 200),
              output: "",
              startedAt: Date.now(),
            };
            eventCallbacks.addLog("info", "app", `[Agent] Spawned: ${agent.name} (${agent.type})`);
            eventCallbacks.onAgentUpdate(agent);
          }

          // Update ISC criteria status from TaskUpdate
          if (block.name === "TaskUpdate" && eventCallbacks.onISCCriteria && block.input) {
            const input = block.input as { content?: string; status?: string };
            const content = input.content ?? "";
            if (content.match(/^ISC-/i)) {
              const colonIdx = content.indexOf(":");
              const id = colonIdx > -1 ? content.slice(0, colonIdx).trim() : content.trim();
              const description = colonIdx > -1 ? content.slice(colonIdx + 1).trim() : content.trim();
              const rawStatus = input.status ?? "pending";
              const statusMap: Record<string, ISCriterion["status"]> = {
                completed: "completed", in_progress: "in_progress",
                pending: "pending", failed: "failed",
              };
              const criterion: ISCriterion = { id, description, status: statusMap[rawStatus] ?? "pending" };
              eventCallbacks.addLog("debug", "app", `[ISC] TaskUpdate → ${id}: ${rawStatus}`);
              eventCallbacks.onISCCriteria([criterion]);
            }
          }
        }
      }
      break;
    }

    case "user": {
      // Tool results
      const userMsg = event.message as {
        content?: Array<{
          type: string;
          content?: unknown;
          tool_use_id?: string;
          is_error?: boolean
        }>;
      } | undefined;
      const results = userMsg?.content ?? [];
      for (const result of results) {
        if (result.type === "tool_result") {
          const contentStr = normalizeContent(result.content);
          const preview = contentStr.slice(0, 300) + (contentStr.length > 300 ? "…" : "");
          eventCallbacks.addStep({
            id: crypto.randomUUID(), type: "tool_result", timestamp: Date.now(),
            summary: result.is_error ? `ERROR: ${preview}` : preview,
            rawJson: rawJsonStr,
          });
          // Update agent status when its tool_result arrives
          if (result.tool_use_id && eventCallbacks.onAgentUpdate) {
            eventCallbacks.onAgentUpdate({
              id: result.tool_use_id,
              name: "",  // useClaude merges by id, keeping existing name
              type: "",
              status: result.is_error ? "failed" : "completed",
              description: "",
              output: contentStr.slice(0, 2000),
              startedAt: 0,
            });
          }
        }
      }
      eventCallbacks.addLog("debug", "stream", `user event: ${results.length} results`);
      break;
    }

    case "stream_event": {
      const streamEvt = event.event as {
        type: string;
        delta?: { type: string; text?: string };
      } | undefined;
      if (streamEvt?.type === "content_block_delta" && streamEvt.delta?.text) {
        eventCallbacks.appendContent(streamEvt.delta.text);
        const bufLen = eventCallbacks.getBuffer().length;
        if (bufLen % 200 < 10) {
          eventCallbacks.addLog("debug", "stream", `streaming... buffer=${bufLen} chars`);
        }
      }
      break;
    }

    case "result": {
      eventCallbacks.addLog("info", "stream", `result: session=${event.session_id ?? "none"}`);
      if (event.session_id) {
        eventCallbacks.onSessionId(event.session_id as string);
      }
      const costUsd = (event.total_cost_usd ?? event.cost_usd) as number | undefined;
      const durationMs = (event.duration_ms ?? (Date.now() - eventCallbacks.startTime)) as number;

      if (typeof event.result === "string" && event.result) {
        eventCallbacks.setContent(event.result);
      }

      eventCallbacks.addStep({
        id: crypto.randomUUID(), type: "result", timestamp: Date.now(),
        summary: `Done — ${(durationMs / 1000).toFixed(1)}s, $${costUsd?.toFixed(4) ?? "?"}`,
        rawJson: rawJsonStr,
      });

      eventCallbacks.finalizeMessage(costUsd, durationMs);
      break;
    }

    case "rate_limit_event":
      eventCallbacks.addLog("warn", "system", `Rate limit: ${JSON.stringify(event.rate_limit_info)}`);
      break;

    default:
      eventCallbacks.addLog("debug", "stream", `Event: ${event.type}/${event.subtype ?? ""}`);
  }
}
