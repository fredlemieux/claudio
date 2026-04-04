import type { Meta, StoryObj } from "@storybook/react";
import { AlgorithmTracker, type AlgorithmPhase, type ISCriterion } from "../AlgorithmTracker";

const meta: Meta<typeof AlgorithmTracker> = {
  title: "Components/AlgorithmTracker",
  component: AlgorithmTracker,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", minHeight: 500, background: "var(--color-base)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AlgorithmTracker>;

const PHASES: AlgorithmPhase[] = [
  { id: "0", name: "OBSERVE", icon: "\u{1F441}\uFE0F", status: "completed" },
  { id: "1", name: "THINK", icon: "\u{1F9E0}", status: "completed" },
  { id: "2", name: "PLAN", icon: "\u{1F4CB}", status: "active" },
  { id: "3", name: "BUILD", icon: "\u{1F528}", status: "pending" },
  { id: "4", name: "EXECUTE", icon: "\u26A1", status: "pending" },
  { id: "5", name: "VERIFY", icon: "\u2705", status: "pending" },
  { id: "6", name: "LEARN", icon: "\u{1F4DA}", status: "pending" },
];

const CRITERIA: ISCriterion[] = [
  { id: "ISC-C1", description: "Debug console captures all stderr and stdout output", status: "completed" },
  { id: "ISC-C2", description: "Error messages display as red blocks in chat", status: "completed" },
  { id: "ISC-C3", description: "Line buffer handles partial JSON chunks correctly", status: "in_progress" },
  { id: "ISC-C4", description: "Process exit code shown in debug console", status: "pending" },
  { id: "ISC-A1", description: "No errors silently swallowed during lifecycle", status: "pending" },
];

export const Visible: Story = {
  args: {
    phases: PHASES,
    criteria: CRITERIA,
    visible: true,
    onToggle: () => {},
  },
};

export const Minimized: Story = {
  args: {
    phases: PHASES,
    criteria: [],
    visible: false,
    onToggle: () => {},
  },
};

export const AllPending: Story = {
  args: {
    phases: [],
    criteria: [],
    visible: true,
    onToggle: () => {},
  },
};

export const AllComplete: Story = {
  args: {
    phases: PHASES.map((p) => ({ ...p, status: "completed" as const })),
    criteria: CRITERIA.map((c) => ({ ...c, status: "completed" as const })),
    visible: true,
    onToggle: () => {},
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
      { id: "ISC-A1", description: "No credentials exposed in commit history", status: "completed" as const },
    ],
    visible: true,
    onToggle: () => {},
  },
};
