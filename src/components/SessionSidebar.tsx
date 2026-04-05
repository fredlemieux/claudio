import { IconMenu, IconPlus, IconTrash } from "../icons";
import type { Session } from "../hooks/useSessions";

interface SessionSidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onToggle,
  onSelect,
  onNew,
  onDelete,
}: SessionSidebarProps) {
  return (
    <>
      {/* Toggle button (always visible in title bar area) */}
      <button
        onClick={onToggle}
        className="text-text-secondary hover:text-text-interactive transition-colors"
        title="Toggle sessions"
      >
        <IconMenu className="w-4 h-4" />
      </button>

      {/* Sidebar panel */}
      <div
        className={`fixed top-12 left-0 bottom-0 w-[260px] bg-base border-r border-border z-30 transform transition-transform duration-200 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* New chat button */}
        <div className="p-3 border-b border-border">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-1">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-tertiary text-xs">
              No conversations yet
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center px-3 py-2.5 cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? "bg-blue-600/10 border-r-2 border-blue-500"
                    : "hover:bg-surface-2"
                }`}
                onClick={() => onSelect(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${
                    session.id === activeSessionId ? "text-text-primary" : "text-text-interactive"
                  }`}>
                    {session.title}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {session.messages.length} messages · {formatTime(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-all ml-2 shrink-0"
                >
                  <IconTrash className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border text-center">
          <span className="text-[10px] text-text-tertiary">
            {sessions.length} conversations
          </span>
        </div>
      </div>
    </>
  );
}
