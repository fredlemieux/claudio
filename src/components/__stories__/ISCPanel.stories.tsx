import type { Meta, StoryObj } from "@storybook/react";
import { ISCPanel } from "../ISCPanel";
import type { ISCriterion } from "../AlgorithmTracker";

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

const CRITERIA: ISCriterion[] = [
  { id: "ISC-C1", description: "Debug console captures all stderr and stdout output", status: "completed" },
  { id: "ISC-C2", description: "Error messages display as red blocks in chat", status: "completed" },
  { id: "ISC-C3", description: "Line buffer handles partial JSON chunks correctly", status: "in_progress" },
  { id: "ISC-C4", description: "Process exit code shown in debug console", status: "pending" },
  { id: "ISC-A1", description: "No errors silently swallowed during lifecycle", status: "pending" },
];

export const InProgress: Story = {
  args: { criteria: CRITERIA },
};

export const Empty: Story = {
  args: { criteria: [] },
};

export const AllComplete: Story = {
  args: {
    criteria: CRITERIA.map((c) => ({ ...c, status: "completed" as const })),
  },
};

export const WithFailures: Story = {
  args: {
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
    criteria: Array.from({ length: 20 }, (_, i) => ({
      id: `ISC-C${i + 1}`,
      description: `Criterion number ${i + 1} tests a specific behavior`,
      status: (["completed", "in_progress", "pending", "failed"] as const)[i % 4],
    })),
  },
};
