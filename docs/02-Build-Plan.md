> 🧭 **Navigate:** [[PAI GUI Project]] · [[PAI GUI Architecture]] · [[PAI GUI Wireframes]]

# PAI GUI Build Plan

## Iteration Strategy (Fred's Direction — 2026-04-02)

**Get basic chat working first, then layer features progressively.**

The noise (Algorithm phases, ISC panels, agent drawers, thinking visualisation) is the differentiator but it's NOT the MVP. The MVP is: **type a message, get a streamed response, rendered nicely, in a desktop window.**

### Milestone Roadmap

| Milestone | What | Definition of Done |
|-----------|------|-------------------|
| **M1: Hello World** | Tauri app opens, sends message via SDK, streams response | ✅ **COMPLETE** |
| **M2: Chat Polish** | Markdown rendering, syntax highlighting, message history | ✅ **COMPLETE** |
| **M3: Slash Commands** | `/` autocomplete, skill invocation, `⌘K` palette | ✅ **COMPLETE** |
| **M4: Agent Drawer** | Background agent visibility, expandable output, progress | 🔨 **IN PROGRESS** |
| **M5: Algorithm Viz** | Phase tracker, ISC panel, collapsible phase cards | 🟡 **PARTIAL** |
| **M6: Full PAI** | Voice controls, PRD viewer, settings, session persistence | ⬚ Planned |

**Key insight:** M4 (Agent Drawer) is the feature that makes this better than Opcode. M5 (Algorithm Viz) is nice-to-have noise that should be **opt-in, hidden by default**. Iterate toward showing complexity, not starting with it.

## Multi-Agent Build Strategy

6 work packages, 3 sequential phases, max 3 agents in parallel.

## Dependency Graph

```
Phase 1 (parallel):
  WP1: Tauri Shell + Scaffold ──┐
  WP5: Rust Backend + SDK ──────┤
                                 │
Phase 2 (parallel, after WP1):  │
  WP2: Chat Panel ──────────────┤
  WP3: Algorithm/ISC Panels ────┤
  WP4: Skills/Voice ────────────┤
                                 │
Phase 3 (after all):             │
  WP6: Integration + E2E ───────┘
```

## Work Packages

### WP1: Tauri Shell + Project Scaffold
- **Agent:** Engineer-1
- **Dependencies:** None (starts immediately)
- **Effort:** Fast
- **Delivers:**
  - Tauri 2 + React + Vite project init
  - App shell layout (icon sidebar, tab bar, main area, status bar)
  - Routing between views
  - Tailwind + shadcn/ui setup
  - Zustand store skeleton
  - Project at `~/dev/home/pai-gui/`

### WP2: Chat Panel + Message Rendering
- **Agent:** Engineer-2
- **Dependencies:** WP1 (layout shell)
- **Effort:** Standard
- **Delivers:**
  - Message list component with auto-scroll
  - Markdown rendering (react-markdown + rehype + syntax highlighting)
  - User message bubbles (right-aligned, blue)
  - Assistant message rendering (left, dark gray)
  - Algorithm phase cards (collapsible, styled — not raw text)
  - Tool call cards (collapsible, showing file edits/bash output)
  - Inline ISC badge component (clickable pill)
  - Inline agent badge component (clickable pill)
  - Text input bar with send button, `/skills` hint, `⌘K` hint
  - Streaming message support (progressive token rendering)

### WP3: Algorithm Tracker + ISC Panel
- **Agent:** Engineer-3
- **Dependencies:** WP1 (layout shell)
- **Effort:** Standard
- **Delivers:**
  - Algorithm phase tracker (7-step progress indicator)
  - Current phase highlighting + completed checkmarks
  - Time budget display per phase
  - Effort level badge
  - ISC slide-in panel (right drawer)
  - Real-time ISC list with auto-updating checkboxes
  - Color coding: pending (gray), in_progress (blue), completed (green), failed (red)
  - Confidence tags [E], [I], [R] display
  - Anti-criteria with red accent
  - Count display: "12/19 passing"
  - Event listeners for `isc-created`, `isc-updated`, `algorithm-phase-change`

### WP4: Skill Palette + Voice Controls
- **Agent:** Engineer-4
- **Dependencies:** WP1 (layout shell)
- **Effort:** Standard
- **Delivers:**
  - Cmd+K command palette overlay
  - Skill search with fuzzy filtering
  - Category tabs (All, Thinking, Research, Agents, Execution)
  - Recently used skills section
  - Click-to-invoke (inserts `/skillname` in chat)
  - Skill registry that reads `skill-index.json` via Tauri command
  - Voice mute/unmute toggle in status bar
  - Voice state event listener

### WP5: Rust Backend + SDK Bridge
- **Agent:** Engineer-5
- **Dependencies:** None (starts immediately, parallel with WP1)
- **Effort:** Extended
- **Delivers:**
  - Tauri command handlers for all IPC calls
  - Claude Agent SDK integration via `./embed`
  - Session management (create, list, resume)
  - Message streaming bridge (SDK AsyncIterator → Tauri events)
  - File system access commands (read skills, PRDs, memory, settings)
  - WebSocket event listener for PAI hooks
  - Event forwarding (hook events → Tauri event bus → frontend)
  - Process manager for background agents
  - Skill registry (parse `skill-index.json`)

### WP6: Integration + E2E Testing
- **Agent:** Engineer-6
- **Dependencies:** WP1-5 all complete
- **Effort:** Standard
- **Delivers:**
  - Wire all frontend components to Tauri commands
  - End-to-end flow: type message → stream response → render with phases/ISC
  - Agent drawer wired to live agent events
  - Skill palette wired to skill invocation
  - Playwright E2E tests for key flows
  - Build + package verification (Tauri build produces working .dmg)

## Project Structure

```
~/dev/home/pai-gui/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri app entry
│   │   ├── commands/       # IPC command handlers
│   │   ├── claude/         # SDK bridge
│   │   └── events/         # WebSocket event listener
│   └── Cargo.toml
├── src/                    # React frontend
│   ├── components/
│   │   ├── Chat/           # WP2
│   │   ├── Algorithm/      # WP3
│   │   ├── ISC/            # WP3
│   │   ├── Skills/         # WP4
│   │   ├── Agents/         # WP3 (agent monitor)
│   │   ├── Voice/          # WP4
│   │   └── Layout/         # WP1
│   ├── stores/             # Zustand stores
│   ├── hooks/              # React hooks
│   ├── types/              # Shared TypeScript types
│   └── App.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Prerequisites

- **Rust + Cargo** — Tauri backend
- **Node.js 20+** — frontend build
- **pnpm** — package manager
- **Bun** — PAI tools runtime (already installed)

## To Start Building

```bash
# Phase 1 — run WP1 + WP5 in parallel
# Greg spawns Engineer agents in worktrees

# Phase 2 — after WP1 completes
# WP2, WP3, WP4 start in parallel

# Phase 3 — after all complete
# WP6 integrates and tests
```

---
*Created 2026-04-02 by Greg*
