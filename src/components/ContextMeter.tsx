const SEGMENTS = 12;
const CTX_MAX = 200_000;

function segColor(pct: number): string {
  if (pct > 0.9)  return "bg-red-500";
  if (pct > 0.75) return "bg-orange-400";
  if (pct > 0.5)  return "bg-amber-400";
  return "bg-blue-500";
}

function textColor(pct: number): string {
  if (pct > 0.9)  return "text-red-400";
  if (pct > 0.75) return "text-orange-400";
  if (pct > 0.5)  return "text-amber-400";
  return "text-text-tertiary";
}

/** Estimate token count from total message character length. */
export function estimateTokens(messages: Array<{ content?: string }>): number {
  const chars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  return Math.min(Math.round(chars / 4), CTX_MAX);
}

interface ContextMeterProps {
  tokens: number;
}

export function ContextMeter({ tokens }: ContextMeterProps) {
  if (tokens === 0) return null;

  const pct = tokens / CTX_MAX;
  const filled = Math.round(pct * SEGMENTS);
  const color = segColor(pct);
  const label = tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : String(tokens);
  const tooltip = `Context: ~${tokens.toLocaleString()} / ${CTX_MAX.toLocaleString()} tokens (${Math.round(pct * 100)}%)`;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded ${textColor(pct)}`}
      title={tooltip}
    >
      <div className="flex items-center gap-[2px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className={`w-[5px] h-2.5 rounded-[1px] transition-colors ${
              i < filled ? color : "bg-surface-3"
            }`}
          />
        ))}
      </div>
      <span className="font-mono tabular-nums">{label}</span>
    </div>
  );
}
