import type { Meta, StoryObj } from "@storybook/react";
import { WelcomeScreen } from "../WelcomeScreen";
import { fn } from "@storybook/test";
import type { Session } from "../../hooks/useSessions";

const meta: Meta<typeof WelcomeScreen> = {
  title: "Sections/WelcomeScreen",
  component: WelcomeScreen,
  decorators: [
    (Story) => (
      <div style={{ height: "80vh", background: "#0a0a14" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WelcomeScreen>;

const recentSessions: Session[] = [
  { id: "s1", title: "Fix auth bug in login.ts", messages: [{ id: "m1", role: "user", content: "Fix it" }, { id: "m2", role: "assistant", content: "Done" }], createdAt: Date.now() - 3600000, updatedAt: Date.now() },
  { id: "s2", title: "Set up Storybook", messages: [{ id: "m3", role: "user", content: "Setup" }], createdAt: Date.now() - 7200000, updatedAt: Date.now() - 3600000 },
  { id: "s3", title: "Research stream-json events", messages: [], createdAt: Date.now() - 86400000, updatedAt: Date.now() - 43200000 },
];

export const WithRecentSessions: Story = {
  args: {
    sessions: recentSessions,
    onSwitchSession: fn(),
    onSetInput: fn(),
    onFocusInput: fn(),
  },
};

export const NoSessions: Story = {
  args: {
    sessions: [],
    onSwitchSession: fn(),
    onSetInput: fn(),
    onFocusInput: fn(),
  },
};
