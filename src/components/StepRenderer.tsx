import { useState, useCallback, useEffect, useRef } from "react";
import { IconCopy, IconChevronRight } from "../icons";
import { computeLineDiff, shortPath } from "../utils/diff";
import type { DiffResult } from "../utils/diff";
import type { StreamStep } from "../types";

// ─── Copy helpers ────────────────────────────────────────────

function CopyJsonButton({ json, label }: { json: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [json]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); void handleCopy(); }}
      className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-surface-2 text-text-tertiary hover:text-text-interactive hover:bg-surface-hover transition-colors flex items-center gap-1"
      title={label ? `Copy ${label}` : "Copy raw JSON"}
    >
      {copied ? (
        <span className="text-green-400">Copied</span>
      ) : (
        <>
          <IconCopy className="w-3 h-3" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

// ─── Step styles ──────────────────────────────────────────────

const STEP_STYLES: Record<StreamStep["type"], { icon: string; label: string; color: string; bg: string }> = {
  system:      { icon: "S", label: "System",  color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  thinking:    { icon: "T", label: "Think",   color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  text:        { icon: "A", label: "Text",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  tool_use:    { icon: "U", label: "Tool",    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  tool_result: { icon: "R", label: "Result",  color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  result:      { icon: "D", label: "Done",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const ALL_TYPES = Object.keys(STEP_STYLES) as StreamStep["type"][];

// ─── Diff helpers ─────────────────────────────────────────────

const EDIT_TOOLS = new Set(["Edit", "Write", "Read"]);

function parseToolInput(rawJson: string, toolName: string): Record<string, unknown> {
  try {
    const event = JSON.parse(rawJson) as { message?: { content?: unknown[] } };
    const blocks = event?.message?.content ?? [];
    const block = blocks.find(
      (b) =>
        typeof b === "object" &&
        b !== null &&
        (b as Record<string, unknown>).type === "tool_use" &&
        (b as Record<string, unknown>).name === toolName,
    ) as Record<string, unknown> | undefined;
    return (block?.input as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

type EditData =
  | { kind: "edit"; filePath: string; diff: DiffResult }
  | { kind: "write"; filePath: string; lines: number }
  | { kind: "read"; filePath: string };

function getEditData(step: StreamStep): EditData | null {
  if (step.type !== "tool_use" || !step.toolName || !EDIT_TOOLS.has(step.toolName)) return null;
  const input = parseToolInput(step.rawJson, step.toolName);
  const filePath = String(input.file_path ?? input.path ?? "");
  if (!filePath) return null;

  if (step.toolName === "Edit") {
    const oldStr = String(input.old_string ?? "");
    const newStr = String(input.new_string ?? "");
    return { kind: "edit", filePath, diff: computeLineDiff(oldStr, newStr) };
  }
  if (step.toolName === "Write") {
    const content = String(input.content ?? "");
    return { kind: "write", filePath, lines: content.split("\n").length };
  }
  return { kind: "read", filePath };
}

// ─── Inline diff view ─────────────────────────────────────────

function DiffView({ data }: { data: EditData }) {
  if (data.kind === "read") return null;

  if (data.kind === "write") {
    return (
      <div className="mt-1.5 rounded border border-border overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 bg-surface-2 border-b border-border">
          <span className="font-mono text-[10px] text-blue-400">{shortPath(data.filePath)}</span>
          <span className="text-[10px] text-green-400">+{data.lines} lines</span>
        </div>
        <div className="px-2 py-1 text-[10px] text-text-tertiary italic">new file</div>
      </div>
    );
  }

  const { diff } = data;
  return (
    <div className="mt-1.5 rounded border border-border overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-surface-2 border-b border-border">
        <span className="font-mono text-[10px] text-blue-400">{shortPath(data.filePath)}</span>
        <span className="flex gap-2 text-[10px]">
          {diff.added > 0 && <span className="text-green-400">+{diff.added}</span>}
          {diff.removed > 0 && <span className="text-red-400">-{diff.removed}</span>}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
        <div className="min-w-max">
        {diff.lines.map((line, idx) => (
          <div
            key={idx}
            className={`flex font-mono text-[10px] leading-5 ${
              line.type === "added"
                ? "bg-green-500/10"
                : line.type === "removed"
                  ? "bg-red-500/10"
                  : ""
            }`}
          >
            <span
              className={`w-3.5 text-center select-none flex-shrink-0 ${
                line.type === "added"
                  ? "text-green-400"
                  : line.type === "removed"
                    ? "text-red-400"
                    : "text-transparent"
              }`}
            >
              {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
            </span>
            <span
              className={`px-1.5 whitespace-pre ${
                line.type === "added"
                  ? "text-green-300"
                  : line.type === "removed"
                    ? "text-red-300"
                    : "text-text-secondary"
              }`}
            >
              {line.text || " "}
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step item ────────────────────────────────────────────────

function StepItem({ step, autoExpand }: { step: StreamStep; autoExpand: boolean }) {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const prevAutoExpand = useRef(autoExpand);
  const style = STEP_STYLES[step.type];
  const editData = getEditData(step);

  useEffect(() => {
    if (prevAutoExpand.current !== autoExpand) {
      setUserExpanded(null);
      prevAutoExpand.current = autoExpand;
    }
  }, [autoExpand]);

  const isExpandable = editData?.kind !== "read";
  const expanded = userExpanded !== null ? userExpanded : autoExpand;
  const toggle = !isExpandable
    ? undefined
    : editData
      ? () => setUserExpanded((e) => (e === null ? !autoExpand : !e))
      : () => setUserExpanded((e) => (e === null ? true : !e));

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1 rounded border ${style.bg} text-[11px] ${isExpandable ? "cursor-pointer select-none" : ""}`}
      onClick={toggle}
    >
      <span className={`shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${style.color} bg-surface-1`}>
        {style.icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${style.color}`}>
            {step.toolName ? step.toolName : style.label}
          </span>
          <span className="text-text-tertiary">
            {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {editData?.kind === "read" ? (
          <span className="font-mono text-[10px] text-text-tertiary truncate">{shortPath(editData.filePath)}</span>
        ) : editData ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[10px] text-blue-400 truncate">{shortPath(editData.filePath)}</span>
            {editData.kind === "edit" && editData.diff.added > 0 && (
              <span className="text-[10px] text-green-400 shrink-0">+{editData.diff.added}</span>
            )}
            {editData.kind === "edit" && editData.diff.removed > 0 && (
              <span className="text-[10px] text-red-400 shrink-0">-{editData.diff.removed}</span>
            )}
            {editData.kind === "write" && (
              <span className="text-[10px] text-green-400 shrink-0">+{editData.lines}</span>
            )}
            <span className="text-text-tertiary text-[9px] shrink-0">{expanded ? "▴" : "▾"}</span>
          </div>
        ) : (
          <span className={`text-text-secondary ${expanded ? "whitespace-pre-wrap select-text" : "line-clamp-2 overflow-hidden"}`}>
            {step.summary}
          </span>
        )}

        {expanded && editData && editData.kind !== "read" && (
          <div onClick={(e) => e.stopPropagation()}>
            <DiffView data={editData} />
          </div>
        )}
      </div>

      <CopyJsonButton json={step.rawJson} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

interface StepRendererProps {
  steps: StreamStep[];
  isStreaming?: boolean;
}

export function StepRenderer({ steps, isStreaming = false }: StepRendererProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<StreamStep["type"]>>(new Set(ALL_TYPES));

  if (!steps || steps.length === 0) return null;

  // The last Edit/Write step auto-expands while streaming; collapses when done
  let lastEditStepId: string | null = null;
  if (isStreaming) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      if (s.type === "tool_use" && s.toolName && EDIT_TOOLS.has(s.toolName)) {
        lastEditStepId = s.id;
        break;
      }
    }
  }

  const allSelected = activeFilters.size === ALL_TYPES.length;

  const toggleFilter = (type: StreamStep["type"]) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredSteps = steps.filter((s) => activeFilters.has(s.type));
  const copyAllJson = JSON.stringify(filteredSteps.map((s) => JSON.parse(s.rawJson)), null, 2);

  const countByType = ALL_TYPES.reduce(
    (acc, t) => {
      acc[t] = steps.filter((s) => s.type === t).length;
      return acc;
    },
    {} as Record<StreamStep["type"], number>,
  );

  return (
    <div className="mt-3 pt-2 border-t border-white/10 w-full">
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-[10px] text-text-tertiary hover:text-text-interactive transition-colors w-full"
      >
        <IconChevronRight className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`} />
        <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
        {!collapsed && filteredSteps.length !== steps.length && (
          <span className="text-text-tertiary">({filteredSteps.length} shown)</span>
        )}
      </button>

      {!collapsed && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilters(new Set(ALL_TYPES))}
              className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                allSelected
                  ? "bg-surface-2 border-border-hover text-text-interactive"
                  : "bg-surface-1 border-border text-text-tertiary hover:text-text-secondary"
              }`}
            >
              All
            </button>
            {ALL_TYPES.filter((t) => countByType[t] > 0).map((type) => {
              const s = STEP_STYLES[type];
              const active = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                    active
                      ? `${s.bg} ${s.color} border-current/30`
                      : "bg-surface-1 border-border text-text-tertiary hover:text-text-secondary"
                  }`}
                  title={`${s.label} (${countByType[type]})`}
                >
                  {s.icon}
                </button>
              );
            })}
            <div className="ml-auto">
              <CopyJsonButton json={copyAllJson} label="all" />
            </div>
          </div>

          {/* Step list */}
          <div className="mt-1.5 space-y-1">
            {filteredSteps.map((step) => (
              <StepItem
                key={step.id}
                step={step}
                autoExpand={step.id === lastEditStepId}
              />
            ))}
          </div>

          {/* Bottom collapse button */}
          <button
            onClick={() => setCollapsed(true)}
            className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-text-tertiary hover:text-text-interactive transition-colors py-1 border-t border-white/5"
          >
            <IconChevronRight className="w-3 h-3 rotate-[-90deg]" />
            <span>Collapse</span>
          </button>
        </>
      )}
    </div>
  );
}
