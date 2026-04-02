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
        className="text-[#475569] hover:text-[#94a3b8] transition-colors"
        title="Toggle sessions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Sidebar panel */}
      <div
        className={`fixed top-12 left-0 bottom-0 w-[260px] bg-[#0a0a14] border-r border-[#1e1e3a] z-30 transform transition-transform duration-200 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* New chat button */}
        <div className="p-3 border-b border-[#1e1e3a]">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-1">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#334155] text-xs">
              No conversations yet
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center px-3 py-2.5 cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? "bg-blue-600/10 border-r-2 border-blue-500"
                    : "hover:bg-[#12121e]"
                }`}
                onClick={() => onSelect(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${
                    session.id === activeSessionId ? "text-[#e2e8f0]" : "text-[#94a3b8]"
                  }`}>
                    {session.title}
                  </p>
                  <p className="text-[10px] text-[#334155] mt-0.5">
                    {session.messages.length} messages · {formatTime(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#475569] hover:text-red-400 transition-all ml-2 shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1e1e3a] text-center">
          <span className="text-[10px] text-[#334155]">
            {sessions.length} conversations
          </span>
        </div>
      </div>
    </>
  );
}
