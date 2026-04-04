import { useState, useCallback } from "react";
import type { StreamStep } from "../types";

function CopyJsonButton({ json }: { json: string }) {
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
      onClick={handleCopy}
      className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-surface-2 text-text-tertiary hover:text-text-interactive hover:bg-surface-hover transition-colors"
      title="Copy raw JSON"
    >
      {copied ? (
        <span className="text-green-400">Copied</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
          <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
        </svg>
      )}
    </button>
  );
}

const STEP_STYLES: Record<StreamStep["type"], { icon: string; label: string; color: string; bg: string }> = {
  system: { icon: "S", label: "System", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  thinking: { icon: "T", label: "Thinking", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  text: { icon: "A", label: "Text", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  tool_use: { icon: "U", label: "Tool", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  tool_result: { icon: "R", label: "Result", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  result: { icon: "D", label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

function StepItem({ step }: { step: StreamStep }) {
  const [expanded, setExpanded] = useState(false);
  const style = STEP_STYLES[step.type];

  return (
    <div className={`flex items-start gap-2 px-2 py-1 rounded border ${style.bg} text-[11px]`}>
      {/* Type badge */}
      <span className={`shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${style.color} bg-surface-1`}>
        {style.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${style.color}`}>
            {step.toolName ? `${step.toolName}` : style.label}
          </span>
          <span className="text-text-tertiary">
            {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-left text-text-secondary hover:text-text-primary transition-colors w-full"
        >
          <span className={expanded ? "" : "line-clamp-2"}>
            {step.summary}
          </span>
        </button>
      </div>

      {/* Copy button */}
      <CopyJsonButton json={step.rawJson} />
    </div>
  );
}

interface StepRendererProps {
  steps: StreamStep[];
}

export function StepRenderer({ steps }: StepRendererProps) {
  // Default collapsed — the step list is secondary info, don't expand by default
  const [collapsed, setCollapsed] = useState(true);

  if (!steps || steps.length === 0) return null;

  return (
    // Border-top separates the step list from the message content above.
    // w-full + the button being full-width means the collapsed state looks intentional
    // rather than a half-empty box with a lone left-aligned button.
    <div className="mt-3 pt-2 border-t border-white/10 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-[10px] text-text-tertiary hover:text-text-interactive transition-colors w-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
        >
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
        <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
      </button>

      {!collapsed && (
        <div className="mt-1.5 space-y-1">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
