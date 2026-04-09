import type { AlgorithmPhase, StreamStep } from "../types";

// ─── Phase metadata ──────────────────────────────────────────

const PHASE_META: Record<string, { icon: string; label: string }> = {
  OBSERVE: { icon: "\u{1F441}\uFE0F", label: "OBSERVE" },
  THINK:   { icon: "\u{1F9E0}", label: "THINK" },
  PLAN:    { icon: "\u{1F4CB}", label: "PLAN" },
  BUILD:   { icon: "\u{1F528}", label: "BUILD" },
  EXECUTE: { icon: "\u26A1",   label: "EXECUTE" },
  VERIFY:  { icon: "\u2705",   label: "VERIFY" },
  LEARN:   { icon: "\u{1F4DA}", label: "LEARN" },
};

// ─── Types ──────────────────────────────────────────────────

interface ThoughtEntry {
  phase: string;
  phaseIndex: number;
  summary: string;
  timestamp: number;
  isActive: boolean;
}

// ─── Parse thinking steps into thought entries ──────────────

function buildThoughts(
  steps: StreamStep[],
  phases: AlgorithmPhase[],
): ThoughtEntry[] {
  const thinkingSteps = steps.filter((s) => s.type === "thinking");
  if (thinkingSteps.length === 0) return [];

  const activePhaseIdx = phases.findIndex((p) => p.status === "active");
  const completedPhases = phases.filter((p) => p.status === "completed");
  const relevantPhaseCount = completedPhases.length + (activePhaseIdx >= 0 ? 1 : 0);

  // No phases detected yet — show thinking steps as unphased (pre-algorithm thinking)
  if (relevantPhaseCount === 0) {
    return thinkingSteps.map((s, i) => ({
      phase: "_THINKING",
      phaseIndex: -1,
      summary: s.summary,
      timestamp: s.timestamp,
      isActive: i === thinkingSteps.length - 1,
    }));
  }

  const entries: ThoughtEntry[] = [];
  const phaseNames = Object.keys(PHASE_META);
  const stepsPerPhase = Math.max(1, Math.ceil(thinkingSteps.length / relevantPhaseCount));

  let stepIdx = 0;
  for (let pi = 0; pi < phaseNames.length && stepIdx < thinkingSteps.length; pi++) {
    const phase = phases[pi];
    if (!phase || phase.status === "pending") continue;

    const count = phase.status === "active"
      ? thinkingSteps.length - stepIdx
      : Math.min(stepsPerPhase, thinkingSteps.length - stepIdx);

    for (let j = 0; j < count && stepIdx < thinkingSteps.length; j++, stepIdx++) {
      entries.push({
        phase: phaseNames[pi],
        phaseIndex: pi,
        summary: thinkingSteps[stepIdx].summary,
        timestamp: thinkingSteps[stepIdx].timestamp,
        isActive: phase.status === "active" && j === count - 1,
      });
    }
  }

  return entries;
}

// ─── Collapsed thought (completed phase) ────────────────────

function CollapsedThought({ phase, summary, duration }: {
  phase: string;
  summary: string;
  duration?: string;
}) {
  const meta = PHASE_META[phase];
  if (!meta) return null;

  return (
    <div className="flex items-center gap-2 py-1 animate-fade-in-up">
      <span className="w-4 h-4 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400 shrink-0">
        &#10003;
      </span>
      <span className="text-[11px] font-semibold text-text-tertiary">
        {meta.icon} {meta.label}
      </span>
      <span className="text-[11px] text-text-tertiary opacity-70 truncate">
        &mdash; {summary}
      </span>
      {duration && (
        <span className="text-[9px] text-text-tertiary opacity-50 ml-auto shrink-0 tabular-nums">
          {duration}
        </span>
      )}
    </div>
  );
}

// ─── Active thought card ────────────────────────────────────

function ActiveThought({ phase, phaseIndex, totalPhases, summary, isLatest }: {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  summary: string;
  isLatest: boolean;
}) {
  const meta = PHASE_META[phase];
  const isUnphased = phase === "_THINKING";

  return (
    <div className="animate-fade-in-up mb-1.5">
      <div className={`relative overflow-hidden rounded-lg border
        ${isLatest
          ? "bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.04] border-purple-500/[0.12]"
          : "bg-purple-500/[0.03] border-purple-500/[0.08]"
        }`}
      >
        {/* Shimmer bar on latest thought */}
        {isLatest && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent bg-[length:200%_100%] animate-[shimmer_2.5s_ease-in-out_infinite]" />
        )}

        <div className="px-3 py-2.5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] leading-none">{isUnphased ? "\u{1F9E0}" : meta?.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              {isUnphased ? "Thinking" : meta?.label}
            </span>
            {!isUnphased && (
              <span className="text-[9px] text-text-tertiary bg-purple-500/10 px-1.5 py-px rounded">
                {phaseIndex + 1} / {totalPhases}
              </span>
            )}
            {isLatest && (
              <div className="flex gap-[3px] ml-1">
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-[dotPulse_1.4s_ease-in-out_infinite]" />
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-[dotPulse_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-[dotPulse_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
            )}
          </div>

          {/* Thought text */}
          <p className={`text-xs leading-relaxed text-text-secondary ${isLatest ? "thought-typing" : ""}`}>
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-thought (secondary reasoning) ──────────────────────

function SubThought({ summary }: { summary: string }) {
  return (
    <div className="animate-fade-in-up mb-1.5">
      <div className="bg-purple-500/[0.02] border border-purple-500/[0.08] border-l-2 border-l-purple-500/20 rounded-md px-3 py-2">
        <p className="text-[11px] leading-relaxed text-text-tertiary">
          {summary}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────

interface ThoughtStreamProps {
  steps: StreamStep[];
  phases: AlgorithmPhase[];
  isStreaming: boolean;
}

export function ThoughtStream({ steps, phases, isStreaming }: ThoughtStreamProps) {
  const thoughts = buildThoughts(steps, phases);
  if (thoughts.length === 0) return null;

  // Group thoughts by phase
  const grouped = new Map<string, ThoughtEntry[]>();
  for (const t of thoughts) {
    const existing = grouped.get(t.phase) || [];
    existing.push(t);
    grouped.set(t.phase, existing);
  }

  // Unphased thoughts (thinking before any algorithm phase is detected)
  const unphased = grouped.get("_THINKING") || [];

  // Phase-aware thoughts
  const completedPhases = phases.filter((p) => p.status === "completed");
  const activePhase = phases.find((p) => p.status === "active");

  return (
    <div className="space-y-0.5">
      {/* Unphased thinking (before algorithm phases start) */}
      {unphased.length > 0 && isStreaming && unphased.map((thought, i) => {
        const isLatest = i === unphased.length - 1;
        if (isLatest) {
          return (
            <ActiveThought
              key={`unphased-${i}`}
              phase="_THINKING"
              phaseIndex={-1}
              totalPhases={7}
              summary={thought.summary}
              isLatest={true}
            />
          );
        }
        return <SubThought key={`unphased-${i}`} summary={thought.summary} />;
      })}

      {/* Collapsed completed phases */}
      {completedPhases.map((phase) => {
        const phaseThoughts = grouped.get(phase.name);
        if (!phaseThoughts || phaseThoughts.length === 0) return null;

        const lastThought = phaseThoughts[phaseThoughts.length - 1];
        const duration = phase.completedAt && phase.startedAt
          ? `${Math.round((phase.completedAt - phase.startedAt) / 1000)}s`
          : undefined;

        return (
          <CollapsedThought
            key={phase.name}
            phase={phase.name}
            summary={lastThought.summary.replace(/…$/, "")}
            duration={duration}
          />
        );
      })}

      {/* Active phase thoughts */}
      {activePhase && isStreaming && (() => {
        const phaseThoughts = grouped.get(activePhase.name) || [];
        const phaseIdx = phases.findIndex((p) => p.name === activePhase.name);

        return phaseThoughts.map((thought, i) => {
          const isLatest = i === phaseThoughts.length - 1;

          if (isLatest) {
            return (
              <ActiveThought
                key={`${thought.phase}-${i}`}
                phase={thought.phase}
                phaseIndex={phaseIdx}
                totalPhases={phases.length}
                summary={thought.summary}
                isLatest={true}
              />
            );
          }

          return (
            <SubThought
              key={`${thought.phase}-${i}`}
              summary={thought.summary}
            />
          );
        });
      })()}
    </div>
  );
}
