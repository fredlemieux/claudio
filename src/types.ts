export interface Skill {
  name: string;
  path: string;
  fullDescription: string;
  triggers: string[];
  tier: "always" | "deferred";
}

export interface SkillIndex {
  generated: string;
  version: string;
  totalSkills: number;
  skills: Record<string, Skill>;
}

export interface StreamStep {
  id: string;
  type: "thinking" | "text" | "tool_use" | "tool_result" | "system" | "result";
  timestamp: number;
  /** Tool name for tool_use steps */
  toolName?: string;
  /** Truncated summary for display */
  summary: string;
  /** Raw JSON event string for copy button */
  rawJson: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  costUsd?: number;
  durationMs?: number;
  steps?: StreamStep[];
}
