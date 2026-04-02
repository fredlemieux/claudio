import { useState } from "react";

export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  description: string;
  output: string;
  startedAt: number;
}

interface AgentDrawerProps {
  agents: AgentInfo[];
  isOpen: boolean;
  onToggle: () => void;
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    running: "text-blue-400 bg-blue-400/10",
    completed: "text-green-400 bg-green-400/10",
    failed: "text-red-400 bg-red-400/10",
  }[agent.status];

  const statusIcon = {
    running: (
      <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
    ),
    completed: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-green-400">
        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
      </svg>
    ),
    failed: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-red-400">
        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
      </svg>
    ),
  }[agent.status];

  const elapsed = Math.round((Date.now() - agent.startedAt) / 1000);

  return (
    <div className="border border-[#1e1e3a] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1a1a2e] transition-colors"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#e2e8f0] truncate">
              {agent.name}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor}`}>
              {agent.type}
            </span>
          </div>
          <p className="text-[10px] text-[#475569] truncate mt-0.5">
            {agent.description}
          </p>
        </div>
        <span className="text-[10px] text-[#475569] shrink-0">{elapsed}s</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 text-[#475569] transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1e1e3a]">
          <pre className="text-[10px] text-[#94a3b8] mt-2 whitespace-pre-wrap font-mono leading-relaxed max-h-[200px] overflow-y-auto">
            {agent.output || "No output yet..."}
          </pre>
        </div>
      )}
    </div>
  );
}

export function AgentDrawer({ agents, isOpen, onToggle }: AgentDrawerProps) {
  const runningCount = agents.filter((a) => a.status === "running").length;

  return (
    <>
      {/* Toggle button (always visible) */}
      <button
        onClick={onToggle}
        className={`fixed right-4 top-16 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
          runningCount > 0
            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
            : "bg-[#12121e] text-[#475569] border border-[#1e1e3a] hover:text-[#94a3b8]"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
        </svg>
        <span>Agents</span>
        {runningCount > 0 && (
          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {runningCount}
          </span>
        )}
      </button>

      {/* Drawer panel */}
      <div
        className={`fixed top-12 right-0 bottom-0 w-[340px] bg-[#0e0e1a] border-l border-[#1e1e3a] z-30 transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e3a]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#e2e8f0]">Agents</h2>
            <span className="text-[10px] text-[#475569]">
              {agents.length} total
            </span>
          </div>
          <button
            onClick={onToggle}
            className="text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-52px)] p-3 space-y-2">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-8 h-8 text-[#1e1e3a] mb-3"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </svg>
              <p className="text-[#475569] text-xs">No agents running</p>
              <p className="text-[#334155] text-[10px] mt-1">
                Agents will appear here when spawned
              </p>
            </div>
          ) : (
            agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
          )}
        </div>
      </div>
    </>
  );
}
