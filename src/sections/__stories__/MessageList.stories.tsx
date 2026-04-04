import type { Meta, StoryObj } from "@storybook/react";
import { MessageList } from "../MessageList";
import type { Message } from "../../types";

const meta: Meta<typeof MessageList> = {
  title: "Sections/MessageList",
  component: MessageList,
  decorators: [
    (Story) => (
      <div style={{ height: "80vh", background: "#0a0a14", display: "flex", flexDirection: "column" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageList>;

const conversation: Message[] = [
  { id: "m1", role: "user", content: "Fix the auth bug in login.ts", timestamp: Date.now() - 60000 },
  {
    id: "m2",
    role: "assistant",
    content: `I'll investigate the auth bug. Let me read the file first.

\`\`\`tsx
// The issue was on line 42 — the token was being checked before refresh
if (token.isExpired()) {
  await refreshToken(); // This was missing
}
\`\`\`

Fixed! The token refresh was being skipped when the session was still valid but the JWT had expired.`,
    timestamp: Date.now() - 45000,
    durationMs: 12400,
    costUsd: 0.0234,
  },
  { id: "m3", role: "user", content: "Great, can you also add a test for that?", timestamp: Date.now() - 30000 },
  {
    id: "m4",
    role: "assistant",
    content: "Added a test in `auth.test.ts` that verifies token refresh triggers when JWT is expired but session is active. All tests pass.",
    timestamp: Date.now() - 15000,
    durationMs: 8200,
    costUsd: 0.0156,
  },
];

export const Conversation: Story = {
  args: {
    messages: conversation,
    isStreaming: false,
    toolCalls: [],
    sidebarOpen: false,
    drawerOpen: false,
  },
};

export const StreamingResponse: Story = {
  args: {
    messages: [
      conversation[0],
      { id: "m-stream", role: "assistant", content: "", timestamp: Date.now() },
    ],
    isStreaming: true,
    toolCalls: [],
    sidebarOpen: false,
    drawerOpen: false,
  },
};

export const WithSidebarOpen: Story = {
  args: {
    messages: conversation,
    isStreaming: false,
    toolCalls: [],
    sidebarOpen: true,
    drawerOpen: false,
  },
};

export const WithDrawerOpen: Story = {
  args: {
    messages: conversation,
    isStreaming: false,
    toolCalls: [],
    sidebarOpen: false,
    drawerOpen: true,
  },
};
