import { useState, useEffect, useRef, useCallback } from "react";
import type { Skill } from "../types";
import { filterSkills } from "../hooks/useSkills";

interface SkillPaletteProps {
  skills: Skill[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (skill: Skill) => void;
}

export function SkillPalette({ skills, isOpen, onClose, onSelect }: SkillPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filterSkills(skills, query);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onSelect(filtered[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, onSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-[560px] max-h-[420px] bg-[#12121e] border border-[#1e1e3a] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e3a]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-[#475569] shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search skills..."
            className="flex-1 bg-transparent text-[#e2e8f0] text-sm outline-none placeholder-[#475569]"
          />
          <kbd className="text-[10px] text-[#475569] bg-[#0a0a14] px-1.5 py-0.5 rounded border border-[#1e1e3a]">
            ESC
          </kbd>
        </div>

        {/* Skill list */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#475569] text-sm">
              No skills found
            </div>
          ) : (
            filtered.map((skill, i) => (
              <button
                key={skill.name}
                onClick={() => onSelect(skill)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-blue-600/20 text-[#e2e8f0]"
                    : "text-[#94a3b8] hover:bg-[#1a1a2e]"
                }`}
              >
                <span className="text-blue-400 font-mono text-xs shrink-0">
                  /{skill.name.toLowerCase()}
                </span>
                <span className="text-sm truncate">
                  {skill.fullDescription}
                </span>
                {skill.tier === "always" && (
                  <span className="ml-auto text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded shrink-0">
                    always
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#1e1e3a] flex items-center gap-4 text-[10px] text-[#475569]">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
