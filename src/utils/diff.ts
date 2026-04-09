// ─── Line-level diff (LCS-based) ────────────────────────────
// Used by StepRenderer to render Edit/Write diffs inline.

export type DiffLine =
  | { type: "context"; text: string; oldLine: number; newLine: number }
  | { type: "removed"; text: string; oldLine: number }
  | { type: "added"; text: string; newLine: number };

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
}

const MAX_LINES = 200;

/** Compute a unified line diff between two strings using LCS. */
export function computeLineDiff(oldStr: string, newStr: string): DiffResult {
  const oldLines = oldStr === "" ? [] : oldStr.split("\n").slice(0, MAX_LINES);
  const newLines = newStr === "" ? [] : newStr.split("\n").slice(0, MAX_LINES);
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Iterative traceback
  const lines: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      lines.unshift({ type: "context", text: oldLines[i - 1], oldLine: i, newLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.unshift({ type: "added", text: newLines[j - 1], newLine: j });
      j--;
    } else {
      lines.unshift({ type: "removed", text: oldLines[i - 1], oldLine: i });
      i--;
    }
  }

  const added = lines.filter((l) => l.type === "added").length;
  const removed = lines.filter((l) => l.type === "removed").length;
  return { lines, added, removed };
}

/** Short display path — last 2 segments of a file path. */
export function shortPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}
