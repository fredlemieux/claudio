import { describe, it, expect, beforeEach } from "vitest";
import type { StreamEvent, AgentEvent } from "../../types";
import { handleStreamEvent } from "../handleStreamEvent";

function asUpdate(event: AgentEvent) {
  if (event.kind !== "update") throw new Error("Expected update event");
  return event;
}

function asSpawn(event: AgentEvent) {
  if (event.kind !== "spawn") throw new Error("Expected spawn event");
  return event;
}
import {
  createMockCallbacks,
  systemInitEvent,
  systemTaskProgressEvent,
  systemTaskNotificationEvent,
  assistantTextEvent,
  assistantThinkingEvent,
  assistantToolUseEvent,
  userToolResultEvent,
  streamDeltaEvent,
  resultEvent,
} from "./factories";

// ─── system init ─────────────────────────────────────────────

describe("system init event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("logs model info at info level", () => {
    const { event, raw } = systemInitEvent("claude-opus-4-6");
    handleStreamEvent(event, raw, cb);
    expect(cb.logs[0]?.message).toContain("claude-opus-4-6");
  });

  it("logs to system source", () => {
    const { event, raw } = systemInitEvent();
    handleStreamEvent(event, raw, cb);
    expect(cb.logs[0]?.source).toBe("system");
  });

  it("adds a system step", () => {
    const { event, raw } = systemInitEvent("claude-opus-4-6");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.type).toBe("system");
  });

  it("includes model in step summary", () => {
    const { event, raw } = systemInitEvent("claude-sonnet-4-6");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toContain("claude-sonnet-4-6");
  });

  it("attaches raw JSON to step", () => {
    const { event, raw } = systemInitEvent();
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.rawJson).toBe(raw);
  });
});

// ─── system task_progress ────────────────────────────────────

describe("system task_progress event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("calls onAgentUpdate with the tool_use_id", () => {
    const { event, raw } = systemTaskProgressEvent("agent-1", "Reading file.ts");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).id).toBe("agent-1");
  });

  it("sets agent status to running", () => {
    const { event, raw } = systemTaskProgressEvent("agent-1", "Reading file.ts");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).status).toBe("running");
  });

  it("truncates description to 200 characters", () => {
    const longDesc = "x".repeat(300);
    const { event, raw } = systemTaskProgressEvent("agent-1", longDesc);
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).description!.length).toBe(200);
  });

  it("extracts tool name from description", () => {
    const { event, raw } = systemTaskProgressEvent("agent-1", "Reading ~/dev/file.ts");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).toolCalls?.[0]?.name).toBe("Read");
  });

  it("does not call onAgentUpdate when callback is absent", () => {
    const cb2 = createMockCallbacks({ onAgentUpdate: undefined });
    const { event, raw } = systemTaskProgressEvent("agent-1", "Reading file.ts");
    handleStreamEvent(event, raw, cb2);
    expect(cb2.agentUpdates).toHaveLength(0);
  });
});

// ─── system task_notification ────────────────────────────────

describe("system task_notification event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("marks agent as completed on success", () => {
    const { event, raw } = systemTaskNotificationEvent("agent-1", "completed");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).status).toBe("completed");
  });

  it("marks agent as failed on non-completed status", () => {
    const { event, raw } = systemTaskNotificationEvent("agent-1", "error");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).status).toBe("failed");
  });

  it("includes output file path when present", () => {
    const { event, raw } = systemTaskNotificationEvent("agent-1", "completed", "/tmp/output.txt");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).output).toContain("/tmp/output.txt");
  });

  it("has no output when no output_file", () => {
    const { event, raw } = systemTaskNotificationEvent("agent-1", "completed");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).output).toBeUndefined();
  });
});

// ─── assistant text ──────────────────────────────────────────

describe("assistant text event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("sets content when buffer is empty", () => {
    const { event, raw } = assistantTextEvent("Hello world");
    handleStreamEvent(event, raw, cb);
    expect(cb.contentSets[0]).toBe("Hello world");
  });

  it("appends with separator when buffer has different content", () => {
    cb.buffer = "Previous content";
    const { event, raw } = assistantTextEvent("New content");
    handleStreamEvent(event, raw, cb);
    expect(cb.appendedDeltas[0]).toBe("\n\nNew content");
  });

  it("skips append when buffer already ends with the text", () => {
    cb.buffer = "Hello world";
    const { event, raw } = assistantTextEvent("Hello world");
    handleStreamEvent(event, raw, cb);
    expect(cb.appendedDeltas).toHaveLength(0);
  });

  it("adds a text step", () => {
    const { event, raw } = assistantTextEvent("Hello");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps.find((s) => s.type === "text")).toBeDefined();
  });

  it("truncates step summary to 300 characters plus ellipsis", () => {
    const longText = "a".repeat(500);
    const { event, raw } = assistantTextEvent(longText);
    handleStreamEvent(event, raw, cb);
    expect(cb.steps.find((s) => s.type === "text")!.summary.length).toBe(301);
  });
});

// ─── assistant thinking ──────────────────────────────────────

describe("assistant thinking event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("adds a thinking step", () => {
    const { event, raw } = assistantThinkingEvent("Let me think...");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.type).toBe("thinking");
  });

  it("truncates thinking summary to 300 characters plus ellipsis", () => {
    const longThinking = "t".repeat(500);
    const { event, raw } = assistantThinkingEvent(longThinking);
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary.length).toBe(301);
  });
});

// ─── assistant tool_use ──────────────────────────────────────

describe("assistant tool_use event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("adds a tool_use step with tool name", () => {
    const { event, raw } = assistantToolUseEvent("Read", { file_path: "/tmp/foo" });
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.toolName).toBe("Read");
  });

  it("includes input preview in step summary", () => {
    const { event, raw } = assistantToolUseEvent("Bash", { command: "ls -la" });
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toContain("ls -la");
  });

  it("truncates large input in step summary", () => {
    const { event, raw } = assistantToolUseEvent("Write", { content: "x".repeat(500) });
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary.length).toBeLessThan(300);
  });
});

// ─── ISC extraction: TodoWrite ───────────────────────────────

describe("ISC extraction from TodoWrite", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("extracts ISC-prefixed criteria", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [{ content: "ISC-C1: Tests pass", status: "pending" }],
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.id).toBe("ISC-C1");
  });

  it("extracts description after colon", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [{ content: "ISC-C1: All tests pass green", status: "pending" }],
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.description).toBe("All tests pass green");
  });

  it("maps completed status correctly", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [{ content: "ISC-C1: Done", status: "completed" }],
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.status).toBe("completed");
  });

  it("maps unknown status to pending", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [{ content: "ISC-C1: Something", status: "banana" }],
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.status).toBe("pending");
  });

  it("ignores non-ISC todos", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [
        { content: "Fix the bug", status: "pending" },
        { content: "ISC-C1: Real criterion", status: "pending" },
      ],
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]).toHaveLength(1);
  });

  it("does not call onISCCriteria when callback is absent", () => {
    const cb2 = createMockCallbacks({ onISCCriteria: undefined });
    const { event, raw } = assistantToolUseEvent("TodoWrite", {
      todos: [{ content: "ISC-C1: Criterion", status: "pending" }],
    });
    handleStreamEvent(event, raw, cb2);
    expect(cb2.iscUpdates).toHaveLength(0);
  });

  it("handles missing todos array gracefully", () => {
    const { event, raw } = assistantToolUseEvent("TodoWrite", {});
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates).toHaveLength(0);
  });
});

// ─── ISC extraction: TaskCreate ──────────────────────────────

describe("ISC extraction from TaskCreate", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("extracts ISC criterion from content field", () => {
    const { event, raw } = assistantToolUseEvent("TaskCreate", {
      content: "ISC-C5: Build passes cleanly",
      status: "pending",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.id).toBe("ISC-C5");
  });

  it("extracts description from content field", () => {
    const { event, raw } = assistantToolUseEvent("TaskCreate", {
      content: "ISC-C5: Build passes cleanly",
      status: "pending",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.description).toBe("Build passes cleanly");
  });

  it("maps in_progress status correctly", () => {
    const { event, raw } = assistantToolUseEvent("TaskCreate", {
      content: "ISC-C5: Build passes",
      status: "in_progress",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.status).toBe("in_progress");
  });

  it("ignores non-ISC content", () => {
    const { event, raw } = assistantToolUseEvent("TaskCreate", {
      content: "Fix the auth bug",
      status: "pending",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates).toHaveLength(0);
  });
});

// ─── ISC extraction: TaskUpdate ──────────────────────────────

describe("ISC extraction from TaskUpdate", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("extracts ISC criterion from content field", () => {
    const { event, raw } = assistantToolUseEvent("TaskUpdate", {
      content: "ISC-A1: No unsafe casts",
      status: "completed",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.id).toBe("ISC-A1");
  });

  it("maps failed status correctly", () => {
    const { event, raw } = assistantToolUseEvent("TaskUpdate", {
      content: "ISC-A1: No unsafe casts",
      status: "failed",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.status).toBe("failed");
  });

  it("defaults to pending when status is missing", () => {
    const { event, raw } = assistantToolUseEvent("TaskUpdate", {
      content: "ISC-C3: Something",
    });
    handleStreamEvent(event, raw, cb);
    expect(cb.iscUpdates[0]?.[0]?.status).toBe("pending");
  });
});

// ─── agent spawn ─────────────────────────────────────────────

describe("agent spawn via Agent tool_use", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("creates an agent with running status", () => {
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Explore codebase",
      subagent_type: "Explore",
      prompt: "Find all files",
    }, "agent-42");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.status).toBe("running");
  });

  it("uses the block id as agent id", () => {
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Test agent",
      prompt: "Do stuff",
    }, "agent-99");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.id).toBe("agent-99");
  });

  it("uses description as agent name", () => {
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Research types",
      prompt: "Find types",
    }, "agent-1");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.name).toBe("Research types");
  });

  it("sets subagent_type as agent type", () => {
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Build",
      subagent_type: "Engineer",
      prompt: "Build it",
    }, "agent-1");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.type).toBe("Engineer");
  });

  it("defaults type to general-purpose when not specified", () => {
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Generic agent",
      prompt: "Do things",
    }, "agent-1");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.type).toBe("general-purpose");
  });

  it("truncates prompt in description to 200 characters", () => {
    const longPrompt = "p".repeat(500);
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Long agent",
      prompt: longPrompt,
    }, "agent-1");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.description.length).toBe(200);
  });

  it("stores full prompt", () => {
    const fullPrompt = "Full prompt content here";
    const { event, raw } = assistantToolUseEvent("Agent", {
      description: "Agent",
      prompt: fullPrompt,
    }, "agent-1");
    handleStreamEvent(event, raw, cb);
    expect(asSpawn(cb.agentUpdates[0]).agent.prompt).toBe(fullPrompt);
  });
});

// ─── user tool_result ────────────────────────────────────────

describe("user tool_result event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("adds a tool_result step", () => {
    const { event, raw } = userToolResultEvent("tool-1", "Success output");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.type).toBe("tool_result");
  });

  it("prefixes error results with ERROR", () => {
    const { event, raw } = userToolResultEvent("tool-1", "Something broke", true);
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toMatch(/^ERROR:/);
  });

  it("does not prefix non-error results", () => {
    const { event, raw } = userToolResultEvent("tool-1", "All good");
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).not.toMatch(/^ERROR:/);
  });

  it("updates agent with completed status for non-error result", () => {
    const { event, raw } = userToolResultEvent("agent-1", "Done");
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).status).toBe("completed");
  });

  it("updates agent with failed status for error result", () => {
    const { event, raw } = userToolResultEvent("agent-1", "Crashed", true);
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).status).toBe("failed");
  });

  it("truncates agent output to 2000 characters", () => {
    const longOutput = "o".repeat(3000);
    const { event, raw } = userToolResultEvent("agent-1", longOutput);
    handleStreamEvent(event, raw, cb);
    expect(asUpdate(cb.agentUpdates[0]).output!.length).toBe(2000);
  });

  it("handles array content blocks", () => {
    const event = {
      type: "user" as const,
      message: {
        content: [{
          type: "tool_result" as const,
          tool_use_id: "tool-1",
          content: [{ type: "text", text: "Block one" }, { type: "text", text: "Block two" }],
        }],
      },
    };
    const raw = JSON.stringify(event);
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toContain("Block one");
  });
});

// ─── stream_event delta ──────────────────────────────────────

describe("stream_event content_block_delta", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("appends delta text via appendContent", () => {
    const { event, raw } = streamDeltaEvent("Hello ");
    handleStreamEvent(event, raw, cb);
    expect(cb.appendedDeltas[0]).toBe("Hello ");
  });

  it("accumulates multiple deltas", () => {
    const d1 = streamDeltaEvent("Hello ");
    const d2 = streamDeltaEvent("world");
    handleStreamEvent(d1.event, d1.raw, cb);
    handleStreamEvent(d2.event, d2.raw, cb);
    expect(cb.buffer).toBe("Hello world");
  });

  it("does not append when delta text is missing", () => {
    const event = {
      type: "stream_event" as const,
      event: { type: "content_block_delta", delta: { type: "text_delta" } },
    };
    handleStreamEvent(event, "{}", cb);
    expect(cb.appendedDeltas).toHaveLength(0);
  });
});

// ─── result event ────────────────────────────────────────────

describe("result event", () => {
  let cb: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    cb = createMockCallbacks();
  });

  it("calls onSessionId when session_id is present", () => {
    const { event, raw } = resultEvent({ sessionId: "sess-123" });
    handleStreamEvent(event, raw, cb);
    expect(cb.sessionIds[0]).toBe("sess-123");
  });

  it("does not call onSessionId when absent", () => {
    const { event, raw } = resultEvent({});
    handleStreamEvent(event, raw, cb);
    expect(cb.sessionIds).toHaveLength(0);
  });

  it("calls finalizeMessage with cost", () => {
    const { event, raw } = resultEvent({ totalCostUsd: 0.05 });
    handleStreamEvent(event, raw, cb);
    expect(cb.finalizations[0]?.costUsd).toBe(0.05);
  });

  it("calls finalizeMessage with duration", () => {
    const { event, raw } = resultEvent({ durationMs: 5000 });
    handleStreamEvent(event, raw, cb);
    expect(cb.finalizations[0]?.durationMs).toBe(5000);
  });

  it("falls back to elapsed time when duration_ms is missing", () => {
    const { event, raw } = resultEvent({});
    handleStreamEvent(event, raw, cb);
    expect(cb.finalizations[0]?.durationMs).toBeGreaterThan(0);
  });

  it("sets content when result string is present", () => {
    const { event, raw } = resultEvent({ result: "Final answer" });
    handleStreamEvent(event, raw, cb);
    expect(cb.contentSets[0]).toBe("Final answer");
  });

  it("does not set content when result is missing", () => {
    const { event, raw } = resultEvent({});
    handleStreamEvent(event, raw, cb);
    expect(cb.contentSets).toHaveLength(0);
  });

  it("adds a result step with duration in summary", () => {
    const { event, raw } = resultEvent({ durationMs: 3000, totalCostUsd: 0.01 });
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toContain("3.0s");
  });

  it("adds a result step with cost in summary", () => {
    const { event, raw } = resultEvent({ durationMs: 1000, totalCostUsd: 0.0234 });
    handleStreamEvent(event, raw, cb);
    expect(cb.steps[0]?.summary).toContain("$0.0234");
  });
});

// ─── rate_limit_event ────────────────────────────────────────

describe("rate_limit_event", () => {
  it("logs a warning", () => {
    const cb = createMockCallbacks();
    const event = { type: "rate_limit_event" as const, rate_limit_info: { remaining: 0 } };
    handleStreamEvent(event, "{}", cb);
    expect(cb.logs[0]?.level).toBe("warn");
  });
});

// ─── unknown event type ──────────────────────────────────────

describe("unknown event type", () => {
  it("logs at debug level", () => {
    const cb = createMockCallbacks();
    // Simulate an unknown event type from JSON.parse — cast needed for edge case testing
    const event = { type: "something_new", subtype: "mystery" } as unknown as StreamEvent;
    handleStreamEvent(event, "{}", cb);
    expect(cb.logs[0]?.level).toBe("debug");
  });
});
