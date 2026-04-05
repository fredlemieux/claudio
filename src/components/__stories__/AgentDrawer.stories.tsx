import type { Meta, StoryObj } from "@storybook/react";
import { AgentDrawer } from "../AgentDrawer";
import type { AgentInfo } from "../../types";
import { fn } from "@storybook/test";

const meta: Meta<typeof AgentDrawer> = {
  title: "Components/AgentDrawer",
  component: AgentDrawer,
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", background: "var(--color-base)", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AgentDrawer>;

// ─── Realistic Mock Data ────────────────────────────────────────────

const runningEngineer: AgentInfo = {
  id: "agent-1",
  name: "Build auth middleware",
  type: "Engineer",
  status: "running",
  description: "Implementing JWT validation middleware with refresh token rotation and session management",
  prompt: "CONTEXT: User needs JWT validation middleware for the Tauri desktop app.\nTASK: Implement JWT validation with refresh token rotation, session management, and proper error handling.\nEFFORT LEVEL: Complete within 120 seconds.\nOUTPUT: Working middleware with tests passing.",
  output: `[4:28] > Reading existing auth code...
[4:29] > Found 3 middleware files in src/middleware/
[4:30] > Creating JWTValidator class...
[4:31] > TypeScript strict mode: 0 errors
[4:32] > Running unit tests... 14/18 passing
_`,
  startedAt: Date.now() - 272000, // 4m 32s ago
  iscDescription: "ISC: Code compiles with zero warnings",
  toolCalls: [
    { name: "Glob", timestamp: Date.now() - 268000 },
    { name: "Read", timestamp: Date.now() - 265000 },
    { name: "Read", timestamp: Date.now() - 260000 },
    { name: "Write", timestamp: Date.now() - 240000 },
    { name: "Bash", timestamp: Date.now() - 220000 },
    { name: "Edit", timestamp: Date.now() - 200000 },
    { name: "Bash", timestamp: Date.now() - 180000 },
  ],
};

const runningExplore: AgentInfo = {
  id: "agent-2",
  name: "Find API endpoints",
  type: "Explore",
  status: "running",
  description: "Scanning codebase for all REST API endpoint definitions and their handlers",
  output: `Found 12 route files in src/routes/
Scanning handlers...`,
  startedAt: Date.now() - 135000, // 2m 15s ago
  iscDescription: "ISC: All messages render correctly with proper styling",
};

const runningResearch: AgentInfo = {
  id: "agent-3",
  name: "Research OAuth patterns",
  type: "Research",
  status: "running",
  description: "Investigating best practices for OAuth 2.0 PKCE flow in Tauri desktop applications",
  output: "",
  startedAt: Date.now() - 63000, // 1m 3s ago
};

const completedArchitect: AgentInfo = {
  id: "agent-4",
  name: "Design component tree",
  type: "Architect",
  status: "completed",
  description: "Mapped the full component hierarchy and data flow for the settings panel redesign",
  prompt: "CONTEXT: Settings panel redesign in progress.\nTASK: Map the full component hierarchy and data flow. Identify shared patterns and recommend extraction points.\nOUTPUT: Component tree with dependency graph.",
  output: `Component tree analysis complete.
Found 23 components across 4 feature domains.
Recommended: Extract shared hooks into src/hooks/shared/
No circular dependencies detected.`,
  startedAt: Date.now() - 180000,
  completedAt: Date.now() - 120000,
  toolCalls: [
    { name: "Glob", timestamp: Date.now() - 178000 },
    { name: "Read", timestamp: Date.now() - 175000 },
    { name: "Read", timestamp: Date.now() - 170000 },
    { name: "Grep", timestamp: Date.now() - 165000 },
    { name: "Read", timestamp: Date.now() - 155000 },
  ],
};

const completedEngineer: AgentInfo = {
  id: "agent-5",
  name: "Fix session storage",
  type: "Engineer",
  status: "completed",
  description: "Migrated session storage from single blob to per-session localStorage keys",
  output: `Migrated 3 files:
- useSessions.ts: per-key storage + quota handling
- useClaude.ts: ISC persistence wired
- App.tsx: race condition guard added
All TypeScript checks passing.`,
  startedAt: Date.now() - 300000,
};

const failedAgent: AgentInfo = {
  id: "agent-6",
  name: "Fetch API docs",
  type: "Research",
  status: "failed",
  description: "Attempted to fetch external API documentation for integration reference",
  output: `Error: Connection timed out after 30s
Retried 3 times with exponential backoff.
Last attempt: ETIMEDOUT connecting to api.example.com:443`,
  startedAt: Date.now() - 90000,
};

const generalAgent: AgentInfo = {
  id: "agent-7",
  name: "Analyze test coverage",
  type: "general-purpose",
  status: "running",
  description: "Computing test coverage metrics across the entire project",
  output: `Scanning test files...
Found 47 test files
Running coverage analysis...`,
  startedAt: Date.now() - 45000,
};

// ─── Stories ────────────────────────────────────────────────────────

/** Running agents with live timer simulation */
export const Running: Story = {
  args: {
    agents: [runningEngineer, runningExplore, runningResearch, generalAgent],
    isOpen: true,
    onToggle: fn(),
  },
};

/** Mixed states — running, completed, and failed agents */
export const MixedStates: Story = {
  args: {
    agents: [
      runningEngineer,
      runningExplore,
      completedArchitect,
      completedEngineer,
      failedAgent,
    ],
    isOpen: true,
    onToggle: fn(),
  },
};

/** All agents completed successfully */
export const AllCompleted: Story = {
  args: {
    agents: [completedArchitect, completedEngineer],
    isOpen: true,
    onToggle: fn(),
  },
};

/** Empty drawer with sparkle icon */
export const Empty: Story = {
  args: {
    agents: [],
    isOpen: true,
    onToggle: fn(),
  },
};

/** Single running agent */
export const SingleRunning: Story = {
  args: {
    agents: [runningEngineer],
    isOpen: true,
    onToggle: fn(),
  },
};

/** Drawer closed — just the toggle button */
export const Closed: Story = {
  args: {
    agents: [runningEngineer, completedArchitect, failedAgent],
    isOpen: false,
    onToggle: fn(),
  },
};

/** With failure prominently displayed */
export const WithFailure: Story = {
  args: {
    agents: [runningExplore, failedAgent, completedEngineer],
    isOpen: true,
    onToggle: fn(),
  },
};
