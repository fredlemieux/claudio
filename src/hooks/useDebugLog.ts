import { useCallback, useState } from "react";
import type { LogEntry } from "../types";

export function useDebugLog() {
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);

  const addLog = useCallback((level: LogEntry["level"], source: LogEntry["source"], message: string) => {
    setDebugLogs((prev) => [
      ...prev.slice(-500),
      { id: crypto.randomUUID(), timestamp: Date.now(), level, source, message },
    ]);
  }, []);

  const clearLogs = useCallback(() => setDebugLogs([]), []);

  return { debugLogs, debugVisible, setDebugVisible, addLog, clearLogs };
}
