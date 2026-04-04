import { useEffect, useRef } from "react";
import type { Skill } from "../types";

interface SlashAutocompleteProps {
  skills: Skill[];
  selectedIndex: number;
  onSelect: (skill: Skill) => void;
  visible: boolean;
}

export function SlashAutocomplete({
  skills,
  selectedIndex,
  onSelect,
  visible,
}: SlashAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!visible || skills.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
      <div
        ref={listRef}
        className="bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden max-h-[240px] overflow-y-auto py-1"
      >
        {skills.map((skill, i) => (
          <button
            key={skill.name}
            onClick={() => onSelect(skill)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
              i === selectedIndex
                ? "bg-blue-600/20 text-text-primary"
                : "text-text-interactive hover:bg-surface-hover"
            }`}
          >
            <span className="text-blue-400 font-mono text-xs shrink-0">
              /{skill.name.toLowerCase()}
            </span>
            <span className="text-sm truncate">{skill.fullDescription}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
