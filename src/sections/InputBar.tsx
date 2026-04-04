import { useState, useEffect, useMemo, useCallback } from "react";
import { SlashAutocomplete } from "../components/SlashAutocomplete";
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
      onSend(input);
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

      <div className="flex items-center gap-2 bg-[#12121e] border border-[#1e1e3a] rounded-2xl px-4 py-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message Claudio... (/ for skills)"
          rows={1}
          className="flex-1 bg-transparent text-[#e2e8f0] text-sm resize-none outline-none placeholder-[#475569] leading-normal"
          style={{ maxHeight: "120px" }}
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shrink-0"
            title="Stop (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => { onSend(input); onInputChange(""); }}
            disabled={!input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 px-2">
        <span className="text-[#334155] text-xs">
          Enter to send · Shift+Enter for newline · / for skills · ⌘K search
        </span>
        {isStreaming && (
          <span className="text-red-400 text-xs">
            Press stop to cancel
          </span>
        )}
      </div>
    </div>
  );
}
