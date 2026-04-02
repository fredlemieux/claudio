import { useState } from "react";

export interface AlgorithmPhase {
  id: string;
  name: string;
  icon: string;
  status: "pending" | "active" | "completed";
  startedAt?: number;
  completedAt?: number;
}

export interface ISCriterion {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  domain?: string;
}

interface AlgorithmTrackerProps {
  phases: AlgorithmPhase[];
  criteria: ISCriterion[];
  visible: boolean;
  onToggle: () => void;
}

const PHASE_DEFS = [
  { name: "OBSERVE", icon: "👁️" },
  { name: "THINK", icon: "🧠" },
  { name: "PLAN", icon: "📋" },
  { name: "BUILD", icon: "🔨" },
  { name: "EXECUTE", icon: "⚡" },
  { name: "VERIFY", icon: "✅" },
  { name: "LEARN", icon: "📚" },
];

function PhaseStep({ phase }: { phase: AlgorithmPhase }) {
  const colors = {
    pending: "border-[#1e1e3a] text-[#334155]",
    active: "border-blue-500 text-blue-400 bg-blue-500/10",
    completed: "border-green-500/50 text-green-400",
  };

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${colors[phase.status]}`}>
      <span className="text-xs">{phase.icon}</span>
      <span className="text-[10px] font-medium">{phase.name}</span>
      {phase.status === "active" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {phase.status === "completed" && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: ISCriterion }) {
  const statusIcons = {
    pending: <span className="w-3 h-3 rounded border border-[#1e1e3a] inline-block" />,
    in_progress: <span className="w-3 h-3 rounded border border-blue-500 bg-blue-500/20 inline-block animate-pulse" />,
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
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 shrink-0">{statusIcons[criterion.status]}</div>
      <span className={`text-[11px] leading-relaxed ${
        criterion.status === "completed" ? "text-[#475569] line-through" :
        criterion.status === "failed" ? "text-red-300" :
        "text-[#94a3b8]"
      }`}>
        {criterion.description}
      </span>
    </div>
  );
}

export function AlgorithmTracker({ phases, criteria, visible, onToggle }: AlgorithmTrackerProps) {
  const [showCriteria, setShowCriteria] = useState(true);
  const completedCount = criteria.filter((c) => c.status === "completed").length;
  const activePhase = phases.find((p) => p.status === "active");

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-4 bottom-20 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[#12121e] text-[#475569] border border-[#1e1e3a] hover:text-[#94a3b8] transition-colors"
        title="Show Algorithm progress"
      >
        <span>♻️</span>
        <span>Algorithm</span>
        {activePhase && (
          <span className="text-blue-400 text-[10px]">{activePhase.icon}</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed left-4 bottom-20 z-40 w-[300px] bg-[#0e0e1a] border border-[#1e1e3a] rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e3a]">
        <div className="flex items-center gap-2">
          <span className="text-xs">♻️</span>
          <span className="text-xs font-semibold text-[#e2e8f0]">Algorithm</span>
          {criteria.length > 0 && (
            <span className="text-[10px] text-[#475569]">
              {completedCount}/{criteria.length} ISC
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>

      {/* Phase pipeline */}
      <div className="px-3 py-2 border-b border-[#1e1e3a]">
        <div className="flex flex-wrap gap-1">
          {phases.map((phase) => (
            <PhaseStep key={phase.id} phase={phase} />
          ))}
        </div>
      </div>

      {/* ISC Criteria */}
      {criteria.length > 0 && (
        <div>
          <button
            onClick={() => setShowCriteria(!showCriteria)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            <span>Ideal State Criteria ({criteria.length})</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`w-3 h-3 transition-transform ${showCriteria ? "rotate-180" : ""}`}
            >
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          {showCriteria && (
            <div className="px-3 pb-3 max-h-[200px] overflow-y-auto space-y-0.5">
              {criteria.map((c) => (
                <CriterionRow key={c.id} criterion={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {criteria.length > 0 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-[#1e1e3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / criteria.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Parse algorithm phases from streamed text content
export function parseAlgorithmState(content: string): {
  phases: AlgorithmPhase[];
  criteria: ISCriterion[];
} {
  const phases: AlgorithmPhase[] = PHASE_DEFS.map((def, i) => ({
    id: `phase-${i}`,
    name: def.name,
    icon: def.icon,
    status: "pending" as const,
  }));

  // Detect active/completed phases from content markers
  const phaseMarkers = [
    { pattern: /━━━ 👁️ OBSERVE ━━━/g, index: 0 },
    { pattern: /━━━ 🧠 THINK ━━━/g, index: 1 },
    { pattern: /━━━ 📋 PLAN ━━━/g, index: 2 },
    { pattern: /━━━ 🔨 BUILD ━━━/g, index: 3 },
    { pattern: /━━━ ⚡ EXECUTE ━━━/g, index: 4 },
    { pattern: /━━━ ✅ VERIFY ━━━/g, index: 5 },
    { pattern: /━━━ 📚 LEARN ━━━/g, index: 6 },
  ];

  let lastPhaseIndex = -1;
  for (const marker of phaseMarkers) {
    if (marker.pattern.test(content)) {
      lastPhaseIndex = Math.max(lastPhaseIndex, marker.index);
    }
  }

  for (let i = 0; i < phases.length; i++) {
    if (i < lastPhaseIndex) {
      phases[i].status = "completed";
    } else if (i === lastPhaseIndex) {
      phases[i].status = "active";
    }
  }

  // Extract ISC criteria from content
  const criteria: ISCriterion[] = [];
  const iscPattern = /(?:- \[([ x])\] )?(ISC-(?:C|A)?\d+):\s*(.+?)(?:\s*\||\n|$)/g;
  let match;
  while ((match = iscPattern.exec(content)) !== null) {
    const checked = match[1] === "x";
    criteria.push({
      id: match[2],
      description: match[3].trim(),
      status: checked ? "completed" : "pending",
    });
  }

  return { phases, criteria };
}
