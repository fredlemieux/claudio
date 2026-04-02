import type { Meta, StoryObj } from "@storybook/react";
import { ToolUseIndicator, type ToolCall } from "../ToolUseIndicator";

const meta: Meta<typeof ToolUseIndicator> = {
  title: "Components/ToolUseIndicator",
  component: ToolUseIndicator,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, padding: 20, background: "#16162a", borderRadius: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToolUseIndicator>;

const now = Date.now();

export const SingleRunning: Story = {
  args: {
    tools: [
      { id: "1", name: "Read", status: "running", input: "/src/App.tsx", startedAt: now },
    ],
  },
};

export const MultipleCompleted: Story = {
  args: {
    tools: [
      { id: "1", name: "Read", status: "completed", input: "/src/App.tsx", output: "import { useState }...", startedAt: now - 3000, completedAt: now - 2500 },
      { id: "2", name: "Edit", status: "completed", input: '{"file_path":"/src/App.tsx","old_string":"foo","new_string":"bar"}', output: "File updated successfully", startedAt: now - 2500, completedAt: now - 2000 },
      { id: "3", name: "Bash", status: "completed", input: "npx tsc --noEmit", output: "No errors found", startedAt: now - 2000, completedAt: now - 500 },
    ],
  },
};

export const MixedStatus: Story = {
  args: {
    tools: [
      { id: "1", name: "Grep", status: "completed", input: 'pattern: "useState"', output: "Found 12 matches", startedAt: now - 5000, completedAt: now - 4000 },
      { id: "2", name: "Read", status: "completed", input: "/src/hooks/useSessions.ts", output: "export interface Session { ... }", startedAt: now - 4000, completedAt: now - 3500 },
      { id: "3", name: "Edit", status: "error", input: '{"file_path":"/src/types.ts"}', output: "Error: old_string not found in file", startedAt: now - 3500, completedAt: now - 3000 },
      { id: "4", name: "Agent", status: "running", input: "Researching authentication patterns", startedAt: now - 1000 },
    ],
  },
};

export const Empty: Story = {
  args: {
    tools: [],
  },
};

export const ManyTools: Story = {
  args: {
    tools: Array.from({ length: 8 }, (_, i): ToolCall => ({
      id: String(i),
      name: ["Read", "Edit", "Bash", "Grep", "Glob", "Write", "WebSearch", "Agent"][i],
      status: i < 6 ? "completed" : "running",
      input: `Tool input ${i}`,
      output: i < 6 ? `Output ${i}` : undefined,
      startedAt: now - (8 - i) * 1000,
      completedAt: i < 6 ? now - (7 - i) * 1000 : undefined,
    })),
  },
};
