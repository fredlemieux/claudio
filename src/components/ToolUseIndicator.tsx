import { useState } from "react";

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  input?: string;
  output?: string;
  startedAt: number;
  completedAt?: number;
}

const TOOL_ICONS: Record<string, string> = {
  Read: "📄",
  Edit: "✏️",
  Write: "📝",
  Bash: "💻",
  Glob: "🔍",
  Grep: "🔎",
  Agent: "🤖",
  WebSearch: "🌐",
  WebFetch: "🌐",
  Skill: "⚡",
  default: "🔧",
};

function formatDuration(startedAt: number, completedAt?: number): string {
  const end = completedAt || Date.now();
  const ms = end - startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolCallRow({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[tool.name] || TOOL_ICONS.default;

  return (
    <div className="border-l-2 border-[#1e1e3a] pl-2 py-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-[#475569] hover:text-[#94a3b8] transition-colors w-full text-left"
      >
        <span className="text-xs">{icon}</span>
        <span className="font-mono">{tool.name}</span>
        {tool.status === "running" && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        )}
        {tool.status === "completed" && (
          <span className="text-green-500 text-[10px]">✓</span>
        )}
        {tool.status === "error" && (
          <span className="text-red-400 text-[10px]">✗</span>
        )}
        <span className="text-[10px] text-[#334155] ml-auto">
          {formatDuration(tool.startedAt, tool.completedAt)}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-2.5 h-2.5 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {tool.input && (
            <pre className="text-[10px] text-[#475569] bg-[#0a0a14] rounded p-2 overflow-x-auto max-h-[100px] overflow-y-auto">
              {tool.input}
            </pre>
          )}
          {tool.output && (
            <pre className="text-[10px] text-[#94a3b8] bg-[#0a0a14] rounded p-2 overflow-x-auto max-h-[100px] overflow-y-auto">
              {tool.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolUseIndicatorProps {
  tools: ToolCall[];
}

export function ToolUseIndicator({ tools }: ToolUseIndicatorProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (tools.length === 0) return null;

  const running = tools.filter((t) => t.status === "running").length;
  const completed = tools.filter((t) => t.status === "completed").length;

  return (
    <div className="my-1 bg-[#12121e] rounded-lg border border-[#1e1e3a] overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#475569] hover:text-[#94a3b8] transition-colors"
      >
        <span>🔧</span>
        <span>
          {running > 0
            ? `${running} tool${running > 1 ? "s" : ""} running`
            : `${completed} tool call${completed !== 1 ? "s" : ""}`}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 ml-auto transition-transform ${collapsed ? "" : "rotate-180"}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 space-y-0.5">
          {tools.map((tool) => (
            <ToolCallRow key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
