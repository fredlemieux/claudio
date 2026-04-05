import { SessionSidebar } from "../components/SessionSidebar";
import { IconFolder, IconSearch, IconSettings } from "../icons";
import type { Session } from "../hooks/useSessions";

interface TitleBarProps {
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  sidebarOpen: boolean;
  isStreaming: boolean;
  model: string;
  onToggleSidebar: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onPickDirectory: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
}

export function TitleBar({
  sessions,
  activeSessionId,
  activeSession,
  sidebarOpen,
  isStreaming,
  model,
  onToggleSidebar,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onPickDirectory,
  onOpenPalette,
  onOpenSettings,
}: TitleBarProps) {
  return (
    <div className="flex items-center h-12 px-4 bg-surface-1 border-b border-border">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={sidebarOpen}
        onToggle={onToggleSidebar}
        onSelect={onSelectSession}
        onNew={onNewChat}
        onDelete={onDeleteSession}
      />
      <span className="text-blue-400 font-semibold text-sm ml-3">Claudio</span>
      <span className="ml-2 text-text-secondary text-xs">v0.1</span>
      <span className="ml-1.5 text-[10px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border">
        {model}
      </span>
      {isStreaming && (
        <span className="ml-2 flex items-center gap-1.5 text-blue-400 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Streaming
        </span>
      )}
      {activeSession?.claudeSessionId && !isStreaming && (
        <span className="ml-2 text-text-tertiary text-[10px]">
          Session active
        </span>
      )}
      <button
        onClick={onPickDirectory}
        className="ml-3 flex items-center gap-1.5 text-text-secondary hover:text-text-interactive text-xs transition-colors max-w-[200px] truncate"
        title={activeSession?.workingDirectory || "Select working directory"}
      >
        <IconFolder className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {activeSession?.workingDirectory
            ? activeSession.workingDirectory.split("/").pop() || activeSession.workingDirectory
            : "No directory"}
        </span>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-interactive text-xs transition-colors"
        >
          <IconSearch className="w-3.5 h-3.5" />
          <kbd className="text-[10px] bg-base px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>
        <button
          onClick={onOpenSettings}
          className="text-text-secondary hover:text-text-interactive transition-colors"
          title="Settings (⌘,)"
        >
          <IconSettings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
