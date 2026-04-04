import { useState, useEffect } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import type { Skill } from "../types";

// Pure bash + jq scanner. Reads YAML frontmatter from each SKILL.md,
// outputs one JSON object per line. jq handles all string escaping safely.
// No Python, no Node — just standard macOS tools.
const SCAN_SCRIPT = [
  'for f in ~/.claude/skills/*/SKILL.md; do',
  '  [ -f "$f" ] || continue',
  '  dir=$(basename "$(dirname "$f")")',
  '  name="" desc="" in_fm=false',
  '  while IFS= read -r line; do',
  '    [ "$in_fm" = false ] && [ "$line" = "---" ] && in_fm=true && continue',
  '    [ "$in_fm" = true ] && [ "$line" = "---" ] && break',
  '    if [ "$in_fm" = true ]; then',
  '      case "$line" in name:*) name="${line#name: }";; description:*) desc="${line#description: }";; esac',
  '    fi',
  '  done < "$f"',
  '  [ -n "$name" ] || name="$dir"',
  '  jq -cn --arg n "$name" --arg d "$dir" --arg desc "$desc" \'{"name":$n,"dir":$d,"description":$desc}\'',
  'done',
].join("\n");

/**
 * Scan ~/.claude/skills/ directory for SKILL.md files and extract
 * name + description from YAML frontmatter. This mirrors how Claude Code
 * discovers skills at runtime — always in sync with what's on disk.
 */
export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      try {
        const result = await Command.create("bash", ["-c", SCAN_SCRIPT]).execute();
        if (cancelled) return;

        if (result.code !== 0) {
          setError(`Skills scan failed: ${result.stderr}`);
          setLoading(false);
          return;
        }

        const lines = result.stdout.trim().split("\n").filter(Boolean);
        const parsed: Skill[] = lines.map((line) => {
          try {
            const obj = JSON.parse(line) as { name: string; dir: string; description: string };
            const triggers = extractTriggers(obj.description);
            const skill: Skill = {
              name: obj.name,
              path: `${obj.dir}/SKILL.md`,
              fullDescription: cleanDescription(obj.description),
              triggers,
              tier: "deferred",
            };
            return skill;
          } catch {
            return null;
          }
        }).filter((s): s is Skill => s !== null);

        // Sort: underscore-prefixed (integrations) last, then alphabetical
        parsed.sort((a, b) => {
          const aInt = a.name.startsWith("_") || a.path.startsWith("_");
          const bInt = b.name.startsWith("_") || b.path.startsWith("_");
          if (aInt !== bInt) return aInt ? 1 : -1;
          return a.name.localeCompare(b.name);
        });

        setSkills(parsed);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSkills();
    return () => { cancelled = true; };
  }, []);

  return { skills, loading, error };
}

/** Extract trigger words from "USE WHEN x, y, z" pattern in description */
function extractTriggers(desc: string): string[] {
  const match = desc.match(/USE WHEN\s+(.+?)(?:\.|$)/i);
  if (!match) return [];
  return match[1]
    .split(/,|OR/i)
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
    .filter((t) => t.length > 0 && t.length < 40);
}

/** Strip "USE WHEN ..." clause for cleaner display */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\s*USE WHEN\s+.*/i, "")
    .replace(/\s*\.\s*$/, "")
    .trim();
}

export function filterSkills(skills: Skill[], query: string): Skill[] {
  if (!query) return skills;
  const lower = query.toLowerCase();
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.fullDescription.toLowerCase().includes(lower) ||
      s.triggers.some((t) => t.toLowerCase().includes(lower))
  );
}
