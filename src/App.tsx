import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { SIDEBAR_MARGIN, DRAWER_MARGIN } from "./layout";
import { open } from "@tauri-apps/plugin-dialog";
import { SkillPalette } from "./components/SkillPalette";
import { AgentDrawer } from "./components/AgentDrawer";
import { AlgorithmTracker } from "./components/AlgorithmTracker";
import { DebugConsole } from "./components/DebugConsole";
import { SettingsPanel, useSettings } from "./components/SettingsPanel";
import { detectQuestionInText } from "./components/SelectionPrompt";
import { useSkills } from "./hooks/useSkills";
import { useSessions } from "./hooks/useSessions";
import { useClaude } from "./hooks/useClaude";
import { TitleBar } from "./sections/TitleBar";
import { WelcomeScreen } from "./sections/WelcomeScreen";
import { MessageList } from "./sections/MessageList";
import { InputBar } from "./sections/InputBar";
import { usePromptQueue } from "./hooks/usePromptQueue";
import { ContextMeter, estimateTokens } from "./components/ContextMeter";
import "./App.css";

type DrawerTab = "agents" | "isc";

function App() {
  const sessionState = useSessions();
  const { sessions, activeSession, activeSessionId, createSession, switchSession, deleteSession, setWorkingDirectory } = sessionState;
  const { skills } = useSkills();
  const { settings } = useSettings();

  const claude = useClaude({ ...sessionState, model: settings.model });

  const [input, setInput] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("isc");
  const [algoVisible, setAlgoVisible] = useState(false);
  const [escapeArmed, setEscapeArmed] = useState(false);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(null);
  const promptQ = usePromptQueue();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeSession?.messages || [];
  const ctxTokens = useMemo(() => estimateTokens(messages), [messages]);

  // Detect inline question patterns in the last completed assistant message
  const textDetectedQuestion = useMemo(() => {
    if (claude.isStreaming) return null;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.content) return null;
    return detectQuestionInText(lastMsg.content, lastMsg.id);
  }, [messages, claude.isStreaming]);

  // Tool-detected takes priority; text-detected is used unless dismissed
  const activeQuestion = claude.pendingQuestion ??
    (textDetectedQuestion?.id !== dismissedQuestionId ? textDetectedQuestion : null);

  const handleCancelQuestion = useCallback(() => {
    if (textDetectedQuestion) setDismissedQuestionId(textDetectedQuestion.id);
    // For tool questions: dismissing just hides the UI; Claude continues waiting
    // (in practice the hook handles those before they reach this UI)
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [textDetectedQuestion]);

  // Clear dismissed state when a new question appears
  useEffect(() => {
    if (activeQuestion && activeQuestion.id !== dismissedQuestionId) {
      setDismissedQuestionId(null);
    }
  }, [activeQuestion?.id]);

  // Auto-send queued prompts when streaming finishes
  const prevIsStreamingRef = useRef(false);
  useEffect(() => {
    if (prevIsStreamingRef.current && !claude.isStreaming) {
      const next = promptQ.dequeue();
      if (next) claude.sendMessage(next);
    }
    prevIsStreamingRef.current = claude.isStreaming;
  }, [claude.isStreaming]);

  // Clear queue when switching sessions
  useEffect(() => {
    promptQ.clear();
  }, [activeSessionId]);

  // Auto-open drawer and switch tab when agents spawn
  const autoOpenAgentRef = useRef(false);
  useEffect(() => {
    if (!claude.isStreaming) {
      autoOpenAgentRef.current = false;
    }
  }, [claude.isStreaming]);

  useEffect(() => {
    if (claude.agents.length > 0 && claude.isStreaming && !autoOpenAgentRef.current) {
      autoOpenAgentRef.current = true;
      setDrawerOpen(true);
      setDrawerTab("agents");
    }
  }, [claude.agents.length, claude.isStreaming]);

  // Auto-open drawer and switch tab when ISC criteria arrive
  const autoOpenISCRef = useRef(false);
  useEffect(() => {
    if (!claude.isStreaming) {
      autoOpenISCRef.current = false;
    }
  }, [claude.isStreaming]);

  useEffect(() => {
    if (claude.algoCriteria.length > 0 && claude.isStreaming && !autoOpenISCRef.current && claude.agents.length === 0) {
      autoOpenISCRef.current = true;
      setDrawerOpen(true);
      setDrawerTab("isc");
    }
  }, [claude.algoCriteria.length, claude.isStreaming, claude.agents.length]);

  const handleNewChat = useCallback(() => {
    createSession();
    claude.resetForNewChat();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [createSession, claude]);

  const pickDirectory = useCallback(async () => {
    const dir = await open({ directory: true, title: "Select working directory" });
    if (dir && typeof dir === "string") {
      let sid = activeSessionId;
      if (!sid) {
        const session = createSession();
        sid = session.id;
      }
      setWorkingDirectory(sid, dir);
    }
  }, [activeSessionId, createSession, setWorkingDirectory]);

  const insertSkillCommand = useCallback((skillName: string) => {
    setInput(`/${skillName.toLowerCase()} `);
    setPaletteOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Disarm escape when streaming stops
  useEffect(() => {
    if (!claude.isStreaming && escapeArmed) {
      setEscapeArmed(false);
      if (escapeTimerRef.current) clearTimeout(escapeTimerRef.current);
    }
  }, [claude.isStreaming, escapeArmed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") { e.preventDefault(); setSettingsOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleNewChat(); }
      if (e.key === "Escape" && claude.isStreaming) {
        e.preventDefault();
        setEscapeArmed((armed) => {
          if (armed) {
            claude.stopStreaming();
            if (escapeTimerRef.current) clearTimeout(escapeTimerRef.current);
            return false;
          }
          escapeTimerRef.current = setTimeout(() => setEscapeArmed(false), 1500);
          return true;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [claude.isStreaming, claude.stopStreaming, handleNewChat]);

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col h-screen bg-base">
      <TitleBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeSession={activeSession}
        sidebarOpen={sidebarOpen}
        isStreaming={claude.isStreaming}
        model={settings.model}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onSelectSession={(id) => { switchSession(id); setSidebarOpen(false); }}
        onNewChat={() => { handleNewChat(); setSidebarOpen(false); }}
        onDeleteSession={deleteSession}
        onPickDirectory={pickDirectory}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {messages.length === 0 ? (
        <WelcomeScreen
          sessions={sessions}
          onSwitchSession={switchSession}
          onSetInput={setInput}
          onFocusInput={() => inputRef.current?.focus()}
        />
      ) : (
        <MessageList
          messages={messages}
          isStreaming={claude.isStreaming}
          toolCalls={claude.toolCalls}
          sidebarOpen={sidebarOpen}
          drawerOpen={drawerOpen}
          algoPhases={claude.algoPhases}
          activeQuestion={activeQuestion}
          onAnswerQuestion={claude.answerQuestion}
          onCancelQuestion={handleCancelQuestion}
          onSendMessage={claude.sendMessage}
        />
      )}

      {/* Toolbar row — Context meter + Algo + Debug toggle buttons */}
      <div className={`flex items-center px-4 py-1 gap-1 transition-all ${sidebarOpen ? SIDEBAR_MARGIN : ""} ${drawerOpen ? DRAWER_MARGIN : ""}`}>
        <ContextMeter tokens={ctxTokens} />
        <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          {algoVisible && (
            <div className="absolute bottom-full right-0 mb-1 z-50">
              <AlgorithmTracker
                phases={claude.algoPhases}
                criteria={claude.algoCriteria}
                visible={algoVisible}
                onToggle={() => setAlgoVisible((v) => !v)}
              />
            </div>
          )}
          <button
            onClick={() => setAlgoVisible((v) => !v)}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              algoVisible ? "text-text-primary" : "text-text-tertiary hover:text-text-interactive"
            }`}
            title="Toggle Algorithm tracker"
          >
            <span>♻️</span>
            <span>Algo</span>
          </button>
        </div>

        {(() => {
          const debugErrorCount = claude.debugLogs.filter((l) => l.level === "error").length;
          return (
            <button
              onClick={() => claude.setDebugVisible(!claude.debugVisible)}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                claude.debugVisible
                  ? "text-text-primary"
                  : debugErrorCount > 0
                    ? "text-red-400 hover:text-red-300"
                    : "text-text-tertiary hover:text-text-interactive"
              }`}
              title="Toggle debug console"
            >
              <span>Debug</span>
              {debugErrorCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1 rounded-full min-w-[16px] text-center">
                  {debugErrorCount}
                </span>
              )}
            </button>
          );
        })()}
        </div>
      </div>

      <InputBar
        skills={skills}
        isStreaming={claude.isStreaming}
        escapeArmed={escapeArmed}
        questionActive={!!(activeQuestion && !activeQuestion.answered)}
        sidebarOpen={sidebarOpen}
        drawerOpen={drawerOpen}
        onSend={claude.sendMessage}
        onStop={claude.stopStreaming}
        input={input}
        onInputChange={setInput}
        inputRef={inputRef}
        promptQueue={promptQ.queue}
        onEnqueue={promptQ.enqueue}
        onRemoveQueued={promptQ.remove}
      />

      <DebugConsole
        logs={claude.debugLogs}
        visible={claude.debugVisible}
        onToggle={() => claude.setDebugVisible(!claude.debugVisible)}
        onClear={claude.clearLogs}
        sidebarOpen={sidebarOpen}
        drawerOpen={drawerOpen}
      />

      {/* True overlays */}
      <SkillPalette skills={skills} isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={(s) => insertSkillCommand(s.name)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AgentDrawer
        agents={claude.agents}
        criteria={claude.algoCriteria}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((o) => !o)}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        onClearISC={claude.resetISC}
      />
    </div>
  );
}

export default App;
