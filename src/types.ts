// ─── Domain Types ────────────────────────────────────────────
// All domain types live here. Components and hooks import from this file.
// Never define domain types in component files.

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

// ─── Agent Types ─────────────────────────────────────────────

export interface AgentToolCall {
  name: string;
  timestamp: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  description: string;
  output: string;
  startedAt: number;
  /** Full prompt given to the agent */
  prompt?: string;
  /** Last known elapsed seconds from tool_progress heartbeats */
  elapsedSeconds?: number;
  /** Timestamp when agent completed/failed */
  completedAt?: number;
  /** Tool calls observed via tool_progress events */
  toolCalls?: AgentToolCall[];
  /** Optional ISC criterion description shown as subtitle */
  iscDescription?: string;
}

/** Discriminated union for agent lifecycle events — replaces sentinel empty strings */
export type AgentEvent =
  | { kind: "spawn"; agent: AgentInfo }
  | { kind: "update"; id: string; status: AgentInfo["status"]; description?: string; output?: string; toolCalls?: AgentToolCall[] };

// ─── Algorithm Types ─────────────────────────────────────────

export interface AlgorithmPhase {
  id: string;
  name: string;
  icon: string;
  status: "pending" | "active" | "completed";
  startedAt?: number;
  completedAt?: number;
}

export interface ISCriterion {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  domain?: string;
}

// ─── Debug Types ─────────────────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  source: "stdout" | "stderr" | "process" | "app" | "system" | "stream";
  message: string;
}

// ─── Tool Types ──────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  input?: string;
  output?: string;
  startedAt: number;
  completedAt?: number;
}

// ─── Settings Types ──────────────────────────────────────────

export type ClaudeModel = "opus" | "sonnet" | "haiku";

// ─── Stream Event Types ──────────────────────────────────────

// Content block types used in assistant messages
export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock;

// Tool result block in user messages
export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

// Discriminated union for all stream event types
export interface SystemInitEvent {
  type: "system";
  subtype: "init";
  model?: string;
}

export interface SystemTaskProgressEvent {
  type: "system";
  subtype: "task_progress";
  tool_use_id?: string;
  description?: string;
}

export interface SystemTaskNotificationEvent {
  type: "system";
  subtype: "task_notification";
  tool_use_id?: string;
  status?: string;
  output_file?: string;
}

export interface SystemOtherEvent {
  type: "system";
  subtype?: string;
}

// Note: SystemEvent is discriminated on `subtype`. SystemOtherEvent is the catch-all.
// TypeScript narrows correctly when checking `event.subtype === "init"` etc.
export type SystemEvent = SystemInitEvent | SystemTaskProgressEvent | SystemTaskNotificationEvent | SystemOtherEvent;

export interface AssistantEvent {
  type: "assistant";
  message?: { content?: ContentBlock[] };
}

export interface UserEvent {
  type: "user";
  message?: { content?: ToolResultBlock[] };
}

export interface StreamContentEvent {
  type: "stream_event";
  event?: {
    type: string;
    delta?: { type: string; text?: string };
  };
}

export interface ResultEvent {
  type: "result";
  session_id?: string;
  total_cost_usd?: number;
  cost_usd?: number;
  duration_ms?: number;
  result?: string;
  rate_limit_info?: unknown;
}

export interface RateLimitEvent {
  type: "rate_limit_event";
  rate_limit_info?: unknown;
}

export interface UnknownEvent {
  type: string;
  subtype?: string;
}

export type StreamEvent =
  | SystemEvent
  | AssistantEvent
  | UserEvent
  | StreamContentEvent
  | ResultEvent
  | RateLimitEvent;

export interface StreamEventCallbacks {
  addLog: (level: LogEntry["level"], source: LogEntry["source"], message: string) => void;
  addStep: (step: StreamStep) => void;
  appendContent: (delta: string) => void;
  setContent: (fullContent: string) => void;
  finalizeMessage: (costUsd?: number, durationMs?: number) => void;
  /** Called when the result event carries a session_id to persist for --resume */
  onSessionId: (claudeSessionId: string) => void;
  /** Returns the current accumulated content — used for multi-turn dedup logic */
  getBuffer: () => string;
  /** When sendMessage started — used as duration fallback if result event omits it */
  startTime: number;
  /** Called when a TodoWrite tool_use block contains ISC- prefixed todos */
  onISCCriteria?: (criteria: ISCriterion[]) => void;
  /** Called when an Agent/Task tool_use is detected — tracks agent lifecycle */
  onAgentUpdate?: (event: AgentEvent) => void;
}
