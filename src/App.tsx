import { useState, useRef, useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { SkillPalette } from "./components/SkillPalette";
import { AgentDrawer } from "./components/AgentDrawer";
import { AlgorithmTracker } from "./components/AlgorithmTracker";
import { DebugConsole } from "./components/DebugConsole";
import { SettingsPanel, useSettings } from "./components/SettingsPanel";
import { useSkills } from "./hooks/useSkills";
import { useSessions } from "./hooks/useSessions";
import { useClaude } from "./hooks/useClaude";
import { TitleBar } from "./sections/TitleBar";
import { WelcomeScreen } from "./sections/WelcomeScreen";
import { MessageList } from "./sections/MessageList";
import { InputBar } from "./sections/InputBar";
import "highlight.js/styles/github-dark.css";
import "./App.css";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [algoVisible, setAlgoVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeSession?.messages || [];

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") { e.preventDefault(); setSettingsOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleNewChat(); }
      if (e.key === "Escape" && claude.isStreaming) { e.preventDefault(); claude.stopStreaming(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [claude.isStreaming, claude.stopStreaming, handleNewChat]);

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14]">
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
        />
      )}

      <InputBar
        skills={skills}
        isStreaming={claude.isStreaming}
        sidebarOpen={sidebarOpen}
        drawerOpen={drawerOpen}
        onSend={claude.sendMessage}
        onStop={claude.stopStreaming}
        input={input}
        onInputChange={setInput}
        inputRef={inputRef}
      />

      {/* Overlays */}
      <SkillPalette skills={skills} isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={(s) => insertSkillCommand(s.name)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AlgorithmTracker phases={claude.algoPhases} criteria={claude.algoCriteria} visible={algoVisible} onToggle={() => setAlgoVisible((v) => !v)} />
      <AgentDrawer agents={claude.agents} isOpen={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} />
      <DebugConsole logs={claude.debugLogs} visible={claude.debugVisible} onToggle={() => claude.setDebugVisible(!claude.debugVisible)} onClear={claude.clearLogs} />
    </div>
  );
}

export default App;
