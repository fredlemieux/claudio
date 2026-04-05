import type { StreamEventCallbacks, ResultEvent, ISCriterion, AgentEvent, StreamStep, LogEntry } from "../../types";
import { vi } from "vitest";

interface MockCallbackState {
  logs: Array<{ level: LogEntry["level"]; source: LogEntry["source"]; message: string }>;
  steps: StreamStep[];
  appendedDeltas: string[];
  contentSets: string[];
  finalizations: Array<{ costUsd?: number; durationMs?: number }>;
  sessionIds: string[];
  iscUpdates: ISCriterion[][];
  agentUpdates: AgentEvent[];
}

export type MockCallbacks = StreamEventCallbacks & MockCallbackState & { buffer: string };

export function createMockCallbacks(overrides?: Partial<StreamEventCallbacks>): MockCallbacks {
  const state: MockCallbackState & { _buffer: string } = {
    logs: [],
    steps: [],
    appendedDeltas: [],
    contentSets: [],
    finalizations: [],
    sessionIds: [],
    iscUpdates: [],
    agentUpdates: [],
    _buffer: "",
  };

  const result: MockCallbacks = Object.defineProperty(
    {
      logs: state.logs,
      steps: state.steps,
      appendedDeltas: state.appendedDeltas,
      contentSets: state.contentSets,
      finalizations: state.finalizations,
      sessionIds: state.sessionIds,
      iscUpdates: state.iscUpdates,
      agentUpdates: state.agentUpdates,
      addLog: vi.fn((level: LogEntry["level"], source: LogEntry["source"], message: string) => {
        state.logs.push({ level, source, message });
      }),
      addStep: vi.fn((step: StreamStep) => {
        state.steps.push(step);
      }),
      appendContent: vi.fn((delta: string) => {
        state._buffer += delta;
        state.appendedDeltas.push(delta);
      }),
      setContent: vi.fn((content: string) => {
        state._buffer = content;
        state.contentSets.push(content);
      }),
      finalizeMessage: vi.fn((costUsd?: number, durationMs?: number) => {
        state.finalizations.push({ costUsd, durationMs });
      }),
      onSessionId: vi.fn((id: string) => {
        state.sessionIds.push(id);
      }),
      getBuffer: vi.fn(() => state._buffer),
      startTime: 1000,
      onISCCriteria: vi.fn((criteria: ISCriterion[]) => {
        state.iscUpdates.push(criteria);
      }),
      onAgentUpdate: vi.fn((event: AgentEvent) => {
        state.agentUpdates.push(event);
      }),
      ...overrides,
    } as MockCallbacks,
    "buffer",
    {
      get: () => state._buffer,
      set: (v: string) => { state._buffer = v; },
      enumerable: true,
    },
  );

  return result;
}

export function systemInitEvent(model = "claude-opus-4-6") {
  const event = { type: "system" as const, subtype: "init" as const, model };
  return { event, raw: JSON.stringify(event) };
}

export function systemTaskProgressEvent(toolUseId: string, description: string) {
  const event = { type: "system" as const, subtype: "task_progress" as const, tool_use_id: toolUseId, description };
  return { event, raw: JSON.stringify(event) };
}

export function systemTaskNotificationEvent(toolUseId: string, status: string, outputFile?: string) {
  const event = { type: "system" as const, subtype: "task_notification" as const, tool_use_id: toolUseId, status, output_file: outputFile };
  return { event, raw: JSON.stringify(event) };
}

export function assistantTextEvent(text: string) {
  const event = {
    type: "assistant" as const,
    message: { content: [{ type: "text" as const, text }] },
  };
  return { event, raw: JSON.stringify(event) };
}

export function assistantThinkingEvent(thinking: string) {
  const event = {
    type: "assistant" as const,
    message: { content: [{ type: "thinking" as const, thinking }] },
  };
  return { event, raw: JSON.stringify(event) };
}

export function assistantToolUseEvent(name: string, input: Record<string, unknown>, id?: string) {
  const event = {
    type: "assistant" as const,
    message: { content: [{ type: "tool_use" as const, name, input, id: id ?? "tool-1" }] },
  };
  return { event, raw: JSON.stringify(event) };
}

export function userToolResultEvent(toolUseId: string, content: string, isError = false) {
  const event = {
    type: "user" as const,
    message: { content: [{ type: "tool_result" as const, tool_use_id: toolUseId, content, is_error: isError }] },
  };
  return { event, raw: JSON.stringify(event) };
}

export function streamDeltaEvent(text: string) {
  const event = {
    type: "stream_event" as const,
    event: { type: "content_block_delta", delta: { type: "text_delta", text } },
  };
  return { event, raw: JSON.stringify(event) };
}

export function resultEvent(opts: {
  sessionId?: string;
  totalCostUsd?: number;
  durationMs?: number;
  result?: string;
} = {}) {
  const event: ResultEvent = {
    type: "result",
    ...(opts.sessionId && { session_id: opts.sessionId }),
    ...(opts.totalCostUsd !== undefined && { total_cost_usd: opts.totalCostUsd }),
    ...(opts.durationMs !== undefined && { duration_ms: opts.durationMs }),
    ...(opts.result !== undefined && { result: opts.result }),
  };
  return { event, raw: JSON.stringify(event) };
}
