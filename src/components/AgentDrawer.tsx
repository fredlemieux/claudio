import { useState, useEffect, useRef, type JSX } from "react";
import {
  IconCodeBrackets, IconMagnifyingGlass, IconBook, IconGrid, IconSparkle,
  IconCheckmark, IconXMark, IconChevronDown, IconClose,
} from "../icons";
import type { AgentInfo, ISCriterion } from "../types";
import { DRAWER_WIDTH } from "../layout";

type DrawerTab = "agents" | "isc";

interface AgentDrawerProps {
  agents: AgentInfo[];
  criteria: ISCriterion[];
  isOpen: boolean;
  onToggle: () => void;
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  onClearISC: () => void;
}

// ─── ISC Crosshair Icon (SVG, theme-consistent) ───────────────────

function IconCrosshair({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
      <line x1="8" y1="0.5" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="15.5" />
      <line x1="0.5" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="15.5" y2="8" />
    </svg>
  );
}

// ─── Agent Type Icons ───────────────────────────────────────────────

const typeIcons: Record<string, JSX.Element> = {
  Engineer: <IconCodeBrackets className="w-4 h-4" />,
  Explore: <IconMagnifyingGlass className="w-4 h-4" />,
  Research: <IconBook className="w-4 h-4" />,
  Architect: <IconGrid className="w-4 h-4" />,
};

function getTypeIcon(type: string): JSX.Element {
  for (const [key, icon] of Object.entries(typeIcons)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <IconSparkle className="w-4 h-4" />;
}

// ─── Elapsed Timer Hook ─────────────────────────────────────────────

function useElapsedTime(startedAt: number, isRunning: boolean): string {
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - startedAt) / 1000));

  useEffect(() => {
    if (!isRunning) {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isRunning]);

  if (elapsed < 60) return `${elapsed}s`;
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

// ─── Progress Bar ───────────────────────────────────────────────────

function ProgressBar({ status }: { status: AgentInfo["status"] }) {
  if (status === "completed") {
    return (
      <div className="w-full h-1.5 rounded-full bg-green-900/30 overflow-hidden">
        <div className="h-full w-full rounded-full bg-green-500 transition-all duration-500" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="w-full h-1.5 rounded-full bg-red-900/30 overflow-hidden">
        <div className="h-full w-3/4 rounded-full bg-red-500" />
      </div>
    );
  }
  return (
    <div className="w-full h-1.5 rounded-full bg-blue-900/20 overflow-hidden">
      <div
        className="h-full rounded-full animate-indeterminate"
        style={{
          width: "40%",
          background: "linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)",
        }}
      />
    </div>
  );
}

// ─── Status Icons ───────────────────────────────────────────────────

function StatusIcon({ status }: { status: AgentInfo["status"] }) {
  if (status === "running") {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shrink-0" />;
  }
  if (status === "completed") {
    return <IconCheckmark className="w-4 h-4 text-green-400 shrink-0" />;
  }
  return <IconXMark className="w-4 h-4 text-red-400 shrink-0" />;
}

// ─── Agent Detail Modal ─────────────────────────────────────────────

function AgentDetailModal({ agent, onClose }: { agent: AgentInfo; onClose: () => void }) {
  const outputRef = useRef<HTMLPreElement>(null);
  const elapsedStr = useElapsedTime(agent.startedAt, agent.status === "running");
  const duration = agent.completedAt
    ? `${((agent.completedAt - agent.startedAt) / 1000).toFixed(1)}s`
    : elapsedStr;

  useEffect(() => {
    if (agent.status === "running" && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [agent.status, agent.output]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusColor = {
    running: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
  }[agent.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[600px] max-w-[90vw] max-h-[80vh] bg-surface-1 border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className={statusColor}>{getTypeIcon(agent.type)}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary truncate">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  agent.status === "running" ? "text-blue-300 bg-blue-400/10" :
                  agent.status === "completed" ? "text-green-300 bg-green-400/10" :
                  "text-red-300 bg-red-400/10"
                }`}>
                  {agent.type}
                </span>
                <span className={`text-[10px] ${statusColor} font-medium`}>
                  {agent.status === "running" ? "Running" : agent.status === "completed" ? "Completed" : "Failed"}
                </span>
                <span className="text-[10px] text-text-secondary tabular-nums">{duration}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-interactive transition-colors">
            <IconClose className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {agent.prompt && (
            <div>
              <h4 className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mb-1.5">Prompt</h4>
              <div className="bg-base/80 border border-border rounded-lg p-3">
                <p className="text-xs text-text-interactive whitespace-pre-wrap leading-relaxed">{agent.prompt}</p>
              </div>
            </div>
          )}
          {agent.toolCalls && agent.toolCalls.length > 0 && (
            <div>
              <h4 className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mb-1.5">Activity ({agent.toolCalls.length} tool calls)</h4>
              <div className="bg-base/80 border border-border rounded-lg p-3 space-y-1">
                {agent.toolCalls.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-text-tertiary tabular-nums shrink-0">{((tc.timestamp - agent.startedAt) / 1000).toFixed(1)}s</span>
                    <span className="text-blue-400 font-mono">{tc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Output</h4>
              {agent.status === "running" && (
                <span className="flex items-center gap-1 text-[10px] text-blue-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  live
                </span>
              )}
            </div>
            <pre
              ref={outputRef}
              className="text-[11px] text-text-interactive bg-base/80 border border-border rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto"
            >
              {agent.output || (
                <span className="text-text-tertiary italic">
                  {agent.status === "running" ? "Waiting for output..." : "No output captured"}
                </span>
              )}
            </pre>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border">
          <ProgressBar status={agent.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Agent Card ─────────────────────────────────────────────────────

function AgentCard({ agent, onSelect }: { agent: AgentInfo; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const elapsedStr = useElapsedTime(agent.startedAt, agent.status === "running");

  useEffect(() => {
    if (expanded && agent.status === "running" && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [expanded, agent.status, agent.output]);

  const borderColor = {
    running: "border-blue-500/30",
    completed: "border-green-500/20",
    failed: "border-red-500/20",
  }[agent.status];

  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden bg-surface-2/50 transition-colors`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`${agent.status === "running" ? "text-blue-400" : agent.status === "completed" ? "text-green-400" : "text-red-400"}`}>
            {getTypeIcon(agent.type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary truncate">{agent.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                agent.status === "running" ? "text-blue-300 bg-blue-400/10" :
                agent.status === "completed" ? "text-green-300 bg-green-400/10" :
                "text-red-300 bg-red-400/10"
              }`}>
                {agent.type}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary truncate mt-0.5">
              {agent.iscDescription || agent.description}
            </p>
          </div>
          <span className="text-[10px] text-text-secondary shrink-0 tabular-nums">{elapsedStr}</span>
          <StatusIcon status={agent.status} />
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="text-text-tertiary hover:text-text-interactive transition-colors p-0.5"
            title="View details"
          >
            <IconMagnifyingGlass className="w-3 h-3" />
          </button>
          <IconChevronDown className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-2">
          <ProgressBar status={agent.status} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-3/50">
            <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Output</span>
            {agent.status === "running" && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                live
              </span>
            )}
          </div>
          <pre
            ref={outputRef}
            className="text-[11px] text-text-interactive px-3 py-2 whitespace-pre-wrap font-mono leading-relaxed max-h-[200px] overflow-y-auto bg-base/80"
          >
            {agent.output || (
              <span className="text-text-tertiary italic">
                {agent.status === "running" ? "Waiting for output..." : "No output captured"}
              </span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── ISC Criterion Status Icons ─────────────────────────────────────

const ISC_STATUS_ICONS = {
  pending: <span className="w-3.5 h-3.5 rounded border border-border-hover inline-block shrink-0" />,
  in_progress: <span className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-500/15 inline-block animate-pulse shrink-0" />,
  completed: <IconCheckmark className="w-3.5 h-3.5 text-green-400 shrink-0" />,
  failed: <IconXMark className="w-3.5 h-3.5 text-red-400 shrink-0" />,
};

// ─── ISC Tab Content ────────────────────────────────────────────────

function ISCTabContent({ criteria, onClear }: { criteria: ISCriterion[]; onClear: () => void }) {
  const completedCount = criteria.filter((c) => c.status === "completed").length;
  const failedCount = criteria.filter((c) => c.status === "failed").length;

  if (criteria.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <IconCrosshair className="w-10 h-10 text-border mb-3" />
        <p className="text-text-secondary text-xs">No criteria yet</p>
        <p className="text-text-tertiary text-[10px] mt-1">
          ISC criteria will appear here when the algorithm defines them
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Progress summary */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-secondary font-medium">Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-green-400">{completedCount}/{criteria.length}</span>
            {failedCount > 0 && (
              <span className="text-[10px] text-red-400">{failedCount} failed</span>
            )}
            <button
              onClick={onClear}
              className="text-[10px] text-text-tertiary hover:text-red-400 transition-colors"
              title="Clear all ISC criteria"
            >
              clear
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / criteria.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Criteria list */}
      <div className="space-y-1">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-surface-hover transition-colors">
            <div className="mt-0.5">{ISC_STATUS_ICONS[c.status]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-text-tertiary font-semibold shrink-0">{c.id}</span>
              </div>
              <span className={`text-[11px] leading-relaxed ${
                c.status === "completed" ? "text-text-secondary line-through" :
                c.status === "failed" ? "text-red-300" :
                c.status === "in_progress" ? "text-blue-300" :
                "text-text-interactive"
              }`}>
                {c.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
        active
          ? "text-text-primary border-purple-500"
          : "text-text-secondary border-transparent hover:text-text-interactive"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
          active ? "bg-purple-500 text-white" : "bg-surface-2 text-text-secondary"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Drawer ────────────────────────────────────────────────────

export function AgentDrawer({ agents, criteria, isOpen, onToggle, activeTab, onTabChange, onClearISC }: AgentDrawerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const runningAgents = agents.filter((a) => a.status === "running");
  const completedAgents = agents.filter((a) => a.status === "completed");
  const failedAgents = agents.filter((a) => a.status === "failed");
  const runningCount = runningAgents.length;
  const sortedAgents = [...runningAgents, ...failedAgents, ...completedAgents];
  const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null;

  const hasAgents = agents.length > 0;
  const hasCriteria = criteria.length > 0;
  const completedISC = criteria.filter((c) => c.status === "completed").length;

  // ISC tab always available; agents tab only when there are agents
  const showAgentTab = hasAgents;
  const showISCTab = true;
  const showTabs = showAgentTab && showISCTab;

  return (
    <>
      {selectedAgent && (
        <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
      )}

      {/* Toggle button — always visible */}
      {(
        <button
          onClick={onToggle}
          className={`fixed right-4 top-16 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            runningCount > 0
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "bg-surface-2 text-text-interactive border border-border hover:border-border-hover"
          }`}
        >
          {activeTab === "isc" ? (
            <IconCrosshair className="w-3.5 h-3.5" />
          ) : (
            <IconSparkle className="w-3.5 h-3.5" />
          )}
          {runningCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {runningCount}
            </span>
          )}
          {hasCriteria && !hasAgents && (
            <span className="text-[10px] text-text-secondary">{completedISC}/{criteria.length}</span>
          )}
        </button>
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-12 right-0 bottom-0 ${DRAWER_WIDTH} bg-surface-1 border-l border-border z-30 transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Tab bar (only when both tabs have content) */}
        {showTabs ? (
          <div className="flex border-b border-border">
            <TabButton
              active={activeTab === "agents"}
              onClick={() => onTabChange("agents")}
              icon={<IconSparkle className="w-3 h-3" />}
              label="Agents"
              badge={runningCount > 0 ? String(runningCount) : String(agents.length)}
            />
            <TabButton
              active={activeTab === "isc"}
              onClick={() => onTabChange("isc")}
              icon={<IconCrosshair className="w-3 h-3" />}
              label="ISC"
              badge={`${completedISC}/${criteria.length}`}
            />
            <button
              onClick={onToggle}
              className="px-3 text-text-secondary hover:text-text-interactive transition-colors"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Single-content header when only one tab has content */
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {showAgentTab ? (
                <>
                  <IconSparkle className="w-3.5 h-3.5 text-text-secondary" />
                  <h2 className="text-sm font-semibold text-text-primary">Agents</h2>
                  {runningCount > 0 && (
                    <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">{runningCount} running</span>
                  )}
                </>
              ) : (
                <>
                  <IconCrosshair className="w-3.5 h-3.5 text-text-secondary" />
                  <h2 className="text-sm font-semibold text-text-primary">ISC</h2>
                  <span className="text-[10px] text-text-secondary">{completedISC}/{criteria.length}</span>
                </>
              )}
            </div>
            <button onClick={onToggle} className="text-text-secondary hover:text-text-interactive transition-colors">
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="overflow-y-auto h-[calc(100%-44px)]">
          {/* Agents tab */}
          {(activeTab === "agents" || !showISCTab) && showAgentTab && (
            <div className="p-3 space-y-2">
              {sortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))}
            </div>
          )}

          {/* ISC tab */}
          {(activeTab === "isc" || !showAgentTab) && showISCTab && (
            <ISCTabContent criteria={criteria} onClear={onClearISC} />
          )}

        </div>
      </div>
    </>
  );
}
