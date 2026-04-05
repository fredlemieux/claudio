import { useState } from "react";
import { IconCheckmark, IconXMark, IconCloseSmall, IconChevronDown } from "../icons";

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
    pending: "border-border text-text-tertiary",
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
        <IconCheckmark className="w-3 h-3" />
      )}
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: ISCriterion }) {
  const statusIcons = {
    pending: <span className="w-3 h-3 rounded border border-border inline-block" />,
    in_progress: <span className="w-3 h-3 rounded border border-blue-500 bg-blue-500/20 inline-block animate-pulse" />,
    completed: <IconCheckmark className="w-3 h-3 text-green-400" />,
    failed: <IconXMark className="w-3 h-3 text-red-400" />,
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 shrink-0">{statusIcons[criterion.status]}</div>
      <span className={`text-[11px] leading-relaxed ${
        criterion.status === "completed" ? "text-text-secondary line-through" :
        criterion.status === "failed" ? "text-red-300" :
        "text-text-interactive"
      }`}>
        {criterion.description}
      </span>
    </div>
  );
}

const DEFAULT_PHASES: AlgorithmPhase[] = PHASE_DEFS.map((def, i) => ({
  id: `phase-${i}`,
  name: def.name,
  icon: def.icon,
  status: "pending" as const,
}));

export function AlgorithmTracker({ phases, criteria, visible, onToggle }: AlgorithmTrackerProps) {
  const [showCriteria, setShowCriteria] = useState(true);
  const displayPhases = phases.length > 0 ? phases : DEFAULT_PHASES;
  const completedCount = criteria.filter((c) => c.status === "completed").length;

  if (!visible) return null;

  return (
    <div className="w-[300px] bg-surface-1 border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs">♻️</span>
          <span className="text-xs font-semibold text-text-primary">Algorithm</span>
          {criteria.length > 0 && (
            <span className="text-[10px] text-text-secondary">
              {completedCount}/{criteria.length} ISC
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-text-secondary hover:text-text-interactive transition-colors"
        >
          <IconCloseSmall className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Phase pipeline */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex flex-wrap gap-1">
          {displayPhases.map((phase) => (
            <PhaseStep key={phase.id} phase={phase} />
          ))}
        </div>
      </div>

      {/* ISC Criteria */}
      {criteria.length > 0 && (
        <div>
          <button
            onClick={() => setShowCriteria(!showCriteria)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-text-secondary hover:text-text-interactive transition-colors"
          >
            <span>Ideal State Criteria ({criteria.length})</span>
            <IconChevronDown className={`w-3 h-3 transition-transform ${showCriteria ? "rotate-180" : ""}`} />
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
          <div className="h-1 bg-border rounded-full overflow-hidden">
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
