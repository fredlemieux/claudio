import type { Meta, StoryObj } from "@storybook/react";
import { AgentDrawer, type AgentInfo } from "../AgentDrawer";
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

const sampleAgents: AgentInfo[] = [
  {
    id: "agent-1",
    name: "Explore Agent",
    type: "explore",
    status: "running",
    description: "Searching for auth patterns in the codebase",
    output: "",
    startedAt: Date.now() - 12000,
  },
  {
    id: "agent-2",
    name: "Engineer Agent",
    type: "engineer",
    status: "completed",
    description: "Refactored login component to use new auth hook",
    output: "Successfully refactored 3 files",
    startedAt: Date.now() - 60000,
  },
  {
    id: "agent-3",
    name: "Research Agent",
    type: "research",
    status: "failed",
    description: "Failed to fetch API documentation",
    output: "Error: Connection timed out",
    startedAt: Date.now() - 30000,
  },
];

export const Open: Story = {
  args: {
    agents: sampleAgents,
    isOpen: true,
    onToggle: fn(),
  },
};

export const Closed: Story = {
  args: {
    agents: sampleAgents,
    isOpen: false,
    onToggle: fn(),
  },
};

export const Empty: Story = {
  args: {
    agents: [],
    isOpen: true,
    onToggle: fn(),
  },
};

export const SingleRunning: Story = {
  args: {
    agents: [sampleAgents[0]],
    isOpen: true,
    onToggle: fn(),
  },
};
