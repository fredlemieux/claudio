> 🧭 **Navigate:** [[01-Architecture]] · [[02-Build-Plan]] · [[03-Wireframes]] · [[04-Event-Model]] · [[05-Component-Guidelines]]

# Claudio

> A desktop app that gives non-technical users full access to PAI's Algorithm, skills, agents, and voice system through a polished ChatGPT-style interface — without ever touching a terminal.

## Status

| What | State |
|------|-------|
| Phase | **M4: Agent Drawer** — wiring agent stream detection |
| M1: Hello World | **COMPLETE** — chat works, streamed responses |
| M2: Chat Polish | **COMPLETE** — markdown, syntax highlight, sessions |
| M3: Slash Commands | **COMPLETE** — autocomplete, Cmd+K palette, dynamic skills |
| M4: Agent Drawer | **IN PROGRESS** — UI built, needs stream wiring |
| M5: Algorithm Viz | **PARTIAL** — ISC panel in sidebar, AlgorithmTracker built |
| M6: Full PAI | Planned |
| Repo | [github.com/fredlemieux/claudio](https://github.com/fredlemieux/claudio) |
| Local | `~/dev/claudio/` |
| Name | **Claudio** — Claude + audio + Roman Emperor |

## Implementation Notes

- **Streaming:** Tauri 2 shell plugin `spawn()` + `--output-format stream-json --verbose`
- **Session storage:** Per-session localStorage keys (index + `claudio-msg-{id}`)
- **Skills:** Scanned from `~/.claude/skills/*/SKILL.md` via bash+jq (no stale index file)
- **ISC detection:** Parsed from streamed text (regex) + TodoWrite tool_use events (structured)
- **Storybook:** Configured with stories for all major components

## The Problem

Claude Code + PAI is incredibly powerful but CLI-only. "Claude coworker" (Claude Desktop) is limited — no Algorithm, no ISC, no skills, no agents. No way for a regular user to access PAI's power without terminal knowledge.

## The Solution

**Chat-first desktop app** — Tauri 2 + React wrapping Claude Agent SDK's `embed` export. The SDK does 90% of the work. We build the UI layer.

## Key Discovery

Anthropic's `@anthropic-ai/claude-agent-sdk` has a dedicated `./embed` export literally designed for embedding Claude Code into applications. Plus `./bridge` for connecting to running processes and `./browser` for browser-compatible builds. This means we're not hacking around the CLI — we're using the official integration path.

## Design Philosophy

1. **Chat IS the app** — takes 80%+ of screen, no permanent sidebars
2. **Progressive disclosure** — details visible IF you want them
3. **Inline badges** — ISC count, agent count, phases as compact clickable pills
4. **Slide-in drawers** — agent details on demand, not stealing real estate
5. **Cmd+K everything** — Raycast-style skill palette

## Pages

- [[PAI GUI Architecture]] — Tech stack, layers, SDK integration
- [[PAI GUI Wireframes]] — Three key views with ASCII mockups
- [[PAI GUI Build Plan]] — 6 work packages for parallel agent build
- [[PAI GUI Event Model]] — Complete stream-json event taxonomy + visualization mapping
- [[PAI GUI Prior Art]] — Existing Claude GUIs and what they're missing

## Prior Art

| Project | Stack | Gap for PAI |
|---------|-------|-------------|
| **Opcode** | Tauri 2 + React | No Algorithm/ISC/skills |
| **CodePilot** | Electron + Next.js | Heavy, no PAI integration |
| **claude-code-webui** | Web | Just a chat wrapper |
| **CloudCLI** | Web + plugins | No local-first |

None expose PAI. We need a PAI-native GUI.

---
*Created 2026-04-02 by Greg*
