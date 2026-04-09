import { useState, useEffect, useRef } from "react";
import { computeLineDiff, shortPath } from "../utils/diff";
import type { StreamStep } from "../types";

// ─── Shared helpers ───────────────────────────────────────────

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
  | { kind: "edit"; filePath: string; oldStr: string; newStr: string }
  | { kind: "write"; filePath: string; lines: number }
  | { kind: "read"; filePath: string };

function getEditData(step: StreamStep): EditData | null {
  if (step.type !== "tool_use" || !step.toolName || !EDIT_TOOLS.has(step.toolName)) return null;
  const input = parseToolInput(step.rawJson, step.toolName);
  const filePath = String(input.file_path ?? input.path ?? "");
  if (!filePath) return null;

  if (step.toolName === "Edit") {
    return {
      kind: "edit",
      filePath,
      oldStr: String(input.old_string ?? ""),
      newStr: String(input.new_string ?? ""),
    };
  }
  if (step.toolName === "Write") {
    const content = String(input.content ?? "");
    return { kind: "write", filePath, lines: content.split("\n").length };
  }
  return { kind: "read", filePath };
}

// ─── Single inline diff card ──────────────────────────────────

function InlineEditCard({ step, autoExpand }: { step: StreamStep; autoExpand: boolean }) {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const prevAutoExpand = useRef(autoExpand);
  const data = getEditData(step);

  useEffect(() => {
    if (prevAutoExpand.current !== autoExpand) {
      setUserExpanded(null);
      prevAutoExpand.current = autoExpand;
    }
  }, [autoExpand]);

  if (!data || data.kind === "read") return null;

  const expanded = userExpanded !== null ? userExpanded : autoExpand;

  const diff = data.kind === "edit" ? computeLineDiff(data.oldStr, data.newStr) : null;
  const added = diff ? diff.added : data.kind === "write" ? data.lines : 0;
  const removed = diff ? diff.removed : 0;

  return (
    <div
      className="rounded-lg border border-amber-500/15 bg-surface-2/60 overflow-hidden cursor-pointer select-none"
      onClick={() => setUserExpanded((e) => (e === null ? !autoExpand : !e))}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[10px] font-bold text-amber-400">
          {data.kind === "write" ? "W" : "E"}
        </span>
        <span className="font-mono text-[11px] text-blue-400 flex-1 truncate">
          {shortPath(data.filePath)}
        </span>
        <span className="flex items-center gap-2 shrink-0 text-[10px]">
          {added > 0 && <span className="text-green-400">+{added}</span>}
          {removed > 0 && <span className="text-red-400">-{removed}</span>}
          {data.kind === "write" && added === 0 && (
            <span className="text-text-tertiary">new</span>
          )}
        </span>
        <span className="text-text-tertiary text-[9px] shrink-0">{expanded ? "▴" : "▾"}</span>
      </div>

      {/* Diff body */}
      {expanded && diff && (
        <div className="border-t border-border overflow-x-auto max-h-[260px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                className={`px-1.5 whitespace-pre overflow-hidden text-ellipsis ${
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
      )}

      {expanded && data.kind === "write" && (
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-text-tertiary italic" onClick={(e) => e.stopPropagation()}>
          new file — {data.lines} lines
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────

interface InlineEditDiffsProps {
  steps: StreamStep[];
  isStreaming: boolean;
}

export function InlineEditDiffs({ steps, isStreaming }: InlineEditDiffsProps) {
  const editSteps = steps.filter(
    (s) => s.type === "tool_use" && s.toolName && EDIT_TOOLS.has(s.toolName) && s.toolName !== "Read",
  );

  if (editSteps.length === 0) return null;

  const lastEditId = isStreaming ? (editSteps[editSteps.length - 1]?.id ?? null) : null;

  return (
    <div className="mt-2 space-y-1">
      {editSteps.map((step) => (
        <InlineEditCard key={step.id} step={step} autoExpand={step.id === lastEditId} />
      ))}
    </div>
  );
}
