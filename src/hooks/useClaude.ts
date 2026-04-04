import { useState, useRef, useCallback } from "react";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import { parseAlgorithmState, type AlgorithmPhase, type ISCriterion } from "../components/AlgorithmTracker";
import type { AgentInfo } from "../components/AgentDrawer";
import type { ToolCall } from "../components/ToolUseIndicator";
import type { LogEntry } from "../components/DebugConsole";
import type { Message } from "../types";
import type { Session } from "./useSessions";
import type { ClaudeModel } from "../components/SettingsPanel";

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
    };

    const currentMessages = activeSession?.messages || [];
    const messagesRef = [...currentMessages, userMsg, assistantMsg];
    let latestMessages = messagesRef;
    updateMessages(sessionId, latestMessages);
    setIsStreaming(true);
    setToolCalls([]);

    // Content buffer for rAF-debounced streaming updates
    let contentBuffer = "";
    let rafPending = false;

    const flushContent = () => {
      rafPending = false;
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: contentBuffer } : m
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

    function handleStreamEvent(event: StreamEvent) {
      switch (event.type) {
        case "system": {
          if (event.subtype === "init") {
            addLog("info", "system", `Session init: model=${event.model}`);
          } else {
            addLog("debug", "system", `${event.subtype}: ${JSON.stringify(event).slice(0, 200)}`);
          }
          break;
        }

        case "assistant": {
          // Complete assistant message — extract text content
          const msg = event.message as { content?: Array<{ type: string; text?: string }> } | undefined;
          const text = msg?.content
            ?.filter((b) => b.type === "text")
            .map((b) => b.text ?? "")
            .join("") ?? "";
          if (text) {
            setContent(text);
          }
          break;
        }

        case "stream_event": {
          // Partial streaming token — append to content buffer
          const streamEvt = event.event as {
            type: string;
            delta?: { type: string; text?: string };
          } | undefined;
          if (streamEvt?.type === "content_block_delta" && streamEvt.delta?.text) {
            appendContent(streamEvt.delta.text);
          }
          break;
        }

        case "result": {
          if (event.session_id) {
            setClaudeSessionId(sessionId!, event.session_id as string);
          }
          const costUsd = (event.total_cost_usd ?? event.cost_usd) as number | undefined;
          const durationMs = (event.duration_ms ?? (Date.now() - now)) as number;

          // If result contains final text, use it
          if (typeof event.result === "string" && event.result) {
            setContent(event.result);
          }

          finalizeMessage(costUsd, durationMs);
          addLog("info", "process", `Result: session=${event.session_id || "none"}, cost=$${costUsd ?? "?"}, duration=${durationMs}ms`);
          break;
        }

        case "rate_limit_event":
          addLog("warn", "system", `Rate limit: ${JSON.stringify(event.rate_limit_info)}`);
          break;

        default:
          addLog("debug", "stream", `Event: ${event.type}/${event.subtype ?? ""}`);
      }
    }

    try {
      const currentSession = sessions.find((s) => s.id === sessionId);
      const claudeSessionId = currentSession?.claudeSessionId;
      const cwd = currentSession?.workingDirectory;
      const baseArgs = ["-p", trimmed, "--output-format", "stream-json", "--model", model];
      const args = claudeSessionId
        ? [...baseArgs, "--resume", claudeSessionId]
        : baseArgs;

      addLog("info", "app", `Spawning: claude ${args.join(" ")}${cwd ? ` (cwd: ${cwd})` : ""}`);

      const command = Command.create("claude", args, cwd ? { cwd } : undefined);

      // Wire up event handlers before spawn
      command.stdout.on("data", (line: string) => {
        if (!line.trim()) return;
        try {
          const event: StreamEvent = JSON.parse(line);
          handleStreamEvent(event);
        } catch {
          addLog("warn", "stdout", `Non-JSON line: ${line.slice(0, 200)}`);
        }
      });

      command.stderr.on("data", (line: string) => {
        addLog("error", "stderr", line);
      });

      command.on("close", (payload) => {
        childRef.current = null;
        addLog("info", "process", `Process exited: code=${payload.code}, signal=${payload.signal ?? "none"}`);

        // If non-zero exit without a result event, show error
        if (payload.code !== 0 && !contentBuffer) {
          const errorContent = payload.signal
            ? `**Process killed** (signal: ${payload.signal})`
            : `**Process exited with code ${payload.code}**\n\nCheck the debug console for details.`;
          setContent(errorContent);
          setDebugVisible(true);
        }

        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        addLog("error", "process", `Process error: ${error}`);
        setContent(`**Process error:**\n\n\`\`\`\n${error}\n\`\`\``);
        setIsStreaming(false);
        setDebugVisible(true);
      });

      // Spawn the process
      const child = await command.spawn();
      childRef.current = child;

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
