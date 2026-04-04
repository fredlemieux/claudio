import { SessionSidebar } from "../components/SessionSidebar";
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
          <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
        </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <kbd className="text-[10px] bg-base px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>
        <button
          onClick={onOpenSettings}
          className="text-text-secondary hover:text-text-interactive transition-colors"
          title="Settings (⌘,)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
