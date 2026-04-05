import { useState } from "react";
import { IconCheckmark, IconXMark, IconChevronDown } from "../icons";
import type { ISCriterion } from "./AlgorithmTracker";

interface ISCPanelProps {
  criteria: ISCriterion[];
}

const STATUS_ICONS = {
  pending: <span className="w-3 h-3 rounded border border-border inline-block shrink-0" />,
  in_progress: <span className="w-3 h-3 rounded border border-blue-500 bg-blue-500/20 inline-block animate-pulse shrink-0" />,
  completed: <IconCheckmark className="w-3 h-3 text-green-400 shrink-0" />,
  failed: <IconXMark className="w-3 h-3 text-red-400 shrink-0" />,
};

export function ISCPanel({ criteria }: ISCPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const completedCount = criteria.filter((c) => c.status === "completed").length;
  const failedCount = criteria.filter((c) => c.status === "failed").length;

  if (criteria.length === 0) return null;

  return (
    <div className="border-t border-border">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px]">🎯</span>
          <span className="text-[10px] font-semibold text-text-primary">ISC</span>
          <span className="text-[10px] text-text-secondary">
            {completedCount}/{criteria.length}
            {failedCount > 0 && <span className="text-red-400 ml-1">{failedCount} failed</span>}
          </span>
        </div>
        <IconChevronDown className={`w-3 h-3 text-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Progress bar */}
      <div className="px-3 pb-1">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / criteria.length) * 100}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
            {criteria.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 py-0.5">
                <div className="mt-0.5">{STATUS_ICONS[c.status]}</div>
                <span className="text-[10px] font-mono text-text-tertiary shrink-0 pt-px">{c.id}</span>
                <span className={`text-[10px] leading-relaxed ${
                  c.status === "completed" ? "text-text-secondary line-through" :
                  c.status === "failed" ? "text-red-300" :
                  c.status === "in_progress" ? "text-blue-300" :
                  "text-text-interactive"
                }`}>
                  {c.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
