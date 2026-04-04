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
          addLog("debug", "stream", `assistant event: message content blocks=${msg?.content?.length ?? 0}`);
          const text = msg?.content
            ?.filter((b) => b.type === "text")
            .map((b) => b.text ?? "")
            .join("") ?? "";
          addLog("debug", "stream", `assistant text extracted: ${text.length} chars, first 100: ${text.slice(0, 100)}`);
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
            // Log every 20th token to avoid flooding
            if (contentBuffer.length % 200 < 10) {
              addLog("debug", "stream", `streaming... buffer=${contentBuffer.length} chars`);
            }
          } else {
            addLog("debug", "stream", `stream_event: subtype=${streamEvt?.type}, has delta=${!!streamEvt?.delta}, has text=${!!streamEvt?.delta?.text}`);
          }
          break;
        }

        case "result": {
          addLog("info", "stream", `result event received: subtype=${event.subtype}, session_id=${event.session_id ?? "none"}, has result=${!!event.result}`);
          if (event.session_id) {
            setClaudeSessionId(sessionId!, event.session_id as string);
          }
          const costUsd = (event.total_cost_usd ?? event.cost_usd) as number | undefined;
          const durationMs = (event.duration_ms ?? (Date.now() - now)) as number;

          // If result contains final text, use it
          if (typeof event.result === "string" && event.result) {
            addLog("debug", "stream", `result text: ${(event.result as string).length} chars`);
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
      const baseArgs = ["-p", trimmed, "--output-format", "stream-json", "--verbose", "--model", model];
      const args = claudeSessionId
        ? [...baseArgs, "--resume", claudeSessionId]
        : baseArgs;

      addLog("info", "app", `Spawning: claude ${args.join(" ")}${cwd ? ` (cwd: ${cwd})` : ""}`);
      addLog("debug", "app", `Session lookup: sessionId=${sessionId}, claudeSessionId=${claudeSessionId ?? "none"}, cwd=${cwd ?? "none"}`);

      // Use encoding: 'raw' to bypass Tauri Issue #1632 — spawn() buffers stdout
      // until a newline is encountered, which breaks streaming for long-running processes.
      // With raw encoding, we get Uint8Array chunks and handle decoding ourselves.
      // NOTE: Do NOT set `env` — Tauri replaces the entire environment instead of merging,
      // which strips PATH, HOME, etc. and causes claude to hang silently.
      const spawnOpts: Record<string, unknown> = {
        ...(cwd ? { cwd } : {}),
        encoding: "raw",
      };
      addLog("debug", "app", `Spawn options: ${JSON.stringify(spawnOpts)}`);

      // --- Diagnostics: incremental test battery ---
      // Tests progressively from simplest to most complex to find exactly where it breaks.
      // Each test logs results to debug console. All use execute() (proven working for quick cmds)
      // except the bash spawn test which validates Tauri's streaming delivery.

      const diagTests = [
        { name: "claude --version", args: ["--version"] },
        { name: "claude --help (length)", args: ["--help"] },
        { name: "claude -p 'hi' (no flags)", args: ["-p", "hi", "--model", "haiku"] },
        { name: "claude -p 'hi' --output-format json", args: ["-p", "hi", "--output-format", "json", "--model", "haiku"] },
        { name: "claude -p 'hi' --output-format stream-json --verbose", args: ["-p", "hi", "--output-format", "stream-json", "--verbose", "--model", "haiku"] },
      ];

      // Run execute() tests sequentially (each waits for result)
      for (let i = 0; i < diagTests.length; i++) {
        const test = diagTests[i];
        try {
          addLog("info", "diag", `[${i + 1}/${diagTests.length}] execute() ${test.name}`);
          const cmd = Command.create("claude", test.args);
          const out = await cmd.execute();
          const summary = out.stdout.length > 200
            ? `${out.stdout.length} chars, first 100: "${out.stdout.slice(0, 100)}"`
            : `"${out.stdout.trim()}"`;
          addLog("info", "diag", `[${i + 1}/${diagTests.length}] ${out.code === 0 ? "✅" : "❌"} exit=${out.code}, stdout=${summary}, stderr=${out.stderr.length > 0 ? `"${out.stderr.slice(0, 200)}"` : "empty"}`);
        } catch (err) {
          addLog("error", "diag", `[${i + 1}/${diagTests.length}] ❌ FAILED: ${err}`);
        }
      }

      // Spawn test: bash with timed echo — validates Tauri spawn() + raw encoding delivers stdout
      try {
        addLog("info", "diag", `[SPAWN] bash timed echo (encoding=raw) — Tauri streaming test`);
        const bashCmd = Command.create("bash", ["-c", "echo DIAG_IMMEDIATE && sleep 2 && echo DIAG_AFTER_2S"], { encoding: "raw" });
        let bashChunks = 0;
        const bashDecoder = new TextDecoder();
        bashCmd.stdout.on("data", (raw: Uint8Array | string) => {
          bashChunks++;
          const text = typeof raw === "string" ? raw : bashDecoder.decode(new Uint8Array(raw), { stream: true });
          addLog("info", "diag", `[SPAWN] 🔶 bash chunk #${bashChunks}: "${text.trim()}"`);
        });
        bashCmd.stderr.on("data", (raw: Uint8Array | string) => {
          const text = typeof raw === "string" ? raw : bashDecoder.decode(new Uint8Array(raw), { stream: true });
          addLog("warn", "diag", `[SPAWN] bash stderr: ${text}`);
        });
        bashCmd.on("close", (p) => {
          addLog("info", "diag", `[SPAWN] bash CLOSED: code=${p.code}, chunks=${bashChunks}`);
        });
        const bashChild = await bashCmd.spawn();
        addLog("info", "diag", `[SPAWN] bash pid=${bashChild.pid}`);
      } catch (diagErr) {
        addLog("error", "diag", `[SPAWN] ❌ bash FAILED: ${diagErr}`);
      }

      // Spawn test: simplest claude -p via bash wrapper (stdin from /dev/null + unsets env)
      try {
        addLog("info", "diag", `[SPAWN] claude -p via bash wrapper (stdin=/dev/null, unsets CLAUDECODE)`);
        const wrapCmd = Command.create("bash", [
          "-c", "unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude -p hi --model haiku < /dev/null",
        ], { encoding: "raw" });
        let wrapChunks = 0;
        const wrapDecoder = new TextDecoder();
        wrapCmd.stdout.on("data", (raw: Uint8Array | string) => {
          wrapChunks++;
          const text = typeof raw === "string" ? raw : wrapDecoder.decode(new Uint8Array(raw), { stream: true });
          addLog("info", "diag", `[SPAWN] 🔶 wrapped claude chunk #${wrapChunks} (${text.length} chars): "${text.slice(0, 150)}"`);
        });
        wrapCmd.stderr.on("data", (raw: Uint8Array | string) => {
          const text = typeof raw === "string" ? raw : wrapDecoder.decode(new Uint8Array(raw), { stream: true });
          addLog("warn", "diag", `[SPAWN] wrapped claude stderr: ${text}`);
        });
        wrapCmd.on("close", (p) => {
          addLog("info", "diag", `[SPAWN] wrapped claude CLOSED: code=${p.code}, signal=${p.signal ?? "none"}, chunks=${wrapChunks}`);
        });
        const wrapChild = await wrapCmd.spawn();
        addLog("info", "diag", `[SPAWN] wrapped claude pid=${wrapChild.pid}`);
      } catch (diagErr) {
        addLog("error", "diag", `[SPAWN] ❌ wrapped claude FAILED: ${diagErr}`);
      }

      // --- End diagnostics, proceed with main spawn ---
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
            handleStreamEvent(event);
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
            const event: StreamEvent = JSON.parse(lineBuffer.trim());
            handleStreamEvent(event);
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
