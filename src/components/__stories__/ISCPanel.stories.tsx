import type { Meta, StoryObj } from "@storybook/react";
import { ISCPanel } from "../ISCPanel";
import type { AlgorithmPhase, ISCriterion } from "../AlgorithmTracker";

const meta: Meta<typeof ISCPanel> = {
  title: "Components/ISCPanel",
  component: ISCPanel,
  decorators: [
    (Story) => (
      <div style={{ width: 260, background: "var(--color-base)", border: "1px solid var(--color-border)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ISCPanel>;

const PHASES: AlgorithmPhase[] = [
  { id: "0", name: "OBSERVE", icon: "👁️", status: "completed" },
  { id: "1", name: "THINK", icon: "🧠", status: "completed" },
  { id: "2", name: "PLAN", icon: "📋", status: "active" },
  { id: "3", name: "BUILD", icon: "🔨", status: "pending" },
  { id: "4", name: "EXECUTE", icon: "⚡", status: "pending" },
  { id: "5", name: "VERIFY", icon: "✅", status: "pending" },
  { id: "6", name: "LEARN", icon: "📚", status: "pending" },
];

const CRITERIA: ISCriterion[] = [
  { id: "ISC-C1", description: "Debug console captures all stderr and stdout output", status: "completed" },
  { id: "ISC-C2", description: "Error messages display as red blocks in chat", status: "completed" },
  { id: "ISC-C3", description: "Line buffer handles partial JSON chunks correctly", status: "in_progress" },
  { id: "ISC-C4", description: "Process exit code shown in debug console", status: "pending" },
  { id: "ISC-A1", description: "No errors silently swallowed during lifecycle", status: "pending" },
];

export const InProgress: Story = {
  args: {
    phases: PHASES,
    criteria: CRITERIA,
  },
};

export const Empty: Story = {
  args: {
    phases: [],
    criteria: [],
  },
};

export const PhasesOnly: Story = {
  args: {
    phases: PHASES.slice(0, 3).map((p) => ({ ...p, status: "completed" as const })),
    criteria: [],
  },
};

export const AllComplete: Story = {
  args: {
    phases: PHASES.map((p) => ({ ...p, status: "completed" as const })),
    criteria: CRITERIA.map((c) => ({ ...c, status: "completed" as const })),
  },
};

export const WithFailures: Story = {
  args: {
    phases: [
      ...PHASES.slice(0, 5).map((p) => ({ ...p, status: "completed" as const })),
      { ...PHASES[5], status: "active" as const },
      PHASES[6],
    ],
    criteria: [
      { id: "ISC-C1", description: "Auth tokens refresh before expiry", status: "completed" as const },
      { id: "ISC-C2", description: "Rate limiter blocks over 100 req per min", status: "failed" as const },
      { id: "ISC-C3", description: "Session persists across tab refreshes", status: "completed" as const },
      { id: "ISC-C4", description: "Streaming buffer flushes on disconnect", status: "failed" as const },
      { id: "ISC-A1", description: "No credentials exposed in commit history", status: "completed" as const },
    ],
  },
};

export const ManyCriteria: Story = {
  args: {
    phases: PHASES,
    criteria: Array.from({ length: 20 }, (_, i) => ({
      id: `ISC-C${i + 1}`,
      description: `Criterion number ${i + 1} tests a specific behavior`,
      status: (["completed", "in_progress", "pending", "failed"] as const)[i % 4],
    })),
  },
};
