import type { Meta, StoryObj } from "@storybook/react";
import { DebugConsole, type LogEntry } from "../DebugConsole";

const meta: Meta<typeof DebugConsole> = {
  title: "Components/DebugConsole",
  component: DebugConsole,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", minHeight: 400, background: "#0a0a14" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DebugConsole>;

const now = Date.now();
const SAMPLE_LOGS: LogEntry[] = [
  { id: "1", timestamp: now - 5000, level: "info", source: "app", message: "Spawning: claude -p \"hello\" --output-format stream-json --no-input --model sonnet" },
  { id: "2", timestamp: now - 4800, level: "info", source: "process", message: "Process spawned (PID unknown — Tauri shell)" },
  { id: "3", timestamp: now - 4500, level: "debug", source: "stdout", message: "event: system" },
  { id: "4", timestamp: now - 4000, level: "debug", source: "stdout", message: "event: assistant" },
  { id: "5", timestamp: now - 3000, level: "debug", source: "stdout", message: "event: content_block_delta" },
  { id: "6", timestamp: now - 2000, level: "debug", source: "stdout", message: "event: result" },
  { id: "7", timestamp: now - 1500, level: "info", source: "process", message: "Result: session=abc123, cost=$0.0042" },
  { id: "8", timestamp: now - 1000, level: "info", source: "process", message: "Process exited: code=0, signal=none" },
];

export const Visible: Story = {
  args: {
    logs: SAMPLE_LOGS,
    visible: true,
    onToggle: () => {},
    onClear: () => {},
  },
};

export const WithErrors: Story = {
  args: {
    logs: [
      ...SAMPLE_LOGS.slice(0, 3),
      { id: "e1", timestamp: now - 3500, level: "error" as const, source: "stderr" as const, message: "Error: ENOENT: no such file or directory, open '/nonexistent/path'" },
      { id: "e2", timestamp: now - 3000, level: "error" as const, source: "stderr" as const, message: "Claude Code cannot be launched inside another Claude Code session." },
      { id: "e3", timestamp: now - 2000, level: "warn" as const, source: "stdout" as const, message: 'Parse error: {"partial":true,"incomp' },
      { id: "e4", timestamp: now - 1000, level: "info" as const, source: "process" as const, message: "Process exited: code=1, signal=none" },
    ],
    visible: true,
    onToggle: () => {},
    onClear: () => {},
  },
};

export const Minimized: Story = {
  args: {
    logs: SAMPLE_LOGS,
    visible: false,
    onToggle: () => {},
    onClear: () => {},
  },
};

export const MinimizedWithErrors: Story = {
  args: {
    logs: [
      ...SAMPLE_LOGS,
      { id: "e1", timestamp: now, level: "error" as const, source: "stderr" as const, message: "Something went wrong" },
      { id: "e2", timestamp: now, level: "error" as const, source: "stderr" as const, message: "Another error" },
    ],
    visible: false,
    onToggle: () => {},
    onClear: () => {},
  },
};

export const Empty: Story = {
  args: {
    logs: [],
    visible: true,
    onToggle: () => {},
    onClear: () => {},
  },
};
