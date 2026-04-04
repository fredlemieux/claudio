import type { Meta, StoryObj } from "@storybook/react";
import { TitleBar } from "../TitleBar";
import { fn } from "@storybook/test";
import type { Session } from "../../hooks/useSessions";

const meta: Meta<typeof TitleBar> = {
  title: "Sections/TitleBar",
  component: TitleBar,
  decorators: [
    (Story) => (
      <div style={{ background: "var(--color-base)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TitleBar>;

const baseSession: Session = {
  id: "s1",
  title: "Fix auth bug",
  messages: [],
  claudeSessionId: "claude-abc-123",
  workingDirectory: "/Users/fred/dev/claudio",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const handlers = {
  onToggleSidebar: fn(),
  onSelectSession: fn(),
  onNewChat: fn(),
  onDeleteSession: fn(),
  onPickDirectory: fn(),
  onOpenPalette: fn(),
  onOpenSettings: fn(),
};

export const Default: Story = {
  args: {
    sessions: [baseSession],
    activeSessionId: "s1",
    activeSession: baseSession,
    sidebarOpen: false,
    isStreaming: false,
    model: "sonnet",
    ...handlers,
  },
};

export const Streaming: Story = {
  args: {
    ...Default.args,
    isStreaming: true,
  },
};

export const OpusModel: Story = {
  args: {
    ...Default.args,
    model: "opus",
  },
};

export const NoDirectory: Story = {
  args: {
    ...Default.args,
    activeSession: { ...baseSession, workingDirectory: undefined },
  },
};

export const NoActiveSession: Story = {
  args: {
    ...Default.args,
    activeSessionId: null,
    activeSession: null,
  },
};
