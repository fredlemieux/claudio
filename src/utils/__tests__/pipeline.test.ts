import { describe, it, expect } from "vitest";
import { FakeCommand } from "./FakeCommand";
import { runPipeline } from "./runPipeline";

// ─── system init ─────────────────────────────────────────────

describe("pipeline: system init", () => {
  it("logs model from init event", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
    ]);
    const result = await runPipeline(fake);
    expect(result.logs.find((l) => l.message.includes("claude-opus-4-6"))).toBeDefined();
  });

  it("adds a system step", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
    ]);
    const result = await runPipeline(fake);
    expect(result.steps.find((s) => s.type === "system")).toBeDefined();
  });
});

// ─── assistant text ──────────────────────────────────────────

describe("pipeline: assistant text", () => {
  it("captures text content from assistant message", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello Fred"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.content).toBe("Hello Fred");
  });

  it("adds a text step", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.steps.find((s) => s.type === "text")).toBeDefined();
  });
});

// ─── streaming deltas ────────────────────────────────────────

describe("pipeline: stream deltas", () => {
  it("accumulates multiple delta chunks into content", async () => {
    const fake = new FakeCommand([
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.content).toBe("Hello world");
  });
});

// ─── tool use ────────────────────────────────────────────────

describe("pipeline: tool use", () => {
  it("adds tool_use step with tool name", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/tmp/foo"},"id":"tool-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.steps.find((s) => s.toolName === "Read")).toBeDefined();
  });
});

// ─── ISC criteria extraction ─────────────────────────────────

describe("pipeline: ISC criteria", () => {
  it("extracts ISC criterion from TaskCreate event", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TaskCreate","input":{"content":"ISC-C1: Tests pass green","status":"pending"},"id":"tc-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.iscUpdates[0]?.[0]?.id).toBe("ISC-C1");
  });

  it("extracts description from ISC criterion", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TaskCreate","input":{"content":"ISC-C1: Tests pass green","status":"pending"},"id":"tc-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.iscUpdates[0]?.[0]?.description).toBe("Tests pass green");
  });

  it("extracts multiple criteria from TodoWrite", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"ISC-C1: First","status":"pending"},{"content":"ISC-C2: Second","status":"completed"}]},"id":"tw-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.iscUpdates[0]).toHaveLength(2);
  });
});

// ─── agent spawn ─────────────────────────────────────────────

describe("pipeline: agent spawn", () => {
  it("receives spawn event for Agent tool_use", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Agent","input":{"description":"Explore codebase","subagent_type":"Explore","prompt":"Find files"},"id":"agent-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    expect(result.agentEvents[0]?.kind).toBe("spawn");
  });

  it("captures agent name from description", async () => {
    const fake = new FakeCommand([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Agent","input":{"description":"Research types","prompt":"Do it"},"id":"agent-1"}]}}',
    ]);
    const result = await runPipeline(fake);
    const evt = result.agentEvents[0];
    expect(evt?.kind === "spawn" && evt.agent.name).toBe("Research types");
  });
});

// ─── agent lifecycle ─────────────────────────────────────────

describe("pipeline: agent lifecycle", () => {
  it("receives update event from task_progress", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"task_progress","tool_use_id":"agent-1","description":"Reading file.ts"}',
    ]);
    const result = await runPipeline(fake);
    expect(result.agentEvents[0]?.kind).toBe("update");
  });

  it("receives update event from task_notification", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"task_notification","tool_use_id":"agent-1","status":"completed"}',
    ]);
    const result = await runPipeline(fake);
    const evt = result.agentEvents[0];
    expect(evt?.kind === "update" && evt.status).toBe("completed");
  });
});

// ─── result event ────────────────────────────────────────────

describe("pipeline: result", () => {
  it("captures session_id from result", async () => {
    const fake = new FakeCommand([
      '{"type":"result","session_id":"sess-abc-123","total_cost_usd":0.05,"duration_ms":3000}',
    ]);
    const result = await runPipeline(fake);
    expect(result.sessionIds[0]).toBe("sess-abc-123");
  });

  it("captures cost from result", async () => {
    const fake = new FakeCommand([
      '{"type":"result","session_id":"sess-1","total_cost_usd":0.042,"duration_ms":5000}',
    ]);
    const result = await runPipeline(fake);
    expect(result.finalizations[0]?.costUsd).toBe(0.042);
  });

  it("captures duration from result", async () => {
    const fake = new FakeCommand([
      '{"type":"result","session_id":"sess-1","total_cost_usd":0.01,"duration_ms":7500}',
    ]);
    const result = await runPipeline(fake);
    expect(result.finalizations[0]?.durationMs).toBe(7500);
  });

  it("sets result content when present", async () => {
    const fake = new FakeCommand([
      '{"type":"result","result":"Final answer here"}',
    ]);
    const result = await runPipeline(fake);
    expect(result.content).toBe("Final answer here");
  });
});

// ─── close handling ──────────────────────────────────────────

describe("pipeline: close", () => {
  it("records close payload with exit code 0", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"test"}',
    ]);
    const result = await runPipeline(fake);
    expect(result.closePayload?.code).toBe(0);
  });

  it("records non-zero exit code", async () => {
    const fake = new FakeCommand([], { exitCode: 1 });
    const result = await runPipeline(fake);
    expect(result.closePayload?.code).toBe(1);
  });
});

// ─── byte mode (raw encoding) ────────────────────────────────

describe("pipeline: raw byte encoding", () => {
  it("decodes Uint8Array stdout correctly", async () => {
    const fake = new FakeCommand(
      ['{"type":"assistant","message":{"content":[{"type":"text","text":"byte mode works"}]}}'],
      { emitAsBytes: true },
    );
    const result = await runPipeline(fake);
    expect(result.content).toBe("byte mode works");
  });
});

// ─── multi-event full session ────────────────────────────────

describe("pipeline: full session simulation", () => {
  it("processes init, streaming, text, and result in sequence", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}}',
      '{"type":"result","session_id":"sess-full","total_cost_usd":0.03,"duration_ms":2000}',
    ]);
    const result = await runPipeline(fake);
    expect(result.sessionIds[0]).toBe("sess-full");
  });

  it("accumulates streamed content across full session", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}}',
      '{"type":"result","session_id":"sess-full","total_cost_usd":0.03,"duration_ms":2000}',
    ]);
    const result = await runPipeline(fake);
    expect(result.content).toBe("Hello world");
  });

  it("finalizes with cost after full session", async () => {
    const fake = new FakeCommand([
      '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}}',
      '{"type":"result","total_cost_usd":0.03,"duration_ms":2000}',
    ]);
    const result = await runPipeline(fake);
    expect(result.finalizations[0]?.costUsd).toBe(0.03);
  });
});

// ─── fixture-based tests ─────────────────────────────────────

describe("pipeline: fixture replay", () => {
  it("replays sample-session fixture and captures session id", async () => {
    const { loadFixtureFile } = await import("./FakeCommand");
    const fake = await loadFixtureFile(new URL("./fixtures/sample-session.jsonl", import.meta.url).pathname);
    const result = await runPipeline(fake);
    expect(result.sessionIds[0]).toBe("fixture-sess-001");
  });

  it("replays sample-session fixture and captures cost", async () => {
    const { loadFixtureFile } = await import("./FakeCommand");
    const fake = await loadFixtureFile(new URL("./fixtures/sample-session.jsonl", import.meta.url).pathname);
    const result = await runPipeline(fake);
    expect(result.finalizations[0]?.costUsd).toBe(0.015);
  });

  it("replays sample-session fixture and captures content", async () => {
    const { loadFixtureFile } = await import("./FakeCommand");
    const fake = await loadFixtureFile(new URL("./fixtures/sample-session.jsonl", import.meta.url).pathname);
    const result = await runPipeline(fake);
    expect(result.content).toContain("Hello from a fixture!");
  });
});

// To add a real captured session:
// 1. Run Claude with a test prompt and save the stream-json output:
//    claude -p "your prompt" --output-format stream-json > captured.jsonl
// 2. Drop the file in src/utils/__tests__/fixtures/
// 3. Add tests that replay it through runPipeline(loadFixtureFile(path))
