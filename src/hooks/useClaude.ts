import { useCallback, useRef, useState } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import type {
  Message, StreamStep, ClaudeModel, StreamEvent, StreamEventCallbacks, ToolCall,
} from "../types";
import { parseAlgorithmState } from "../components/AlgorithmTracker";
import type { Session } from "./useSessions";
import { handleStreamEvent } from "../utils/handleStreamEvent";
import { useDebugLog } from "./useDebugLog";
import { useISC } from "./useISC";
import { useAgentTracker } from "./useAgentTracker";

// ─── Process types ───────────────────────────────────────────

interface SpawnedChild {
  pid: number;
  kill(): Promise<void>;
}

interface SpawnableCommand {
  stdout: { on(event: "data", cb: (data: Uint8Array | string) => void): void };
  stderr: { on(event: "data", cb: (data: Uint8Array | string) => void): void };
  on(event: "close", cb: (payload: { code: number | null; signal: string | null }) => void): void;
  on(event: "error", cb: (error: string) => void): void;
  spawn(): Promise<SpawnedChild>;
}

export type CommandFactory = (
  program: string,
  args: string[],
  opts: Record<string, unknown>,
) => SpawnableCommand;

// ─── Stream buffer ───────────────────────────────────────────

interface StreamBuffer {
  append(delta: string): void;
  setFull(content: string): void;
  addStep(step: StreamStep): void;
  getContent(): string;
  forceFlush(): void;
}

function createStreamBuffer(
  onFlush: (content: string, steps: StreamStep[]) => void,
): StreamBuffer {
  let content = "";
  let steps: StreamStep[] = [];
  let rafPending = false;

  const flush = () => { rafPending = false; onFlush(content, steps); };
  const schedule = () => { if (!rafPending) { rafPending = true; requestAnimationFrame(flush); } };

  return {
    append: (delta) => { content += delta; schedule(); },
    setFull: (full) => { content = full; flush(); },
    addStep: (step) => { steps = [...steps, step]; schedule(); },
    getContent: () => content,
    forceFlush: flush,
  };
}

// ─── Options ─────────────────────────────────────────────────

export interface UseClaudeOptions {
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  createSession: () => Session;
  updateMessages: (sessionId: string, messages: Message[]) => void;
  setClaudeSessionId: (sessionId: string, claudeSessionId: string) => void;
  model: ClaudeModel;
  createCommand?: CommandFactory;
}

// ─── Hook ────────────────────────────────────────────────────

export function useClaude({
  sessions,
  activeSessionId,
  activeSession,
  createSession,
  updateMessages,
  setClaudeSessionId,
  model,
  createCommand = Command.create as unknown as CommandFactory,
}: UseClaudeOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const childRef = useRef<SpawnedChild | null>(null);

  const { debugLogs, debugVisible, setDebugVisible, addLog, clearLogs } = useDebugLog();
  const { algoPhases, setAlgoPhases, algoCriteria, updateCriteria, updateCriteriaStatus, resetISC } = useISC(activeSessionId);
  const { agents, handleAgentEvent, resetAgents } = useAgentTracker();

  const stopStreaming = useCallback(async () => {
    if (childRef.current) {
      try { await childRef.current.kill(); } catch (err) { console.error("Failed to kill process:", err); }
      childRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetForNewChat = useCallback(() => {
    resetAgents();
    resetISC();
  }, [resetAgents, resetISC]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) { sessionId = createSession().id; }

    const now = Date.now();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: now };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", timestamp: now, steps: [] };

    const currentMessages = activeSession?.messages || [];
    let latestMessages = [...currentMessages, userMsg, assistantMsg];
    updateMessages(sessionId, latestMessages);
    setIsStreaming(true);
    setToolCalls([]);

    const buf = createStreamBuffer((content, steps) => {
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content, steps } : m
      );
      updateMessages(sessionId!, latestMessages);
      const algoState = parseAlgorithmState(content);
      if (algoState.phases.some((p) => p.status !== "pending")) setAlgoPhases(algoState.phases);
      if (algoState.criteria.length > 0) updateCriteriaStatus(algoState.criteria);
    });

    const streamCallbacks: StreamEventCallbacks = {
      addLog,
      addStep: buf.addStep,
      appendContent: buf.append,
      setContent: buf.setFull,
      finalizeMessage: (costUsd, durationMs) => {
        buf.forceFlush();
        latestMessages = latestMessages.map((m) =>
          m.id === assistantMsg.id ? { ...m, costUsd, durationMs } : m
        );
        updateMessages(sessionId!, latestMessages);
      },
      onSessionId: (id) => setClaudeSessionId(sessionId!, id),
      getBuffer: buf.getContent,
      startTime: now,
      onISCCriteria: updateCriteria,
      onAgentUpdate: handleAgentEvent,
    };

    try {
      const currentSession = sessions.find((s) => s.id === sessionId);
      const claudeSessionId = currentSession?.claudeSessionId;
      const cwd = currentSession?.workingDirectory;
      const baseArgs = ["-p", trimmed, "--output-format", "stream-json", "--verbose", "--model", model];
      const args = claudeSessionId ? [...baseArgs, "--resume", claudeSessionId] : baseArgs;

      addLog("info", "app", `Spawning: claude ${args.join(" ")}${cwd ? ` (cwd: ${cwd})` : ""}`);

      const spawnOpts: Record<string, unknown> = { ...(cwd ? { cwd } : {}), encoding: "raw" };
      const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@" < /dev/null';
      const command = createCommand("bash", ["-c", bashScript, "--", ...args], spawnOpts);

      let stdoutChunkCount = 0;
      const decoder = new TextDecoder();
      let lineBuffer = "";

      command.stdout.on("data", (rawData: Uint8Array | string) => {
        stdoutChunkCount++;
        const chunk = typeof rawData === "string" ? rawData : decoder.decode(new Uint8Array(rawData), { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            handleStreamEvent(JSON.parse(t) as StreamEvent, t, streamCallbacks);
          } catch (e) {
            addLog("warn", "stdout", `JSON parse FAILED: ${e}. Raw: ${t.slice(0, 300)}`);
          }
        }
      });

      const stderrDecoder = new TextDecoder();
      command.stderr.on("data", (rawData: Uint8Array | string) => {
        const text = typeof rawData === "string" ? rawData : stderrDecoder.decode(new Uint8Array(rawData), { stream: true });
        addLog("error", "stderr", text);
      });

      command.on("close", (payload) => {
        if (lineBuffer.trim()) {
          try { handleStreamEvent(JSON.parse(lineBuffer.trim()) as StreamEvent, lineBuffer.trim(), streamCallbacks); }
          catch { addLog("warn", "stdout", `Final lineBuffer not valid JSON: ${lineBuffer.slice(0, 200)}`); }
          lineBuffer = "";
        }
        addLog("info", "process", `Process CLOSED: code=${payload.code}, signal=${payload.signal ?? "none"}`);
        childRef.current = null;
        if (payload.code !== 0 && !buf.getContent()) {
          buf.setFull(payload.signal
            ? `**Process killed** (signal: ${payload.signal})`
            : `**Process exited with code ${payload.code}**\n\nCheck the debug console for details.`);
          setDebugVisible(true);
        }
        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        addLog("error", "process", `Process ERROR: ${error}`);
        buf.setFull(`**Process error:**\n\n\`\`\`\n${error}\n\`\`\``);
        setIsStreaming(false);
        setDebugVisible(true);
      });

      const child = await command.spawn();
      addLog("info", "app", `Spawn succeeded, pid=${child.pid}`);
      childRef.current = child;

      setTimeout(() => {
        if (stdoutChunkCount === 0 && childRef.current) {
          addLog("warn", "app", `No stdout after 15s — process may be hung.`);
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
  }, [isStreaming, activeSessionId, activeSession, sessions, createSession, updateMessages, setClaudeSessionId, model, addLog, setAlgoPhases, updateCriteria, updateCriteriaStatus, handleAgentEvent, setDebugVisible, createCommand]);

  return {
    isStreaming, sendMessage, stopStreaming, resetForNewChat,
    agents, algoPhases, algoCriteria, toolCalls,
    debugLogs, debugVisible, setDebugVisible, addLog, clearLogs,
  };
}
