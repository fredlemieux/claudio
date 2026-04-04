> 🧭 **Navigate:** [[PAI GUI Project]] · [[PAI GUI Architecture]] · [[PAI GUI Build Plan]]

# PAI GUI Wireframes

Three key views showing the chat-first, progressive-disclosure design.

## View 1: Main Chat (Default)

![[mockup-main-chat.png]]

The default view — chat takes all the space. Algorithm phases, ISC, and agents are compact inline badges.

```
┌──────────────────────────────────────────────────────────────────┐
│ 📑 PAI GUI Design  │  PowerX Bug Fix  │  + New                  │
├────┬─────────────────────────────────────────────────────────────┤
│ 💬 │                                                             │
│    │  ┌─────────────────────────────────────────────────────┐   │
│ 🔲 │  │ 👤 Create wireframes for the PAI GUI design         │   │
│    │  └─────────────────────────────────────────────────────┘   │
│ ⚙  │                                                             │
│    │  ┌─────────────────────────────────────────────────────┐   │
│    │  │ 🤖 Greg                                              │   │
│    │  │                                                       │   │
│    │  │ ┌─ 👁️ OBSERVE ━━━━━━━━━━━━━━━━ 1/7 ──── ▶ ─┐       │   │
│    │  │ │  Reverse engineering your request...        │       │   │
│    │  │ └────────────────────────────────────────────┘       │   │
│    │  │                                                       │   │
│    │  │ Here's the architecture plan. Key decisions:          │   │
│    │  │ - Tauri 2 over Electron (10x lighter)                │   │
│    │  │ - Claude Agent SDK embed export                       │   │
│    │  │                                                       │   │
│    │  │ ┌──────────────┐  ┌───────────────────────┐          │   │
│    │  │ │ 📊 ISC 12/19 │  │ 🤖 3 agents running ▸ │          │   │
│    │  │ └──────────────┘  └───────────────────────┘          │   │
│    │  │                                                       │   │
│    │  │ ┌─ 🔨 BUILD ━━━━━━━━━━━━━━━━━ 4/7 ──── ▼ ─┐        │   │
│    │  │ │  Creating Tauri scaffold...                 │        │   │
│    │  │ │  ✅ src-tauri/Cargo.toml                    │        │   │
│    │  │ │  ✅ src/App.tsx                             │        │   │
│    │  │ │  ⏳ src/components/Chat/...                 │        │   │
│    │  │ └─────────────────────────────────────────────┘       │   │
│    │  └─────────────────────────────────────────────────────┘   │
│    │                                                             │
│    │  ┌─────────────────────────────────────────────────────┐   │
│    │  │ Type a message...                    /skills  ⌘K  ➤ │   │
│    │  └─────────────────────────────────────────────────────┘   │
├────┴─────────────────────────────────────────────────────────────┤
│  Greg • Standard • 🤖×3 running • 🔇 muted                     │
└──────────────────────────────────────────────────────────────────┘
```

### Design Notes
- **Tab bar** at top — browser-style session tabs
- **Icon sidebar** (~48px) — chat, skills grid, settings. Minimal chrome
- **Phase cards** — collapsible inline (▶ collapsed, ▼ expanded)
- **ISC + Agent badges** — compact clickable pills in message flow
- **Status bar** — identity, effort level, agent count, voice state

---

## View 2: Agent Drawer (Slide-in)

![[mockup-agent-drawer.png]]

Triggered by clicking the "3 agents running" badge. Drawer slides in from right.

```
┌──────────────────────────────────────────────────────────────────┐
│ 📑 PAI GUI Design  │  PowerX Bug Fix  │  + New                  │
├────┬───────────────────────────────┬─────────────────────────────┤
│ 💬 │  (Chat — compressed ~60%)     │  Active Agents          ✕  │
│    │                                │                             │
│ 🔲 │  ...chat messages...           │  ┌───────────────────────┐ │
│    │                                │  │ 🟢 Engineer-1         │ │
│ ⚙  │                                │  │ Scaffold + Layout     │ │
│    │                                │  │ ISC-BUILD-1  ⏱ 45s    │ │
│    │                                │  │ ████████████░░ 80%    │ │
│    │                                │  └───────────────────────┘ │
│    │                                │                             │
│    │                                │  ┌───────────────────────┐ │
│    │                                │  │ 🟢 Engineer-2   ▼     │ │
│    │                                │  │ Chat Panel             │ │
│    │                                │  │ ISC-UX-4  ⏱ 32s       │ │
│    │                                │  │ █████████░░░░░ 45%    │ │
│    │                                │  │ ┌─────────────────┐   │ │
│    │                                │  │ │ $ Creating Chat  │   │ │
│    │                                │  │ │ component...     │   │ │
│    │                                │  │ │ ✅ MessageList   │   │ │
│    │                                │  │ │ ⏳ InputBar      │   │ │
│    │                                │  │ └─────────────────┘   │ │
│    │                                │  └───────────────────────┘ │
│    │                                │                             │
│    │                                │  ┌───────────────────────┐ │
│    │                                │  │ 🟡 Engineer-5         │ │
│    │                                │  │ Rust Backend           │ │
│    │                                │  │ ISC-ARCH-3  ⏱ 12s     │ │
│    │                                │  │ ████░░░░░░░░░░ 20%   │ │
│    │                                │  └───────────────────────┘ │
│    │                                │                             │
│    │  ┌─────────────────────────┐   │  2 agents queued           │
│    │  │ Type a message...    ➤  │   │                             │
│    │  └─────────────────────────┘   │                             │
├────┴────────────────────────────────┴─────────────────────────────┤
│  Greg • Standard • 🤖×3 running • 🔇 muted                      │
└──────────────────────────────────────────────────────────────────┘
```

### Design Notes
- **Drawer slides in** — chat compresses but stays visible
- **Agent cards** show: name, ISC criterion, elapsed time, progress bar
- **Expandable** (▼) — click to see live agent output in mini terminal
- **Close ✕** to dismiss — back to full-width chat
- **Queued agents** shown at bottom

---

## View 3: Skill Palette (Cmd+K)

![[mockup-skill-palette.png]]

Raycast/Spotlight-style floating overlay. Background dims.

```
┌──────────────────────────────────────────────────────────────────┐
│                      (dimmed background)                         │
│                                                                  │
│         ┌──────────────────────────────────────────┐             │
│         │ 🔍 Search skills...                  ⌘K  │             │
│         ├──────────────────────────────────────────┤             │
│         │ RECENTLY USED                            │             │
│         │  🔬 Research         Comprehensive...  ▸ │             │
│         │  🎨 Art              Visual content...  ▸ │             │
│         ├──────────────────────────────────────────┤             │
│         │ All │ Thinking │ Research │ Agents │ Exec│             │
│         ├──────────────────────────────────────────┤             │
│         │  🔬 Research       Multi-model research  │             │
│         │  👥 Council        Multi-agent debate     │             │
│         │  🔴 Red Team       32-agent adversarial   │             │
│         │  🌐 Browser        Debug-first browser    │             │
│         │  🎨 Art            Visual content          │             │
│         │  🔬 First Principles  Root cause analysis  │             │
│         │  📋 JIRA           Ticket access           │             │
│         │  ⏱️ Clockify       Time tracking            │             │
│         │  📊 Evals          Agent evaluation         │             │
│         │  🏗️ Architect      System design            │             │
│         ├──────────────────────────────────────────┤             │
│         │ 50+ skills • Type to filter              │             │
│         └──────────────────────────────────────────┘             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Design Notes
- **Floating overlay** — Cmd+K to open, Esc to close
- **Recently used** pinned at top
- **Category tabs** for filtering (All, Thinking, Research, Agents, Execution)
- **Click skill** → inserts `/skillname` in chat input
- **Fuzzy search** as you type

---

## Slash Commands (Input Bar Behaviour)

The input bar is slash-command-native — mirrors Claude Code CLI behaviour:

- **`/` key** → triggers inline autocomplete dropdown with matching skills
- **Tab** → completes the selected skill name
- **`/skillname args`** → sends skill invocation directly
- **`⌘K`** → opens full skill palette overlay (for browsing, not just typing)
- **Up arrow** → cycles through message history

```
┌─────────────────────────────────────────────────────────┐
│ /res                                            ⌘K  ➤  │
├─────────────────────────────────────────────────────────┤
│  🔬 /Research — Comprehensive research and analysis     │
│  🔴 /RedTeam — Adversarial analysis, 32 agents         │
│  🔬 /Recon — Security reconnaissance                    │
│  📹 /Remotion — Programmatic video creation             │
└─────────────────────────────────────────────────────────┘
```

Autocomplete is fuzzy-matched, shows icon + name + description, keyboard navigable.

## Interaction Patterns

| Action | Trigger | Result |
|--------|---------|--------|
| New conversation | Click "+" tab | Fresh chat session |
| Expand phase | Click ▶ on phase card | Shows phase details inline |
| View agents | Click "🤖 N agents" badge | Agent drawer slides in |
| Dive into agent | Click ▼ on agent card | Mini terminal with live output |
| Open skills | Cmd+K or click 🔲 icon | Skill palette overlay |
| Slash command | Type `/` in input bar | Inline autocomplete dropdown |
| Invoke skill | Click skill or Tab-complete | `/skillname` inserted in chat |
| Mute voice | Click 🔇 in status bar | Voice toggle |
| View ISC | Click "📊 ISC N/M" badge | ISC panel slides in (similar to agent drawer) |

---
*Created 2026-04-02 by Greg*
