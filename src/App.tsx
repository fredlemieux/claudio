import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import { MessageContent } from "./components/MessageContent";
import { SkillPalette } from "./components/SkillPalette";
import { SlashAutocomplete } from "./components/SlashAutocomplete";
import { AgentDrawer, type AgentInfo } from "./components/AgentDrawer";
import { AlgorithmTracker, parseAlgorithmState, type AlgorithmPhase, type ISCriterion } from "./components/AlgorithmTracker";
import { SessionSidebar } from "./components/SessionSidebar";
import { SettingsPanel } from "./components/SettingsPanel";
import { useSkills, filterSkills } from "./hooks/useSkills";
import { useSessions } from "./hooks/useSessions";
import type { Message } from "./types";
import "highlight.js/styles/github-dark.css";
import "./App.css";

function App() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    switchSession,
    updateMessages,
    setClaudeSessionId,
    deleteSession,
  } = useSessions();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [algoVisible, setAlgoVisible] = useState(false);
  const [algoPhases, setAlgoPhases] = useState<AlgorithmPhase[]>([]);
  const [algoCriteria, setAlgoCriteria] = useState<ISCriterion[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const childRef = useRef<Child | null>(null);
  const { skills } = useSkills();

  const messages = activeSession?.messages || [];

  // Slash autocomplete state
  const slashMatch = input.match(/^\/(\S*)$/);
  const slashQuery = slashMatch ? slashMatch[1] : "";
  const showSlash = slashMatch !== null && !isStreaming;
  const slashResults = useMemo(
    () => (showSlash ? filterSkills(skills, slashQuery).slice(0, 8) : []),
    [skills, slashQuery, showSlash]
  );

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const insertSkillCommand = useCallback(
    (skillName: string) => {
      setInput(`/${skillName.toLowerCase()} `);
      setPaletteOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  const handleNewChat = useCallback(() => {
    createSession();
    setAgents([]);
    setAlgoPhases([]);
    setAlgoCriteria([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [createSession]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === "Escape" && isStreaming) {
        e.preventDefault();
        stopStreaming();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isStreaming, stopStreaming, handleNewChat]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = createSession();
      sessionId = session.id;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    const currentMessages = activeSession?.messages || [];
    const newMessages = [...currentMessages, userMsg, assistantMsg];
    updateMessages(sessionId, newMessages);
    setInput("");
    setIsStreaming(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      // Build command args — use --resume for follow-up messages in existing Claude sessions
      const currentSession = sessions.find((s) => s.id === sessionId);
      const claudeSessionId = currentSession?.claudeSessionId;
      const args = claudeSessionId
        ? ["-p", trimmed, "--output-format", "stream-json", "--no-input", "--resume", claudeSessionId]
        : ["-p", trimmed, "--output-format", "stream-json", "--no-input"];

      const command = Command.create("claude", args);

      let fullContent = "";
      let latestMessages = newMessages;

      const updateContent = (text: string) => {
        fullContent = text;
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

      command.stdout.on("data", (line: string) => {
        try {
          const event = JSON.parse(line);

          // Full assistant message (cumulative content)
          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text") {
                updateContent(block.text);
              }
              if (block.type === "tool_use" && block.name === "Agent") {
                const agentId = block.id || crypto.randomUUID();
                const newAgent: AgentInfo = {
                  id: agentId,
                  name: block.input?.description || "Agent",
                  type: block.input?.subagent_type || "general-purpose",
                  status: "running",
                  description: (block.input?.prompt || "").slice(0, 120),
                  output: "",
                  startedAt: Date.now(),
                };
                setAgents((prev) => [...prev, newAgent]);
                setDrawerOpen(true);
              }
            }
          }

          // Incremental text delta
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            fullContent += event.delta.text;
            updateContent(fullContent);
          }

          // Capture Claude session ID for conversation continuity
          if (event.type === "result" && event.session_id) {
            setClaudeSessionId(sessionId!, event.session_id);
          }

          if (event.type === "tool_result") {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === event.tool_use_id
                  ? {
                      ...a,
                      status: "completed" as const,
                      output: typeof event.content === "string"
                        ? event.content.slice(0, 500)
                        : JSON.stringify(event.content).slice(0, 500),
                    }
                  : a
              )
            );
          }
        } catch {
          // Non-JSON line, ignore
        }
      });

      command.stderr.on("data", (line: string) => {
        console.error("claude stderr:", line);
      });

      const child = await command.spawn();
      childRef.current = child;

      command.on("close", (data) => {
        console.log("claude exited with code:", data.code);
        childRef.current = null;
        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        console.error("claude error:", error);
        latestMessages = latestMessages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${error}` }
            : m
        );
        updateMessages(sessionId!, latestMessages);
        childRef.current = null;
        setIsStreaming(false);
      });
    } catch (err) {
      console.error("Failed to spawn claude:", err);
      updateMessages(sessionId!, newMessages.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: `Failed to start Claude: ${err}` }
          : m
      ));
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash && slashResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertSkillCommand(slashResults[slashIndex].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14]">
      {/* Title bar */}
      <div className="flex items-center h-12 px-4 bg-[#0e0e1a] border-b border-[#1e1e3a]">
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onSelect={(id) => { switchSession(id); setSidebarOpen(false); }}
          onNew={() => { handleNewChat(); setSidebarOpen(false); }}
          onDelete={deleteSession}
        />
        <span className="text-blue-400 font-semibold text-sm ml-3">Claudio</span>
        <span className="ml-2 text-[#475569] text-xs">v0.1</span>
        {isStreaming && (
          <span className="ml-2 flex items-center gap-1.5 text-blue-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Streaming
          </span>
        )}
        {activeSession?.claudeSessionId && !isStreaming && (
          <span className="ml-2 text-[#334155] text-[10px]">
            Session active
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-[#475569] hover:text-[#94a3b8] text-xs transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <kbd className="text-[10px] bg-[#0a0a14] px-1.5 py-0.5 rounded border border-[#1e1e3a]">⌘K</kbd>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-[#475569] hover:text-[#94a3b8] transition-colors"
            title="Settings (⌘,)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 transition-all ${sidebarOpen ? "ml-[260px]" : ""} ${drawerOpen ? "mr-[340px]" : ""}`}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[#e2e8f0] mb-2">
                Claudio
              </h1>
              <p className="text-[#475569] text-sm mb-4">
                PAI-powered GUI for Claude Code
              </p>
              <div className="flex items-center justify-center gap-2 text-[#334155] text-xs">
                <span>Type</span>
                <kbd className="bg-[#12121e] px-1.5 py-0.5 rounded border border-[#1e1e3a] text-[#475569]">/</kbd>
                <span>for skills or</span>
                <kbd className="bg-[#12121e] px-1.5 py-0.5 rounded border border-[#1e1e3a] text-[#475569]">⌘K</kbd>
                <span>to search</span>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3 text-[#334155] text-[10px]">
                <span>⌘N new chat</span>
                <span>⌘, settings</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#16162a] text-[#e2e8f0] border border-[#1e1e3a]"
              }`}
            >
              {msg.role === "assistant" && !msg.content && isStreaming ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <MessageContent content={msg.content} role={msg.role} />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className={`relative px-4 pb-4 pt-2 transition-all ${sidebarOpen ? "ml-[260px]" : ""} ${drawerOpen ? "mr-[340px]" : ""}`}>
        <SlashAutocomplete
          skills={slashResults}
          selectedIndex={slashIndex}
          onSelect={(skill) => insertSkillCommand(skill.name)}
          visible={showSlash}
        />

        <div className="flex items-center gap-2 bg-[#12121e] border border-[#1e1e3a] rounded-2xl px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Claudio... (/ for skills)"
            rows={1}
            className="flex-1 bg-transparent text-[#e2e8f0] text-sm resize-none outline-none placeholder-[#475569] leading-normal"
            style={{ maxHeight: "120px" }}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shrink-0"
              title="Stop (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 px-2">
          <span className="text-[#334155] text-xs">
            Enter to send · Shift+Enter for newline · / for skills · ⌘K search
          </span>
          {isStreaming && (
            <span className="text-red-400 text-xs">
              Press stop to cancel
            </span>
          )}
        </div>
      </div>

      {/* Overlays and panels */}
      <SkillPalette
        skills={skills}
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(skill) => insertSkillCommand(skill.name)}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <AlgorithmTracker
        phases={algoPhases}
        criteria={algoCriteria}
        visible={algoVisible}
        onToggle={() => setAlgoVisible((v) => !v)}
      />

      <AgentDrawer
        agents={agents}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((o) => !o)}
      />
    </div>
  );
}

export default App;
