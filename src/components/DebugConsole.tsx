import { useState, useRef, useEffect } from "react";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  source: "stdout" | "stderr" | "process" | "app" | "system" | "stream";
  message: string;
}

interface DebugConsoleProps {
  logs: LogEntry[];
  visible: boolean;
  onToggle: () => void;
  onClear: () => void;
}

const LEVEL_COLORS = {
  info: "text-text-interactive",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-text-secondary",
};

const SOURCE_COLORS: Record<LogEntry["source"], string> = {
  stdout: "text-blue-400",
  stderr: "text-red-400",
  process: "text-green-400",
  app: "text-purple-400",
  system: "text-cyan-400",
  stream: "text-amber-400",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function DebugConsole({ logs, visible, onToggle, onClear }: DebugConsoleProps) {
  const [filter, setFilter] = useState<"all" | "error" | "stderr">("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const errorCount = logs.filter((l) => l.level === "error").length;

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) => {
    if (filter === "all") return true;
    if (filter === "error") return l.level === "error" || l.level === "warn";
    if (filter === "stderr") return l.source === "stderr";
    return true;
  });

  // Toggle button (always visible)
  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className={`fixed right-4 bottom-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
          errorCount > 0
            ? "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
            : "bg-surface-2 text-text-secondary border border-border hover:text-text-interactive"
        }`}
        title="Toggle debug console"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
        <span>Debug</span>
        {errorCount > 0 && (
          <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {errorCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-base border-t border-border shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-1 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-text-primary">Debug Console</span>
          <span className="text-[10px] text-text-secondary">{logs.length} entries</span>
          {errorCount > 0 && (
            <span className="text-[10px] text-red-400">{errorCount} errors</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          {(["all", "error", "stderr"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                filter === f
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-text-secondary hover:text-text-interactive"
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              autoScroll ? "bg-green-600/20 text-green-400" : "text-text-secondary"
            }`}
            title="Auto-scroll"
          >
            {autoScroll ? "auto" : "manual"}
          </button>
          <button
            onClick={onClear}
            className="text-[10px] text-text-secondary hover:text-text-interactive transition-colors"
          >
            clear
          </button>
          <button
            onClick={onToggle}
            className="text-text-secondary hover:text-text-interactive transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="h-[200px] overflow-y-auto font-mono text-[11px] leading-relaxed"
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
          if (!atBottom && autoScroll) setAutoScroll(false);
          if (atBottom && !autoScroll) setAutoScroll(true);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            No log entries{filter !== "all" ? ` matching "${filter}"` : ""}
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className={`flex gap-2 px-3 py-0.5 hover:bg-surface-2 ${
                entry.level === "error" ? "bg-red-600/5" : ""
              }`}
            >
              <span className="text-text-tertiary shrink-0">{formatTime(entry.timestamp)}</span>
              <span className={`shrink-0 w-12 ${SOURCE_COLORS[entry.source]}`}>{entry.source}</span>
              <span className={`shrink-0 w-10 ${LEVEL_COLORS[entry.level]}`}>[{entry.level}]</span>
              <span className={`break-all ${LEVEL_COLORS[entry.level]}`}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
