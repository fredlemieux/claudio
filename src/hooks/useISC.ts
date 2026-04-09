import { useCallback, useEffect, useRef, useState } from "react";
import type { AlgorithmPhase, ISCriterion } from "../types";

// ISC criteria are project-level goals that persist across all chat sessions.
const GLOBAL_ISC_KEY = "claudio-isc-v1";

function loadISC(): ISCriterion[] {
  try {
    const stored = localStorage.getItem(GLOBAL_ISC_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveISC(criteria: ISCriterion[]) {
  localStorage.setItem(GLOBAL_ISC_KEY, JSON.stringify(criteria));
}

/** Single merge function for all ISC update paths */
export function mergeISC(prev: ISCriterion[], incoming: ISCriterion[], statusOnly = false): ISCriterion[] {
  const merged = [...prev];
  for (const c of incoming) {
    const idx = merged.findIndex((e) => e.id === c.id);
    if (idx >= 0) {
      merged[idx] = statusOnly ? { ...merged[idx], status: c.status } : c;
    } else {
      merged.push(c);
    }
  }
  return merged;
}

export function useISC(_activeSessionId: string | null) {
  const [algoPhases, setAlgoPhases] = useState<AlgorithmPhase[]>([]);
  const [algoCriteria, setAlgoCriteria] = useState<ISCriterion[]>(() => loadISC());
  const initialLoadRef = useRef(true);

  // Persist criteria globally whenever they change — skip the very first render
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    saveISC(algoCriteria);
  }, [algoCriteria]);

  /** Merge incoming criteria (full replace per criterion) */
  const updateCriteria = useCallback((incoming: ISCriterion[]) => {
    setAlgoCriteria((prev) => mergeISC(prev, incoming));
  }, []);

  /** Merge incoming criteria (status-only update per criterion) */
  const updateCriteriaStatus = useCallback((incoming: ISCriterion[]) => {
    setAlgoCriteria((prev) => mergeISC(prev, incoming, true));
  }, []);

  /** Add criteria that don't already exist — never overwrites existing entries */
  const addNewCriteria = useCallback((incoming: ISCriterion[]) => {
    setAlgoCriteria((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const novel = incoming.filter((c) => !existingIds.has(c.id));
      return novel.length > 0 ? [...prev, ...novel] : prev;
    });
  }, []);

  const resetISC = useCallback(() => {
    setAlgoPhases([]);
    setAlgoCriteria([]);
    localStorage.removeItem(GLOBAL_ISC_KEY);
  }, []);

  return {
    algoPhases,
    setAlgoPhases,
    algoCriteria,
    updateCriteria,
    updateCriteriaStatus,
    addNewCriteria,
    resetISC,
  };
}
