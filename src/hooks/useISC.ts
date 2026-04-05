import { useCallback, useEffect, useRef, useState } from "react";
import type { AlgorithmPhase, ISCriterion } from "../types";

const ISC_PREFIX = "claudio-isc-";

function loadISC(sessionId: string): ISCriterion[] {
  try {
    const stored = localStorage.getItem(ISC_PREFIX + sessionId);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveISC(sessionId: string, criteria: ISCriterion[]) {
  localStorage.setItem(ISC_PREFIX + sessionId, JSON.stringify(criteria));
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

export function useISC(activeSessionId: string | null) {
  const [algoPhases, setAlgoPhases] = useState<AlgorithmPhase[]>([]);
  const [algoCriteria, setAlgoCriteria] = useState<ISCriterion[]>(() =>
    activeSessionId ? loadISC(activeSessionId) : []
  );
  // Tracks when criteria were just loaded from storage so the save effect doesn't
  // immediately write the PREVIOUS session's criteria to the NEW session's key.
  const criteriaJustLoadedRef = useRef(false);

  // Load persisted criteria when session changes
  useEffect(() => {
    criteriaJustLoadedRef.current = true;
    setAlgoCriteria(activeSessionId ? loadISC(activeSessionId) : []);
  }, [activeSessionId]);

  // Persist criteria whenever they change — skip once after each session load
  useEffect(() => {
    if (criteriaJustLoadedRef.current) {
      criteriaJustLoadedRef.current = false;
      return;
    }
    if (activeSessionId) saveISC(activeSessionId, algoCriteria);
  }, [activeSessionId, algoCriteria]);

  /** Merge incoming criteria (full replace per criterion) */
  const updateCriteria = useCallback((incoming: ISCriterion[]) => {
    setAlgoCriteria((prev) => mergeISC(prev, incoming));
  }, []);

  /** Merge incoming criteria (status-only update per criterion) */
  const updateCriteriaStatus = useCallback((incoming: ISCriterion[]) => {
    setAlgoCriteria((prev) => mergeISC(prev, incoming, true));
  }, []);

  const resetISC = useCallback(() => {
    setAlgoPhases([]);
    setAlgoCriteria([]);
  }, []);

  return {
    algoPhases,
    setAlgoPhases,
    algoCriteria,
    updateCriteria,
    updateCriteriaStatus,
    resetISC,
  };
}
