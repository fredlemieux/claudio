import type { Meta, StoryObj } from "@storybook/react";
import { StepRenderer } from "../StepRenderer";
import type { StreamStep } from "../../types";

const meta: Meta<typeof StepRenderer> = {
  title: "Components/StepRenderer",
  component: StepRenderer,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, padding: 16, background: "var(--color-surface-3)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 8 }}>
          This is the message content above the steps.
        </p>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StepRenderer>;

const now = Date.now();

const makeStep = (
  type: StreamStep["type"],
  summary: string,
  toolName?: string,
): StreamStep => ({
  id: crypto.randomUUID(),
  type,
  timestamp: now,
  summary,
  rawJson: JSON.stringify({ type, summary }),
  toolName,
});

const TYPICAL_STEPS: StreamStep[] = [
  makeStep("system", "Session init — model: claude-opus-4-5"),
  makeStep("thinking", "The user is asking about the refactoring approach. I should consider the implications of extracting handleStreamEvent as a pure function and whether the StreamEventCallbacks interface is the right seam..."),
  makeStep("tool_use", 'Read("/Users/fred/dev/claudio/src/hooks/useClaude.ts")', "Read"),
  makeStep("tool_result", "1→import {useCallback, useRef, useState} from 'react';\n2→import {Command} from '@tauri-apps/plugin-shell';..."),
  makeStep("tool_use", 'Edit("/Users/fred/dev/claudio/src/hooks/useClaude.ts", {old_string: "...", new_string: "..."})', "Edit"),
  makeStep("tool_result", "File updated successfully."),
  makeStep("text", "I've extracted `handleStreamEvent` as a pure function with a `StreamEventCallbacks` interface. This separates event-parsing logic from React state entirely, making it unit-testable without Tauri."),
  makeStep("result", "Done — 4.2s, $0.0142"),
];

export const Default: Story = {
  args: {
    steps: TYPICAL_STEPS,
  },
};

export const SingleStep: Story = {
  args: {
    steps: [makeStep("result", "Done — 1.1s, $0.0021")],
  },
};

export const ThinkingHeavy: Story = {
  args: {
    steps: [
      makeStep("system", "Session init — model: claude-opus-4-6"),
      makeStep("thinking", "Let me think about this carefully. The user wants to refactor the sendMessage monolith. The key insight is that we need a seam between pure event-parsing logic and React state. The StreamEventCallbacks interface provides exactly that — it's a dependency injection point that lets us test handleStreamEvent without mocking React or Tauri. The getBuffer callback is the trickiest part: we need read access to the current content buffer for the multi-turn dedup check, but we can't pass the buffer value at call time because it changes. A callback accessor solves this cleanly."),
      makeStep("tool_use", 'Read("useClaude.ts")', "Read"),
      makeStep("tool_result", "// 480 lines returned..."),
      makeStep("text", "Here's my analysis of the refactoring approach."),
      makeStep("result", "Done — 8.7s, $0.0341"),
    ],
  },
};

export const ToolHeavy: Story = {
  args: {
    steps: [
      makeStep("system", "Session init"),
      makeStep("tool_use", 'Glob("**/*.ts")', "Glob"),
      makeStep("tool_result", "Found 42 files"),
      makeStep("tool_use", 'Grep("handleStreamEvent", {type: "ts"})', "Grep"),
      makeStep("tool_result", "src/hooks/useClaude.ts:57\nsrc/utils/handleStreamEvent.ts:1"),
      makeStep("tool_use", 'Read("useClaude.ts")', "Read"),
      makeStep("tool_result", "// file contents"),
      makeStep("tool_use", 'Read("handleStreamEvent.ts")', "Read"),
      makeStep("tool_result", "// file contents"),
      makeStep("tool_use", 'Edit("useClaude.ts", {...})', "Edit"),
      makeStep("tool_result", "Updated"),
      makeStep("tool_use", 'Bash("tsc --noEmit")', "Bash"),
      makeStep("tool_result", "No errors"),
      makeStep("text", "All changes complete and TypeScript is clean."),
      makeStep("result", "Done — 12.1s, $0.0289"),
    ],
  },
};

export const LongSummaries: Story = {
  args: {
    steps: [
      makeStep("thinking", "This is an extremely long thinking block that goes on and on with lots of detail about the problem at hand including all the edge cases, considerations, potential pitfalls, and alternative approaches that one might consider when solving a complex software engineering challenge like this one."),
      makeStep("tool_use", 'Read("/Users/fred/dev/some-very-long-path/to/a/deeply/nested/file/that/has/a/very/long/name/indeed.ts")', "Read"),
      makeStep("tool_result", "A very long result that contains lots of text content representing the file that was read, including imports, function definitions, interfaces, type aliases, and other TypeScript constructs..."),
      makeStep("text", "This is a detailed explanation with a long summary that wraps across multiple lines when displayed in the step renderer component."),
    ],
  },
};

export const Empty: Story = {
  args: {
    steps: [],
  },
};
