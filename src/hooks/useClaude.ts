import {useCallback, useEffect, useRef, useState} from "react";
import {Command} from "@tauri-apps/plugin-shell";
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
import {handleStreamEvent, type StreamEvent, type StreamEventCallbacks} from "../utils/handleStreamEvent";

const ISC_PREFIX = "claudio-isc-";

function loadISC(sessionId: string): ISCriterion[] {
  try {
    const stored = localStorage.getItem(ISC_PREFIX + sessionId);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveISC(sessionId: string, criteria: ISCriterion[]) {
  localStorage.setItem(ISC_PREFIX + sessionId, JSON.stringify(criteria));
}

// Minimal interface for the Tauri Child object — only what useClaude actually uses.
interface SpawnedChild {
  pid: number;
  kill(): Promise<void>;
}

// Minimal interface for the Tauri Command object — only the surface useClaude touches.
// Keeping this separate from Tauri's types lets tests inject a fake without Tauri.
interface SpawnableCommand {
  stdout: { on(event: "data", cb: (data: Uint8Array | string) => void): void };
  stderr: { on(event: "data", cb: (data: Uint8Array | string) => void): void };
  on(event: "close", cb: (payload: { code: number | null; signal: string | null }) => void): void;
  on(event: "error", cb: (error: string) => void): void;
  spawn(): Promise<SpawnedChild>;
}

/**
 * Factory that creates a command object. Defaults to Tauri's Command.create.
 * Inject a fake in tests to exercise sendMessage without spawning real processes.
 */
export type CommandFactory = (
  program: string,
  args: string[],
  opts: Record<string, unknown>,
) => SpawnableCommand;

export interface UseClaudeOptions {
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  createSession: () => Session;
  updateMessages: (sessionId: string, messages: Message[]) => void;
  setClaudeSessionId: (sessionId: string, claudeSessionId: string) => void;
  model: ClaudeModel;
  /** Override the command factory — defaults to Tauri's Command.create. Useful in tests. */
  createCommand?: CommandFactory;
}
interface StreamBuffer {
  /** Append a text delta and schedule an rAF flush. */
  append(delta: string): void;
  /** Replace the entire content and flush immediately. */
  setFull(content: string): void;
  /** Add a step entry and schedule an rAF flush. */
  addStep(step: StreamStep): void;
  /** Return the current accumulated content string. */
  getContent(): string;
  /** Flush immediately, bypassing rAF debouncing. */
  forceFlush(): void;
}

/**
 * Creates a buffer that coalesces rapid content updates via rAF debouncing.
 * Call once per sendMessage invocation — not at the React hook level.
 *
 * onFlush receives the latest content + steps each time the buffer drains.
 */
function createStreamBuffer(
  onFlush: (content: string, steps: StreamStep[]) => void,
): StreamBuffer {
  let content = "";
  let steps: StreamStep[] = [];
  let rafPending = false;

  const flush = () => {
    rafPending = false;
    onFlush(content, steps);
  };

  const schedule = () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flush);
    }
  };

  return {
    append: (delta) => { content += delta; schedule(); },
    setFull: (full) => { content = full; flush(); },
    addStep: (step) => { steps = [...steps, step]; schedule(); },
    getContent: () => content,
    forceFlush: flush,
  };
}

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
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [algoPhases, setAlgoPhases] = useState<AlgorithmPhase[]>([]);
  const [algoCriteria, setAlgoCriteria] = useState<ISCriterion[]>(() =>
    activeSessionId ? loadISC(activeSessionId) : []
  );
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);
  const childRef = useRef<SpawnedChild | null>(null);

  // Load persisted criteria when session changes
  useEffect(() => {
    setAlgoCriteria(activeSessionId ? loadISC(activeSessionId) : []);
  }, [activeSessionId]);

  // Persist criteria whenever they change
  useEffect(() => {
    if (activeSessionId) saveISC(activeSessionId, algoCriteria);
  }, [activeSessionId, algoCriteria]);

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

    const buf = createStreamBuffer((content, steps) => {
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content, steps } : m
      );
      updateMessages(sessionId!, latestMessages);
      const algoState = parseAlgorithmState(content);
      const hasActivePhases = algoState.phases.some((p) => p.status !== "pending");
      if (hasActivePhases) setAlgoPhases(algoState.phases);
      if (algoState.criteria.length > 0) setAlgoCriteria(algoState.criteria);
      // Debug: log whenever ISC or phases are detected so we can trace parsing
      if (hasActivePhases || algoState.criteria.length > 0) {
        addLog("debug", "app", `[ISC] phases=${algoState.phases.filter(p => p.status !== "pending").map(p => p.name).join(",") || "none"} criteria=${algoState.criteria.length} (${algoState.criteria.map(c => c.id).join(",")})`);
      }
    });

    const finalizeMessage = (costUsd?: number, durationMs?: number) => {
      buf.forceFlush();
      latestMessages = latestMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, costUsd, durationMs } : m
      );
      updateMessages(sessionId!, latestMessages);
    };

    // Wire up the callbacks that connect the pure handleStreamEvent function
    // to this message send's local state (buf, latestMessages, etc.)
    const streamCallbacks: StreamEventCallbacks = {
      addLog,
      addStep: buf.addStep,
      appendContent: buf.append,
      setContent: buf.setFull,
      finalizeMessage,
      onSessionId: (claudeSessionId) => setClaudeSessionId(sessionId!, claudeSessionId),
      getBuffer: buf.getContent,
      startTime: now,
      onISCCriteria: (newCriteria) => setAlgoCriteria((prev) => {
        const merged = [...prev];
        for (const c of newCriteria) {
          const idx = merged.findIndex((e) => e.id === c.id);
          if (idx >= 0) merged[idx] = c;
          else merged.push(c);
        }
        return merged;
      }),
      onAgentUpdate: (agent) => setAgents((prev) => {
        const idx = prev.findIndex((a) => a.id === agent.id);
        if (idx >= 0) {
          // Merge — keep existing fields, update status/output
          const existing = prev[idx];
          const updated = [...prev];
          updated[idx] = {
            ...existing,
            status: agent.status,
            output: agent.output || existing.output,
          };
          return updated;
        }
        // New agent
        return [...prev, agent];
      }),
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
      const command = createCommand("bash", bashArgs, spawnOpts);
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

        addLog("info", "process", `Process CLOSED: code=${payload.code}, signal=${payload.signal ?? "none"}, stdoutChunks=${stdoutChunkCount}, stderrLines=${stderrLineCount}, contentBuffer=${buf.getContent().length} chars`);
        childRef.current = null;

        // If non-zero exit without a result event, show error
        if (payload.code !== 0 && !buf.getContent()) {
          addLog("warn", "process", `Non-zero exit with empty content buffer — showing error to user`);
          const errorContent = payload.signal
            ? `**Process killed** (signal: ${payload.signal})`
            : `**Process exited with code ${payload.code}**\n\nCheck the debug console for details.`;
          buf.setFull(errorContent);
          setDebugVisible(true);
        } else if (payload.code === 0 && !buf.getContent()) {
          addLog("warn", "process", `Exit code 0 but content buffer is EMPTY — no content was streamed`);
        }

        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        addLog("error", "process", `Process ERROR event: ${error}`);
        buf.setFull(`**Process error:**\n\n\`\`\`\n${error}\n\`\`\``);
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
          addLog("warn", "app", `⚠️ No stdout chunks received after 15s! pid=${child.pid}, stderrLines=${stderrLineCount}, bufLen=${buf.getContent().length}. Process may be hung.`);
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
