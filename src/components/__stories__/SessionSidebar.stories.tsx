import type { Meta, StoryObj } from "@storybook/react";
import { SessionSidebar } from "../SessionSidebar";
import { fn } from "@storybook/test";
import type { Session } from "../../hooks/useSessions";

const meta: Meta<typeof SessionSidebar> = {
  title: "Components/SessionSidebar",
  component: SessionSidebar,
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", background: "#0a0a14", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SessionSidebar>;

const sampleSessions: Session[] = [
  { id: "s1", title: "Fix auth bug in login.ts", messages: [], createdAt: Date.now() - 3600000, updatedAt: Date.now() - 1800000 },
  { id: "s2", title: "Set up Storybook for UI package", messages: [{ id: "m1", role: "user", content: "Set up Storybook" }, { id: "m2", role: "assistant", content: "Done!" }], createdAt: Date.now() - 7200000, updatedAt: Date.now() - 3600000 },
  { id: "s3", title: "Research Claude Code stream-json events", messages: [{ id: "m3", role: "user", content: "Parse this" }], createdAt: Date.now() - 86400000, updatedAt: Date.now() - 43200000 },
];

export const Open: Story = {
  args: {
    sessions: sampleSessions,
    activeSessionId: "s1",
    isOpen: true,
    onToggle: fn(),
    onSelect: fn(),
    onNew: fn(),
    onDelete: fn(),
  },
};

export const Closed: Story = {
  args: {
    sessions: sampleSessions,
    activeSessionId: "s1",
    isOpen: false,
    onToggle: fn(),
    onSelect: fn(),
    onNew: fn(),
    onDelete: fn(),
  },
};

export const NoSessions: Story = {
  args: {
    sessions: [],
    activeSessionId: null,
    isOpen: true,
    onToggle: fn(),
    onSelect: fn(),
    onNew: fn(),
    onDelete: fn(),
  },
};
