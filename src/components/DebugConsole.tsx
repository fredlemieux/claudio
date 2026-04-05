import { useState, useRef, useEffect, useCallback } from "react";
import { IconClose } from "../icons";
import type { LogEntry } from "../types";
import { SIDEBAR_MARGIN, DRAWER_MARGIN } from "../layout";

interface DebugConsoleProps {
  logs: LogEntry[];
  visible: boolean;
  onToggle: () => void;
  onClear: () => void;
  sidebarOpen: boolean;
  drawerOpen: boolean;
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

export function DebugConsole({ logs, visible, onToggle, onClear, sidebarOpen, drawerOpen }: DebugConsoleProps) {
  const [filter, setFilter] = useState<"all" | "error" | "stderr">("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [height, setHeight] = useState(220);
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleCopyAll = useCallback(() => {
    const text = logs
      .map((l) => `${formatTime(l.timestamp)} ${l.source} [${l.level}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [logs]);

  const errorCount = logs.filter((l) => l.level === "error").length;

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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: height };

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      // Dragging up (lower clientY) = taller panel
      const delta = dragRef.current.startY - e.clientY;
      setHeight(Math.max(80, Math.min(600, dragRef.current.startHeight + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  if (!visible) return null;

  return (
    <div className={`bg-base border-t border-border shadow-2xl transition-[margin] ${sidebarOpen ? SIDEBAR_MARGIN : ""} ${drawerOpen ? DRAWER_MARGIN : ""}`}>
      {/* Resize handle — drag up to make taller */}
      <div
        className="h-1 cursor-ns-resize bg-border hover:bg-blue-500/60 transition-colors"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />

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
            onClick={handleCopyAll}
            className={`text-[10px] transition-colors ${copied ? "text-green-400" : "text-text-secondary hover:text-text-interactive"}`}
            title="Copy all logs to clipboard"
          >
            {copied ? "copied!" : "copy all"}
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
            title="Collapse debug console"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        style={{ height: `${height}px` }}
        className="overflow-y-auto font-mono text-[11px] leading-relaxed"
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
