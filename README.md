# Claudio

> PAI-powered GUI for Claude Code. All the power, none of the terminal.

A desktop application that wraps Claude Code + PAI through a polished chat interface — making the full Algorithm, skills, agents, and voice system accessible without CLI knowledge.

## Architecture

**Tauri 2** (Rust shell) + **React 19** (TypeScript frontend) + **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk/embed`)

```
┌─────────────────────────────────────┐
│       React Frontend (WebView)      │
│  Chat · Agents · Skills · Voice     │
├─────────────────────────────────────┤
│       Rust Backend (Tauri 2)        │
│  SDK Bridge · File System · Events  │
├─────────────────────────────────────┤
│       Claude Code + PAI             │
│  (existing — no changes needed)     │
└─────────────────────────────────────┘
```

## Key Features

- **Chat-first interface** — ChatGPT-level simplicity, PAI-level power
- **Slash commands** — `/` autocomplete for all 50+ PAI skills
- **Agent drawer** — dive into background agents without clogging the chat
- **Algorithm visualization** — opt-in phase tracking and ISC panels
- **Skill palette** — `Cmd+K` Raycast-style launcher for any skill
- **Voice controls** — mute/unmute, voice settings from the GUI

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Hello World — Tauri + SDK chat | Planned |
| M2 | Chat Polish — markdown, streaming | Planned |
| M3 | Slash Commands — autocomplete, skill palette | Planned |
| M4 | Agent Drawer — background agent visibility | Planned |
| M5 | Algorithm Viz — phase tracker, ISC panel | Planned |
| M6 | Full PAI — voice, PRDs, settings | Planned |

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Tauri 2 |
| Frontend | React 19, TypeScript, Tailwind, shadcn/ui |
| State | Zustand |
| SDK | `@anthropic-ai/claude-agent-sdk/embed` |
| Build | Vite |
| Testing | Vitest + Playwright |

## Development

```bash
# Prerequisites: Rust, Node.js 20+, pnpm

# Install dependencies
pnpm install

# Run dev mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Design

See the [design docs](https://github.com/fredlemieux/claudio/wiki) or the Obsidian vault at `PAI/PAI GUI Project/` for wireframes and architecture details.

## Name

**Claudio** — Claude + audio + Roman Emperor. Named by Fred, approved by Greg.
