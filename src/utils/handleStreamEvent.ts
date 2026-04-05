import type {
  ISCriterion, AgentInfo, StreamEvent, StreamEventCallbacks,
  SystemEvent, SystemInitEvent, SystemTaskProgressEvent, SystemTaskNotificationEvent,
  ContentBlock, ToolUseBlock,
} from "../types";

export type { StreamEvent, StreamEventCallbacks };

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

const STATUS_MAP: Record<string, ISCriterion["status"]> = {
  completed: "completed",
  in_progress: "in_progress",
  pending: "pending",
  failed: "failed",
};

function parseISCStatus(raw?: string): ISCriterion["status"] {
  return STATUS_MAP[raw ?? "pending"] ?? "pending";
}

function parseISCFromContent(content: string, status?: string): ISCriterion | null {
  if (!content.match(/^ISC-/i)) return null;
  const colonIdx = content.indexOf(":");
  const id = colonIdx > -1 ? content.slice(0, colonIdx).trim() : content.trim();
  const description = colonIdx > -1 ? content.slice(colonIdx + 1).trim() : content.trim();
  return { id, description, status: parseISCStatus(status) };
}

function getString(input: Record<string, unknown>, key: string): string {
  const val = input[key];
  return typeof val === "string" ? val : "";
}

function isSystemInit(event: SystemEvent): event is SystemInitEvent {
  return event.subtype === "init";
}

function isTaskProgress(event: SystemEvent): event is SystemTaskProgressEvent {
  return event.subtype === "task_progress";
}

function isTaskNotification(event: SystemEvent): event is SystemTaskNotificationEvent {
  return event.subtype === "task_notification";
}

function handleSystemEvent(
  event: SystemEvent,
  rawJsonStr: string,
  cb: StreamEventCallbacks,
): void {
  if (isSystemInit(event)) {
    cb.addLog("info", "system", `Session init: model=${event.model}`);
    cb.addStep({
      id: crypto.randomUUID(), type: "system", timestamp: Date.now(),
      summary: `Session init — model: ${event.model}`,
      rawJson: rawJsonStr,
    });
  } else if (isTaskProgress(event) && cb.onAgentUpdate) {
    const { tool_use_id: toolUseId, description } = event;
    if (toolUseId && description) {
      const toolName = description.split(" ")[0]?.replace(/ing$/, "") ?? "Tool";
      cb.onAgentUpdate({
        kind: "update",
        id: toolUseId,
        status: "running",
        description: description.slice(0, 200),
        toolCalls: [{ name: toolName, timestamp: Date.now() }],
      });
      cb.addLog("debug", "system", `task_progress: ${toolUseId} → ${description.slice(0, 100)}`);
    }
  } else if (isTaskNotification(event) && cb.onAgentUpdate) {
    const { tool_use_id: toolUseId, status, output_file: outputFile } = event;
    if (toolUseId && status) {
      cb.onAgentUpdate({
        kind: "update",
        id: toolUseId,
        status: status === "completed" ? "completed" : "failed",
        output: outputFile ? `Output: ${outputFile}` : undefined,
      });
      cb.addLog("info", "system", `task_notification: ${toolUseId} → ${status}`);
    }
  } else {
    cb.addLog("debug", "system", `${event.subtype}: ${JSON.stringify(event).slice(0, 200)}`);
  }
}

function handleToolUseBlock(
  block: ToolUseBlock,
  rawJsonStr: string,
  cb: StreamEventCallbacks,
): void {
  const input = block.input;
  const inputStr = input ? JSON.stringify(input) : "";
  const inputPreview = inputStr.slice(0, 200) + (inputStr.length > 200 ? "…" : "");
  cb.addStep({
    id: crypto.randomUUID(), type: "tool_use", timestamp: Date.now(),
    toolName: block.name,
    summary: `${block.name}(${inputPreview})`,
    rawJson: rawJsonStr,
  });

  if (!input) return;

  if (block.name === "TodoWrite" && cb.onISCCriteria) {
    const rawTodos = Array.isArray(input.todos) ? input.todos : [];
    const criteria: ISCriterion[] = rawTodos
      .filter((t: { content?: string }) => typeof t.content === "string" && t.content.match(/^ISC-/i))
      .map((t: { content?: string; status?: string }) => {
        const content = t.content ?? "";
        const colonIdx = content.indexOf(":");
        const id = colonIdx > -1 ? content.slice(0, colonIdx).trim() : content.trim();
        const description = colonIdx > -1 ? content.slice(colonIdx + 1).trim() : "";
        return { id, description, status: parseISCStatus(t.status) };
      });
    if (criteria.length > 0) {
      cb.addLog("debug", "app", `[ISC] TodoWrite → ${criteria.length} criteria: ${criteria.map(c => c.id).join(", ")}`);
      cb.onISCCriteria(criteria);
    }
  }

  if (block.name === "TaskCreate" && cb.onISCCriteria) {
    const criterion = parseISCFromContent(getString(input, "content"), getString(input, "status"));
    if (criterion) {
      cb.addLog("debug", "app", `[ISC] TaskCreate → ${criterion.id}: ${criterion.description}`);
      cb.onISCCriteria([criterion]);
    }
  }

  if (block.name === "Agent" && cb.onAgentUpdate) {
    const agentType = getString(input, "subagent_type") || "general-purpose";
    const fullPrompt = getString(input, "prompt");
    const agent: AgentInfo = {
      id: block.id ?? crypto.randomUUID(),
      name: getString(input, "description") || "Agent",
      type: agentType,
      status: "running",
      description: fullPrompt.slice(0, 200),
      prompt: fullPrompt,
      output: "",
      startedAt: Date.now(),
      toolCalls: [],
    };
    cb.addLog("info", "app", `[Agent] Spawned: ${agent.name} (${agent.type})`);
    cb.onAgentUpdate({ kind: "spawn", agent });
  }

  if (block.name === "TaskUpdate" && cb.onISCCriteria) {
    const criterion = parseISCFromContent(getString(input, "content"), getString(input, "status"));
    if (criterion) {
      cb.addLog("debug", "app", `[ISC] TaskUpdate → ${criterion.id}: ${getString(input, "status")}`);
      cb.onISCCriteria([criterion]);
    }
  }
}

function handleAssistantBlock(
  block: ContentBlock,
  rawJsonStr: string,
  cb: StreamEventCallbacks,
): void {
  switch (block.type) {
    case "thinking":
      cb.addStep({
        id: crypto.randomUUID(), type: "thinking", timestamp: Date.now(),
        summary: block.thinking.slice(0, 300) + (block.thinking.length > 300 ? "…" : ""),
        rawJson: rawJsonStr,
      });
      break;

    case "text": {
      cb.addLog("debug", "stream", `text: ${block.text.length} chars`);
      const buffer = cb.getBuffer();
      if (buffer && !buffer.endsWith(block.text)) {
        cb.appendContent("\n\n" + block.text);
      } else if (!buffer) {
        cb.setContent(block.text);
      }
      cb.addStep({
        id: crypto.randomUUID(), type: "text", timestamp: Date.now(),
        summary: block.text.slice(0, 300) + (block.text.length > 300 ? "…" : ""),
        rawJson: rawJsonStr,
      });
      break;
    }

    case "tool_use":
      handleToolUseBlock(block, rawJsonStr, cb);
      break;
  }
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
  cb: StreamEventCallbacks,
): void {
  // Capture type before switch — used in default branch where TS narrows to `never`
  const eventType = event.type;
  switch (eventType) {
    case "system":
      handleSystemEvent(event, rawJsonStr, cb);
      break;

    case "assistant": {
      const blocks = event.message?.content ?? [];
      cb.addLog("debug", "stream", `assistant event: ${blocks.length} blocks`);
      for (const block of blocks) {
        handleAssistantBlock(block, rawJsonStr, cb);
      }
      break;
    }

    case "user": {
      const results = event.message?.content ?? [];
      for (const result of results) {
        if (result.type === "tool_result") {
          const contentStr = normalizeContent(result.content);
          const preview = contentStr.slice(0, 300) + (contentStr.length > 300 ? "…" : "");
          cb.addStep({
            id: crypto.randomUUID(), type: "tool_result", timestamp: Date.now(),
            summary: result.is_error ? `ERROR: ${preview}` : preview,
            rawJson: rawJsonStr,
          });
          if (result.tool_use_id && cb.onAgentUpdate) {
            cb.onAgentUpdate({
              kind: "update",
              id: result.tool_use_id,
              status: result.is_error ? "failed" : "completed",
              output: contentStr.slice(0, 2000),
            });
          }
        }
      }
      cb.addLog("debug", "stream", `user event: ${results.length} results`);
      break;
    }

    case "stream_event": {
      if (event.event?.type === "content_block_delta" && event.event.delta?.text) {
        cb.appendContent(event.event.delta.text);
        const bufLen = cb.getBuffer().length;
        if (bufLen % 200 < 10) {
          cb.addLog("debug", "stream", `streaming... buffer=${bufLen} chars`);
        }
      }
      break;
    }

    case "result": {
      cb.addLog("info", "stream", `result: session=${event.session_id ?? "none"}`);
      if (event.session_id) {
        cb.onSessionId(event.session_id);
      }
      const costUsd = event.total_cost_usd ?? event.cost_usd;
      const durationMs = event.duration_ms ?? (Date.now() - cb.startTime);

      if (typeof event.result === "string" && event.result) {
        cb.setContent(event.result);
      }

      cb.addStep({
        id: crypto.randomUUID(), type: "result", timestamp: Date.now(),
        summary: `Done — ${(durationMs / 1000).toFixed(1)}s, $${costUsd?.toFixed(4) ?? "?"}`,
        rawJson: rawJsonStr,
      });

      cb.finalizeMessage(costUsd, durationMs);
      break;
    }

    case "rate_limit_event":
      cb.addLog("warn", "system", `Rate limit: ${JSON.stringify(event.rate_limit_info)}`);
      break;

    default:
      // Runtime safety — JSON.parse may produce event types not in our union
      cb.addLog("debug", "stream", `Event: ${eventType}`);
  }
}
