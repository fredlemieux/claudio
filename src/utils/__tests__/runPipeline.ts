/**
 * runPipeline — feeds a FakeCommand through the same decode→parse→handleStreamEvent
 * pipeline that useClaude.sendMessage uses, collecting all callback results.
 *
 * This is the E2E test harness: it proves the full stream works end-to-end
 * without React, Tauri, or a real Claude process.
 */

import type {
  StreamEvent, StreamEventCallbacks, ISCriterion, AgentEvent, StreamStep, LogEntry,
} from "../../types";
import { handleStreamEvent } from "../handleStreamEvent";
import { FakeCommand } from "./FakeCommand";

export interface PipelineResult {
  logs: Array<{ level: LogEntry["level"]; source: LogEntry["source"]; message: string }>;
  steps: StreamStep[];
  content: string;
  sessionIds: string[];
  finalizations: Array<{ costUsd?: number; durationMs?: number }>;
  iscUpdates: ISCriterion[][];
  agentEvents: AgentEvent[];
  closePayload: { code: number | null; signal: string | null } | null;
}

export function runPipeline(fake: FakeCommand): Promise<PipelineResult> {
  return new Promise((resolve) => {
    const result: PipelineResult = {
      logs: [],
      steps: [],
      content: "",
      sessionIds: [],
      finalizations: [],
      iscUpdates: [],
      agentEvents: [],
      closePayload: null,
    };

    const callbacks: StreamEventCallbacks = {
      addLog: (level, source, message) => {
        result.logs.push({ level, source, message });
      },
      addStep: (step) => {
        result.steps.push(step);
      },
      appendContent: (delta) => {
        result.content += delta;
      },
      setContent: (full) => {
        result.content = full;
      },
      finalizeMessage: (costUsd, durationMs) => {
        result.finalizations.push({ costUsd, durationMs });
      },
      onSessionId: (id) => {
        result.sessionIds.push(id);
      },
      getBuffer: () => result.content,
      startTime: 1000,
      onISCCriteria: (criteria) => {
        result.iscUpdates.push(criteria);
      },
      onAgentUpdate: (event) => {
        result.agentEvents.push(event);
      },
    };

    // Wire up the same stdout→parse→handleStreamEvent pipeline as useClaude
    const decoder = new TextDecoder();
    let lineBuffer = "";

    fake.stdout.on("data", (rawData: Uint8Array | string) => {
      const chunk = typeof rawData === "string"
        ? rawData
        : decoder.decode(new Uint8Array(rawData), { stream: true });

      lineBuffer += chunk;
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event: StreamEvent = JSON.parse(trimmed);
          handleStreamEvent(event, trimmed, callbacks);
        } catch {
          result.logs.push({ level: "warn", source: "stdout", message: `JSON parse failed: ${trimmed.slice(0, 200)}` });
        }
      }
    });

    fake.on("close", (payload) => {
      // Flush remaining line buffer (same as useClaude)
      if (lineBuffer.trim()) {
        try {
          const event: StreamEvent = JSON.parse(lineBuffer.trim());
          handleStreamEvent(event, lineBuffer.trim(), callbacks);
        } catch { /* ignore */ }
        lineBuffer = "";
      }
      result.closePayload = payload;
      resolve(result);
    });

    // Start the fake process
    fake.spawn();
  });
}
