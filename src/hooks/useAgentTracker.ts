import { useCallback, useState } from "react";
import type { AgentInfo, AgentEvent } from "../types";

export function useAgentTracker() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  const handleAgentEvent = useCallback((agentEvent: AgentEvent) => {
    setAgents((prev) => {
      if (agentEvent.kind === "spawn") {
        return [...prev, agentEvent.agent];
      }
      // kind === "update" — merge into existing agent
      const idx = prev.findIndex((a) => a.id === agentEvent.id);
      if (idx < 0) return prev;
      const existing = prev[idx];
      const updated = [...prev];
      const mergedToolCalls = agentEvent.toolCalls?.length
        ? [...(existing.toolCalls ?? []), ...agentEvent.toolCalls]
        : existing.toolCalls;
      updated[idx] = {
        ...existing,
        status: agentEvent.status,
        description: agentEvent.description || existing.description,
        output: agentEvent.output || existing.output,
        completedAt: (agentEvent.status === "completed" || agentEvent.status === "failed")
          ? Date.now()
          : existing.completedAt,
        toolCalls: mergedToolCalls,
      };
      return updated;
    });
  }, []);

  const resetAgents = useCallback(() => setAgents([]), []);

  return { agents, handleAgentEvent, resetAgents };
}
