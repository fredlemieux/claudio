import { useState, useEffect, useRef, useCallback } from "react";
import { IconSearch } from "../icons";
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
      <div className="relative w-[560px] max-h-[420px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <IconSearch className="w-4 h-4 text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search skills..."
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-secondary"
          />
          <kbd className="text-[10px] text-text-secondary bg-base px-1.5 py-0.5 rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Skill list */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-secondary text-sm">
              No skills found
            </div>
          ) : (
            filtered.map((skill, i) => (
              <button
                key={skill.name}
                onClick={() => onSelect(skill)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-blue-600/20 text-text-primary"
                    : "text-text-interactive hover:bg-surface-hover"
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
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-text-secondary">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
