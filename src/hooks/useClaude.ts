import {useCallback, useRef, useState} from "react";
import {type Child, Command} from "@tauri-apps/plugin-shell";
import {
  type AlgorithmPhase,
  type ISCriterion,
  parseAlgorithmState
} from "../components/AlgorithmTracker";
import type {AgentInfo} from "../components/AgentDrawer";
import type {ToolCall} from "../components/ToolUseIndicator";
import type {LogEntry} from "../components/DebugConsole";
import type {Message, StreamStep} from "../types";
import type {Session} from "./useSessions";
import type {ClaudeModel} from "../components/SettingsPanel";

export interface UseClaudeOptions {
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  createSession: () => Session;
  updateMessages: (sessionId: string, messages: Message[]) => void;
  setClaudeSessionId: (sessionId: string, claudeSessionId: string) => void;
  model: ClaudeModel;
}

interface StreamEvent {
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
  switch (event.type) {
    case "system": {
      if (event.subtype === "init") {
        cb.addLog("info", "system", `Session init: model=${event.model}`);
        cb.addStep({
          id: crypto.randomUUID(), type: "system", timestamp: Date.now(),
          summary: `Session init — model: ${event.model}`,
          rawJson: rawJsonStr,
        });
      } else {
        cb.addLog("debug", "system", `${event.subtype}: ${JSON.stringify(event).slice(0, 200)}`);
      }
      break;
    }

    case "assistant": {
      const msg = event.message as {
        content?: Array<{ type: string; text?: string; thinking?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
      } | undefined;
      const blocks = msg?.content ?? [];
      cb.addLog("debug", "stream", `assistant event: ${blocks.length} blocks`);

      for (const block of blocks) {
        if (block.type === "thinking" && block.thinking) {
          cb.addStep({
            id: crypto.randomUUID(), type: "thinking", timestamp: Date.now(),
            summary: block.thinking.slice(0, 300) + (block.thinking.length > 300 ? "…" : ""),
            rawJson: rawJsonStr,
          });
        } else if (block.type === "text" && block.text) {
          cb.addLog("debug", "stream", `text: ${block.text.length} chars`);
          // Append with separator — multi-turn responses produce multiple assistant events,
          // each with the complete text for that turn. stream_event deltas already built
          // the content for this turn, so skip if the buffer already ends with this text.
          const buffer = cb.getBuffer();
          if (buffer && !buffer.endsWith(block.text)) {
            cb.appendContent("\n\n" + block.text);
          } else if (!buffer) {
            cb.setContent(block.text);
          }
          cb.addStep({
            id: crypto.randomUUID(), type: "text", timestamp: Date.now(),
            summary: block.text,
            rawJson: rawJsonStr,
          });
        } else if (block.type === "tool_use") {
          const inputStr = block.input ? JSON.stringify(block.input) : "";
          const inputPreview = inputStr.slice(0, 200) + (inputStr.length > 200 ? "…" : "");
          cb.addStep({
            id: crypto.randomUUID(), type: "tool_use", timestamp: Date.now(),
            toolName: block.name,
            summary: `${block.name}(${inputPreview})`,
            rawJson: rawJsonStr,
          });
        }
      }
      break;
    }

    case "user": {
      // Tool results
      const userMsg = event.message as {
        content?: Array<{ type: string; content?: string; tool_use_id?: string; is_error?: boolean }>;
      } | undefined;
      const results = userMsg?.content ?? [];
      for (const result of results) {
        if (result.type === "tool_result") {
          const preview = (result.content ?? "").slice(0, 300) + ((result.content?.length ?? 0) > 300 ? "…" : "");
          cb.addStep({
            id: crypto.randomUUID(), type: "tool_result", timestamp: Date.now(),
            summary: result.is_error ? `ERROR: ${preview}` : preview,
            rawJson: rawJsonStr,
          });
        }
      }
      cb.addLog("debug", "stream", `user event: ${results.length} results`);
      break;
    }

    case "stream_event": {
      const streamEvt = event.event as {
        type: string;
        delta?: { type: string; text?: string };
      } | undefined;
      if (streamEvt?.type === "content_block_delta" && streamEvt.delta?.text) {
        cb.appendContent(streamEvt.delta.text);
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
        cb.onSessionId(event.session_id as string);
      }
      const costUsd = (event.total_cost_usd ?? event.cost_usd) as number | undefined;
      const durationMs = (event.duration_ms ?? (Date.now() - cb.startTime)) as number;

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
      cb.addLog("debug", "stream", `Event: ${event.type}/${event.subtype ?? ""}`);
  }
}

export function useClaude({
  sessions,
  activeSessionId,
  activeSession,
  createSession,
  updateMessages,
  setClaudeSessionId,
  model,
}: UseClaudeOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [algoPhases, setAlgoPhases] = useState<AlgorithmPhase[]>([]);
  const [algoCriteria, setAlgoCriteria] = useState<ISCriterion[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);
  const childRef = useRef<Child | null>(null);

  const addLog = useCallback((level: LogEntry["level"], source: LogEntry["source"], message: string) => {
    setDebugLogs((prev) => [
      ...prev.slice(-500),
      { id: crypto.randomUUID(), timestamp: Date.now(), level, source, message },
    ]);
  }, []);

  const clearLogs = useCallback(() => setDebugLogs([]), []);

  const stopStreaming = useCallback(async () => {
    if (childRef.current) {
      try {
        await childRef.current.kill();
      } catch (err) {
        console.error("Failed to kill process:", err);
      }
      childRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetForNewChat = useCallback(() => {
    setAgents([]);
    setAlgoPhases([]);
    setAlgoCriteria([]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = createSession();
      sessionId = session.id;
    }

    const now = Date.now();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: now,
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: now,
      steps: [],
    };

    const currentMessages = activeSession?.messages || [];
    let latestMessages = [...currentMessages, userMsg, assistantMsg];
    updateMessages(sessionId, latestMessages);
    setIsStreaming(true);
    setToolCalls([]);

    // Content buffer for rAF-debounced streaming updates
    let contentBuffer = "";
    let stepsBuffer: StreamStep[] = [];
    let rafPending = false;

    const addStep = (step: StreamStep) => {
      stepsBuffer = [...stepsBuffer, step];
      scheduleFlush();
    };

    const flushContent = () => {
      rafPending = false;
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: contentBuffer, steps: stepsBuffer } : m
      );
      updateMessages(sessionId!, latestMessages);
      const algoState = parseAlgorithmState(contentBuffer);
      if (algoState.phases.some((p) => p.status !== "pending")) {
        setAlgoPhases(algoState.phases);
        setAlgoCriteria(algoState.criteria);
      }
    };

    const scheduleFlush = () => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushContent);
      }
    };

    const appendContent = (delta: string) => {
      contentBuffer += delta;
      scheduleFlush();
    };

    const setContent = (fullContent: string) => {
      contentBuffer = fullContent;
      flushContent();
    };

    const finalizeMessage = (costUsd?: number, durationMs?: number) => {
      // Ensure final content is flushed
      flushContent();
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, costUsd, durationMs } : m
      );
      updateMessages(sessionId!, latestMessages);
    };

    // Wire up the callbacks that connect the pure handleStreamEvent function
    // to this message send's local state (contentBuffer, latestMessages, etc.)
    const streamCallbacks: StreamEventCallbacks = {
      addLog,
      addStep,
      appendContent,
      setContent,
      finalizeMessage,
      onSessionId: (claudeSessionId) => setClaudeSessionId(sessionId!, claudeSessionId),
      getBuffer: () => contentBuffer,
      startTime: now,
    };

    try {
      const currentSession = sessions.find((s) => s.id === sessionId);
      const claudeSessionId = currentSession?.claudeSessionId;
      const cwd = currentSession?.workingDirectory;
      const baseArgs = ["-p", trimmed, "--output-format", "stream-json", "--verbose", "--model", model];
      const args = claudeSessionId
        ? [...baseArgs, "--resume", claudeSessionId]
        : baseArgs;

      addLog("info", "app", `Spawning: claude ${args.join(" ")}${cwd ? ` (cwd: ${cwd})` : ""}`);

      // Use encoding: 'raw' to bypass Tauri Issue #1632 — spawn() buffers stdout
      // until a newline is encountered, which breaks streaming for long-running processes.
      // With raw encoding, we get Uint8Array chunks and handle decoding ourselves.
      // NOTE: Do NOT set `env` — Tauri replaces the entire environment instead of merging,
      // which strips PATH, HOME, etc. and causes claude to hang silently.
      const spawnOpts: Record<string, unknown> = {
        ...(cwd ? { cwd } : {}),
        encoding: "raw",
      };

      // ROOT CAUSE FIX: Tauri spawn() keeps stdin piped open with no JS-side close API
      // (Tauri Issue #2136). Claude -p waits for stdin EOF before processing (Claude
      // Issue #34455). Without EOF, it hangs forever producing zero output.
      //
      // Fix: Wrap via bash with `< /dev/null` to give claude immediate stdin EOF.
      // Also unset CLAUDECODE env vars to prevent nested session detection.
      // The '--' after the script separates bash args from positional params ($@).
      const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@" < /dev/null';
      const bashArgs = ["-c", bashScript, "--", ...args];
      addLog("info", "app", `Wrapping via bash (stdin=/dev/null): bash -c '...' -- ${args.join(" ")}`);
      const command = Command.create("bash", bashArgs, spawnOpts);
      addLog("debug", "app", `Command created (bash wrapper, encoding=raw), wiring event handlers...`);

      let stdoutChunkCount = 0;
      let stderrLineCount = 0;
      const decoder = new TextDecoder();
      let lineBuffer = ""; // accumulate partial lines from raw chunks

      // Wire up event handlers before spawn
      // With encoding: 'raw', data arrives as Uint8Array — decode and split on newlines
      command.stdout.on("data", (rawData: Uint8Array | string) => {
        stdoutChunkCount++;
        const chunk = typeof rawData === "string" ? rawData : decoder.decode(new Uint8Array(rawData), { stream: true });
        addLog("debug", "stdout", `[chunk ${stdoutChunkCount}] raw ${typeof rawData === "string" ? "string" : "bytes"}(${typeof rawData === "string" ? rawData.length : rawData.length}) decoded(${chunk.length} chars): ${chunk.slice(0, 200)}`);

        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        // Last element is either empty (if chunk ended with \n) or a partial line
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event: StreamEvent = JSON.parse(trimmed);
            addLog("debug", "stdout", `parsed OK → type=${event.type}, subtype=${event.subtype ?? "none"}`);
            handleStreamEvent(event, trimmed, streamCallbacks);
          } catch (parseErr) {
            addLog("warn", "stdout", `JSON parse FAILED: ${parseErr}. Raw: ${trimmed.slice(0, 300)}`);
          }
        }
      });

      // With encoding: 'raw', stderr also arrives as Uint8Array
      const stderrDecoder = new TextDecoder();
      command.stderr.on("data", (rawData: Uint8Array | string) => {
        stderrLineCount++;
        const text = typeof rawData === "string" ? rawData : stderrDecoder.decode(new Uint8Array(rawData), { stream: true });
        addLog("error", "stderr", `[line ${stderrLineCount}] ${text}`);
      });

      command.on("close", (payload) => {
        // Flush any remaining data in the line buffer
        if (lineBuffer.trim()) {
          addLog("debug", "stdout", `Flushing remaining lineBuffer (${lineBuffer.length} chars): ${lineBuffer.slice(0, 200)}`);
          try {
            const trimmedLine = lineBuffer.trim();
            const event: StreamEvent = JSON.parse(trimmedLine);
            handleStreamEvent(event, trimmedLine, streamCallbacks);
          } catch {
            addLog("warn", "stdout", `Final lineBuffer not valid JSON: ${lineBuffer.slice(0, 200)}`);
          }
          lineBuffer = "";
        }

        addLog("info", "process", `Process CLOSED: code=${payload.code}, signal=${payload.signal ?? "none"}, stdoutChunks=${stdoutChunkCount}, stderrLines=${stderrLineCount}, contentBuffer=${contentBuffer.length} chars`);
        childRef.current = null;

        // If non-zero exit without a result event, show error
        if (payload.code !== 0 && !contentBuffer) {
          addLog("warn", "process", `Non-zero exit with empty content buffer — showing error to user`);
          const errorContent = payload.signal
            ? `**Process killed** (signal: ${payload.signal})`
            : `**Process exited with code ${payload.code}**\n\nCheck the debug console for details.`;
          setContent(errorContent);
          setDebugVisible(true);
        } else if (payload.code === 0 && !contentBuffer) {
          addLog("warn", "process", `Exit code 0 but content buffer is EMPTY — no content was streamed`);
        }

        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        addLog("error", "process", `Process ERROR event: ${error}`);
        setContent(`**Process error:**\n\n\`\`\`\n${error}\n\`\`\``);
        setIsStreaming(false);
        setDebugVisible(true);
      });

      // Spawn the process
      addLog("debug", "app", `Calling command.spawn()...`);
      const child = await command.spawn();
      addLog("info", "app", `Spawn succeeded, child pid=${child.pid}`);
      childRef.current = child;

      // Timeout warning — Claude API can take 10-30s for cold start
      setTimeout(() => {
        if (stdoutChunkCount === 0 && childRef.current) {
          addLog("warn", "app", `⚠️ No stdout chunks received after 15s! pid=${child.pid}, stderrLines=${stderrLineCount}. Process may be hung.`);
          setDebugVisible(true);
        }
      }, 15000);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog("error", "app", `Failed to spawn claude: ${errMsg}`);
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: `**Failed to start Claude:**\n\n\`\`\`\n${errMsg}\n\`\`\`\n\nCheck the debug console for details.` }
          : m
      );
      updateMessages(sessionId!, latestMessages);
      setIsStreaming(false);
      setDebugVisible(true);
    }
  }, [isStreaming, activeSessionId, activeSession, sessions, createSession, updateMessages, setClaudeSessionId, model, addLog]);

  return {
    isStreaming,
    sendMessage,
    stopStreaming,
    resetForNewChat,
    agents,
    algoPhases,
    algoCriteria,
    toolCalls,
    debugLogs,
    debugVisible,
    setDebugVisible,
    addLog,
    clearLogs,
  };
}
