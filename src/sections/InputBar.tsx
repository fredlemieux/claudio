import { useState, useEffect, useMemo, useCallback } from "react";
import { SlashAutocomplete } from "../components/SlashAutocomplete";
import { IconStop, IconSend } from "../icons";
import { filterSkills } from "../hooks/useSkills";
import type { Skill } from "../types";

interface InputBarProps {
  skills: Skill[];
  isStreaming: boolean;
  sidebarOpen: boolean;
  drawerOpen: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Exposed so parent can set input (e.g. from WelcomeScreen quick actions) */
  input: string;
  onInputChange: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  promptQueue: string[];
  onEnqueue: (text: string) => void;
  onRemoveQueued: (index: number) => void;
}

export function InputBar({
  skills,
  isStreaming,
  sidebarOpen,
  drawerOpen,
  onSend,
  onStop,
  input,
  onInputChange,
  inputRef,
  promptQueue,
  onEnqueue,
  onRemoveQueued,
}: InputBarProps) {
  const [slashIndex, setSlashIndex] = useState(0);

  const slashMatch = input.match(/^\/(\S*)$/);
  const slashQuery = slashMatch ? slashMatch[1] : "";
  const showSlash = slashMatch !== null && !isStreaming;
  const slashResults = useMemo(
    () => (showSlash ? filterSkills(skills, slashQuery).slice(0, 8) : []),
    [skills, slashQuery, showSlash]
  );

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  const insertSkillCommand = useCallback(
    (skillName: string) => {
      onInputChange(`/${skillName.toLowerCase()} `);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [onInputChange, inputRef]
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [onInputChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash && slashResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertSkillCommand(slashResults[slashIndex].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onInputChange("");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim()) return;
      if (isStreaming) {
        onEnqueue(input.trim());
      } else {
        onSend(input);
      }
      onInputChange("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  };

  return (
    <div className={`relative px-4 pb-4 pt-2 transition-all ${sidebarOpen ? "ml-[260px]" : ""} ${drawerOpen ? "mr-[340px]" : ""}`}>
      <SlashAutocomplete
        skills={slashResults}
        selectedIndex={slashIndex}
        onSelect={(skill) => insertSkillCommand(skill.name)}
        visible={showSlash}
      />

      {promptQueue.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {promptQueue.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs"
            >
              <span className="text-text-tertiary font-mono shrink-0 select-none">#{i + 1}</span>
              <span className="flex-1 truncate text-text-secondary">{item}</span>
              <button
                onClick={() => onRemoveQueued(i)}
                className="text-text-tertiary hover:text-red-400 transition-colors shrink-0 text-sm leading-none"
                title="Remove from queue"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-2xl px-4 py-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message Claudio… (/ for skills)"
          rows={1}
          className="flex-1 bg-transparent text-text-primary text-sm resize-none outline-none placeholder-text-secondary leading-normal"
          style={{ maxHeight: "120px" }}
        />
        {isStreaming ? (
          <div className="flex items-center gap-1 shrink-0">
            {input.trim() && (
              <button
                onClick={() => { onEnqueue(input.trim()); onInputChange(""); if (inputRef.current) inputRef.current.style.height = "auto"; }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-3 border border-border text-text-secondary hover:text-blue-400 hover:border-blue-400 transition-colors"
                title="Queue prompt"
              >
                <IconSend className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              title="Stop (Esc)"
            >
              <IconStop className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { onSend(input); onInputChange(""); }}
            disabled={!input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors shrink-0"
          >
            <IconSend className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
