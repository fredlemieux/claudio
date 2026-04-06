# Claudio

A desktop GUI for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). All the power, none of the terminal.

<!-- TODO: Hero screenshot of Claudio in action — full chat view with agent drawer open -->

## Why

Claude Code can do things that no graphical AI interface — not ChatGPT, not Claude.ai — can touch. Agents, tools, file access, project context, hooks, the whole runtime. But it lives in the terminal. And every time I tried to show someone what it could do, the terminal was a wall. Non-technical people saw a blinking cursor and checked out before seeing any of the magic.

I built Claudio so that anyone can access the power of Claude Code without needing to know what a CLI is. It's not a replacement for the terminal — I love the terminal. It's a window into Claude Code for the people who don't.

Claudio is built around the [PAI Algorithm](https://github.com/danielmiessler/PAI) by Daniel Miessler — a systematic approach to problem-solving that uses Ideal State Criteria, phased execution, and verification to get consistently excellent results. PAI genuinely changed how I work. The UI is designed to visualize that workflow: algorithm phases, ISC criteria tracking, agent orchestration. It will still work without PAI, but the agent drawer, algorithm tracker, and ISC panels are built with that context in mind, so some features may feel less relevant outside of it.

You type a message, Claudio spawns `claude` under the hood, streams the JSON output, and renders it in a real UI with markdown, syntax highlighting, agent tracking, and algorithm visualization.

## What it looks like

<!-- TODO: GIF of streaming response with syntax highlighting -->
<!-- TODO: Screenshot of agent drawer showing parallel agents working -->
<!-- TODO: Screenshot of algorithm tracker showing ISC criteria -->

*Screenshots coming soon — the app is functional but actively evolving.*

## Features

- **Streaming chat** — Real-time markdown rendering with Shiki syntax highlighting (VS Code quality)
- **Agent drawer** — See background agents spawn, track their tool calls, read their output. No more wondering what's happening behind the scenes
- **Algorithm tracker** — Watch the PAI Algorithm phases progress, see Ideal State Criteria get created and checked off in real-time
- **Session management** — Multiple conversations, persistent history, resume where you left off
- **Debug console** — Full stream visibility. Every JSON event, every stdout chunk, every process lifecycle event. When something goes wrong, you can see exactly why
- **Slash commands** — `/` autocomplete for skills (when used with PAI)

## How it works

Claudio doesn't embed Claude or call the API directly. It spawns the `claude` CLI as a subprocess using Tauri's shell plugin, passes your message with `--output-format stream-json`, and parses the JSON stream in real-time.

```
You type a message
        |
        v
Tauri spawns: bash -c 'claude -p "your message" --output-format stream-json < /dev/null'
        |
        v
Raw bytes arrive on stdout (encoding: raw to bypass Tauri buffering issues)
        |
        v
Line buffer splits on \n, JSON.parse each line
        |
        v
handleStreamEvent() — pure function, routes to callbacks
        |
        v
React state updates: content, agents, ISC criteria, algorithm phases
```

This means Claudio works with whatever Claude Code version you have installed. No API keys to configure in Claudio itself — if `claude` works in your terminal, Claudio works.

## Architecture

**Tauri 2** (Rust shell) + **React 19** (TypeScript frontend)

```
src/
  types.ts              — All domain types (discriminated unions, no unsafe casts)
  layout.ts             — Shared layout constants

  hooks/
    useClaude.ts        — Process spawn + stream orchestration
    useDebugLog.ts      — Debug log state (500-entry cap)
    useISC.ts           — ISC criteria state + localStorage persistence
    useAgentTracker.ts  — Agent lifecycle (spawn/update discriminated union)
    useSessions.ts      — Session management + message persistence
    useSkills.ts        — Skill index loading

  utils/
    handleStreamEvent.ts — Pure stream event parser (zero side effects, fully tested)

  components/           — UI components (AgentDrawer, AlgorithmTracker, DebugConsole, etc.)
  sections/             — Page sections (MessageList, InputBar, TitleBar)
```

The stream parsing is a pure function with zero dependencies on React or Tauri. All side effects flow through callbacks. This means the entire JSON stream pipeline is testable without a browser, without Tauri, without Claude — just synthetic events in, assertions out.

## Tech stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Syntax highlighting | Shiki |
| Markdown | react-markdown + remark-gfm |
| Build | Vite 7 |
| Testing | Vitest (117 tests — unit + E2E pipeline) |
| Stories | Storybook 8 |

## Testing

The test suite has two layers:

**Unit tests** (66) — Test `handleStreamEvent` in isolation. Every event type, every callback, every edge case. One assertion per test, Uncle Bob clean.

**Pipeline E2E tests** (26) — A `FakeCommand` implements the same interface as Tauri's shell command. It emits canned JSON lines through fake stdout, and `runPipeline` feeds them through the exact same decode/parse/callback chain that the real app uses. Fully deterministic, no network, no Claude process.

```bash
pnpm test        # Run all tests
pnpm test:watch  # Watch mode
```

To add a real captured session as a test fixture:
1. Run: `claude -p "your prompt" --output-format stream-json > captured.jsonl`
2. Drop the file in `src/utils/__tests__/fixtures/`
3. Load it: `const fake = await loadFixtureFile(path)`
4. Assert: `const result = await runPipeline(fake)`

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (for Tauri)
- Node.js 20+
- pnpm
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and working (`claude` in your PATH)

### Getting started

```bash
# Install dependencies
pnpm install

# Run in dev mode (opens the app with hot reload)
pnpm tauri dev

# Run the test suite
pnpm test

# Build for production
pnpm tauri build

# Storybook (component development)
pnpm storybook
```

## Status

This is early and actively developed. What works:

- Streaming chat with full markdown + syntax highlighting
- Agent drawer with real-time tool call tracking
- Algorithm phase visualization and ISC criteria tracking
- Session persistence and management
- Debug console with full stream visibility
- 117 automated tests

What's coming:

- More test fixtures from real Claude sessions
- Improved error recovery and retry handling
- Voice integration
- Settings panel refinements

## The thinking behind it

A few architectural decisions that might be interesting:

**Why spawn the CLI instead of using the API directly?** Because Claude Code is more than an API wrapper. It has tools, permissions, hooks, project context, CLAUDE.md files — a whole runtime. Embedding the API would mean reimplementing all of that. Spawning the CLI means you get everything for free, and Claudio stays thin.

**Why a pure function for stream parsing?** The `handleStreamEvent` function takes an event and callbacks — no React, no Tauri, no state. This was a deliberate choice from the start. It means the most complex part of the app (interpreting Claude's JSON stream) is trivially testable. 66 unit tests prove it works correctly for every event type.

**Why discriminated unions for stream events?** The original code used `[key: string]: unknown` with `as` casts everywhere. One refactoring session replaced that with proper TypeScript discriminated unions for `StreamEvent` (7 variants) and `AgentEvent` (spawn vs. update). Zero unsafe casts remain in the stream parser.

**Why extract hooks?** The original `useClaude` was 452 lines doing seven different jobs. Now it's ~250 lines focused on process orchestration, with `useDebugLog`, `useISC`, and `useAgentTracker` each owning their own state. Testable in isolation, readable at a glance.

## License

MIT

## Name

**Claudio** — Claude I/O. Getting stuff in and out of Claude. Also a nod to Emperor Claudius. Built by Fred, with Greg.
