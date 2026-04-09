import { useState, useEffect, useRef } from "react";
import type { UserQuestion } from "../types";

interface SelectionPromptProps {
  question: UserQuestion;
  onSelect: (answer: string) => void;
  onCancel?: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function SelectionPrompt({ question, onSelect, onCancel }: SelectionPromptProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [freeText, setFreeText] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);
  const [escapeArmed, setEscapeArmed] = useState(false);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus the prompt so keyboard events are captured immediately
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const armEscape = () => {
    if (escapeArmed) {
      if (escapeTimerRef.current) clearTimeout(escapeTimerRef.current);
      setEscapeArmed(false);
      onCancel?.();
    } else {
      setEscapeArmed(true);
      escapeTimerRef.current = setTimeout(() => setEscapeArmed(false), 1500);
    }
  };

  // Global keydown for navigation — only when not in free-text mode
  useEffect(() => {
    if (showFreeText || question.answered) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, question.options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(question.options[selectedIdx]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        armEscape();
      } else {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= question.options.length) {
          e.preventDefault();
          onSelect(question.options[num - 1]);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showFreeText, question.answered, question.options, selectedIdx, onSelect, onCancel, escapeArmed]);

  if (question.answered) {
    return (
      <div className="animate-fade-in-up my-2">
        <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="text-green-400">&#10003;</span>
            <span className="font-medium">{question.question}</span>
          </div>
          <div className="mt-1 text-sm text-text-primary font-medium">
            {question.selectedOption}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} tabIndex={-1} className="animate-fade-in-up my-3 outline-none">
      <div className="bg-surface-1 border border-purple-500/20 rounded-xl overflow-hidden">
        {/* Shimmer top bar */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent bg-[length:200%_100%] animate-[shimmer_2.5s_ease-in-out_infinite]" />

        {/* Question header */}
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">&#10067;</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Input needed
              </span>
            </div>
            <p className="text-sm font-medium text-text-primary">
              {question.question}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={armEscape}
              className={`shrink-0 transition-colors text-xs mt-1 ${
                escapeArmed
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title="Dismiss (Esc Esc)"
            >
              ✕
            </button>
          )}
        </div>

        {/* Options */}
        <div className="px-3 pb-3 space-y-1.5">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onSelect(option)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all duration-150
                ${selectedIdx === i
                  ? "bg-purple-500/10 border-purple-500/30 text-text-primary"
                  : "bg-surface-2 border-border text-text-secondary hover:border-purple-500/20"
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
                  ${selectedIdx === i
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-surface-1 text-text-tertiary"
                  }`}>
                  {i + 1}
                </span>
                <span>{option}</span>
              </div>
            </button>
          ))}

          {/* "Chat about this" free text option */}
          {question.allowFreeText && !showFreeText && (
            <button
              onClick={() => setShowFreeText(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-border text-sm text-text-tertiary hover:text-text-secondary hover:border-purple-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] bg-surface-1">
                  &#9998;
                </span>
                <span>Type a custom response...</span>
              </div>
            </button>
          )}

          {/* Free text input */}
          {showFreeText && (
            <div className="flex gap-2 items-end">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-purple-500/30"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && freeText.trim()) {
                    e.preventDefault();
                    onSelect(freeText.trim());
                  }
                  if (e.key === "Escape") {
                    setShowFreeText(false);
                    setFreeText("");
                  }
                }}
              />
              <button
                onClick={() => freeText.trim() && onSelect(freeText.trim())}
                disabled={!freeText.trim()}
                className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-30 hover:bg-purple-500 transition-colors"
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* Escape armed banner */}
        {escapeArmed && (
          <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400 text-center">
            Press Esc again to dismiss
          </div>
        )}

        {/* Keyboard hint */}
        <div className="px-4 pb-2">
          <span className="text-[10px] text-text-tertiary">
            ↑↓ navigate · 1-{question.options.length} select · Enter confirm · Esc Esc cancel
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Text pattern detection ─────────────────────────────────

/**
 * Parse the end of an assistant message for a question with numbered options.
 * Returns a UserQuestion if detected, null otherwise.
 *
 * Guards against false positives by requiring:
 *   - A contiguous sequence starting at 1
 *   - The list must be at/near the end of the message
 *   - A question signal (? or question language) must precede the list
 */
export function detectQuestionInText(content: string, messageId: string): UserQuestion | null {
  if (!content || content.length < 20) return null;

  // Look at the last ~1000 chars for a question pattern
  const tail = content.slice(-1000).trimEnd();

  // Pattern: numbered list (1. / 1) / 1: / 1-)
  const numberedPattern = /^(\d+)[.):\-]\s+(.+)$/gm;
  const allMatches: Array<{ num: number; text: string; index: number }> = [];
  let match;
  while ((match = numberedPattern.exec(tail)) !== null) {
    allMatches.push({ num: parseInt(match[1]), text: match[2].trim(), index: match.index });
  }

  if (allMatches.length < 2) return null;

  // Find the last contiguous sequence (e.g. 1,2,3) working backwards from the end
  let endIdx = allMatches.length - 1;
  let startIdx = endIdx;
  while (startIdx > 0 && allMatches[startIdx].num === allMatches[startIdx - 1].num + 1) {
    startIdx--;
  }
  const groupMatches = allMatches.slice(startIdx, endIdx + 1);

  // Sequence must start at 1 and have at least 2 options
  if (groupMatches[0].num !== 1 || groupMatches.length < 2) return null;

  // The last option must be near the end of the tail — reject if substantial text follows
  const lastMatch = groupMatches[groupMatches.length - 1];
  const nextNewline = tail.indexOf("\n", lastMatch.index);
  const afterLastOption = (nextNewline >= 0 ? tail.slice(nextNewline) : "").trim();
  if (afterLastOption.length > 80) return null;

  // Must have a question signal before the numbered list
  const listStart = groupMatches[0].index;
  const textBefore = tail.slice(0, listStart).trim();
  if (!textBefore) return null;

  const hasQuestionMark = textBefore.includes("?");
  const hasQuestionLanguage = /\b(choose|select|which|pick|prefer|want|options?|decision|proceed|go with|like to|would you)\b/i.test(textBefore);
  if (!hasQuestionMark && !hasQuestionLanguage) return null;

  // Reject narrative/summary lists (e.g. "Here are the steps I took: 1. Fixed …")
  const narrativeSignals = /\b(here are|the following|steps?|i (have|'ve|did|changed|fixed|added|updated|created)|completed|done|result|summary)\b/i;
  if (narrativeSignals.test(textBefore) && !hasQuestionMark) return null;

  // Extract the question line (last non-empty line before the list)
  const lines = textBefore.split("\n").filter((l) => l.trim());
  const questionLine = lines[lines.length - 1]?.trim() || "Choose an option:";

  // Detect "chat/custom" free-text option with a tight pattern
  // NOTE: bare "other" is intentionally excluded — it's too broad and causes false removals
  const chatIdx = groupMatches.findIndex((m) =>
    /\b(chat about|discuss this|custom (response|answer)|free.?text|type (your|a)|write (your|a))\b/i.test(m.text)
  );
  const allowFreeText = chatIdx >= 0;
  const options = allowFreeText
    ? groupMatches.filter((_, i) => i !== chatIdx).map((m) => m.text)
    : groupMatches.map((m) => m.text);

  // Need at least 2 visible options after filtering
  if (options.length < 2) return null;

  return {
    id: messageId,
    question: questionLine.replace(/[*_#]+/g, "").trim(),
    options,
    allowFreeText,
    answered: false,
  };
}
