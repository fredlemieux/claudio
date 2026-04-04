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
    let latestMessages = [...currentMessages, userMsg, assistantMsg];
    updateMessages(sessionId, latestMessages);
    setIsStreaming(true);
    setToolCalls([]);

    const updateContent = (fullContent: string) => {
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: fullContent } : m
      );
      updateMessages(sessionId!, latestMessages);
      const algoState = parseAlgorithmState(fullContent);
      if (algoState.phases.some((p) => p.status !== "pending")) {
        setAlgoPhases(algoState.phases);
        setAlgoCriteria(algoState.criteria);
      }
    };

    try {
      const currentSession = sessions.find((s) => s.id === sessionId);
      const claudeSessionId = currentSession?.claudeSessionId;
      const cwd = currentSession?.workingDirectory;
      const baseArgs = ["-p", trimmed, "--output-format", "json", "--model", model];
      const args = claudeSessionId
        ? [...baseArgs, "--resume", claudeSessionId]
        : baseArgs;

      addLog("info", "app", `Executing: claude ${args.join(" ")}${cwd ? ` (cwd: ${cwd})` : ""}`);

      const command = Command.create("claude", args, cwd ? { cwd } : undefined);
      const result = await command.execute();

      addLog("info", "process", `Process exited: code=${result.code}, stdout=${result.stdout.length} chars, stderr=${result.stderr.length} chars`);

      if (result.stderr) {
        addLog("error", "stderr", result.stderr.slice(0, 500));
      }

      if (result.code === 0 && result.stdout) {
        try {
          const response = JSON.parse(result.stdout);
          addLog("debug", "stdout", `Response type: ${response.type}, subtype: ${response.subtype}`);

          if (response.type === "result" && response.result) {
            updateContent(response.result);

            if (response.session_id) {
              setClaudeSessionId(sessionId!, response.session_id);
            }
            const costUsd = response.cost_usd ?? response.total_cost_usd;
            const durationMs = response.duration_ms ?? (Date.now() - now);
            latestMessages = latestMessages.map((m) =>
              m.id === assistantMsg.id ? { ...m, costUsd, durationMs } : m
            );
            updateMessages(sessionId!, latestMessages);

            addLog("info", "process", `Result: session=${response.session_id || "none"}, cost=$${costUsd ?? "?"}, duration=${durationMs}ms`);
          } else {
            const responseText = response.result || response.content || result.stdout;
            updateContent(typeof responseText === "string" ? responseText : JSON.stringify(responseText));
          }
        } catch {
          addLog("warn", "stdout", `Non-JSON response, using as plain text: ${result.stdout.slice(0, 100)}`);
          updateContent(result.stdout);
        }
      } else if (result.stderr) {
        updateContent(`**Error from Claude CLI:**\n\n\`\`\`\n${result.stderr}\n\`\`\``);
        setDebugVisible(true);
      } else if (result.code !== 0) {
        updateContent(`**Process exited with code ${result.code}**\n\nCheck the debug console for details.`);
      }

      setIsStreaming(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog("error", "app", `Failed to spawn claude: ${errMsg}`);
      updateMessages(sessionId!, latestMessages.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: `**Failed to start Claude:**\n\n\`\`\`\n${errMsg}\n\`\`\`\n\nCheck the debug console for details.` }
          : m
      ));
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
