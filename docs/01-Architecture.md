> 	🧭 **Navigate:** [[PAI GUI Project]] · [[PAI GUI Wireframes]] · [[PAI GUI Build Plan]]

# PAI GUI Architecture

## Three-Layer Design

```
┌─────────────────────────────────────────┐
│         REACT FRONTEND (WebView)        │
│  Chat · Phase Tracker · ISC Panel       │
│  Skill Palette · Agent Monitor · Voice  │
├─────────────────────────────────────────┤
│         RUST BACKEND (Tauri 2)          │
│  SDK Bridge · File System · Event Bus   │
├─────────────────────────────────────────┤
│         CLAUDE CODE + PAI               │
│  (existing — no changes needed)         │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Desktop shell | **Tauri 2** | 10x lighter than Electron (3-10MB vs 80-150MB), Rust safety, proven by Opcode |
| Frontend | **React 19 + TypeScript** | Fred's stack, massive ecosystem, existing PAI dashboards |
| Styling | **Tailwind + shadcn/ui** | Existing PAI patterns, rapid UI |
| State | **Zustand** | Lightweight, TypeScript-first |
| Markdown | **react-markdown + rehype** | Full GFM + syntax highlighting |
| SDK | **claude-agent-sdk/embed** | Purpose-built for embedding Claude Code |
| Build | **Vite** | Fast, Tauri default |
| Package mgr | **pnpm** | Fred's preference |
| Testing | **Vitest + Playwright** | Unit + E2E |

## SDK Integration

The `@anthropic-ai/claude-agent-sdk` (v0.2.90) provides:

| Export        | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `./embed`     | Embed Claude Code into applications (our primary) |
| `./bridge`    | Connect to running Claude Code processes          |
| `./browser`   | Browser-compatible SDK                            |
| `./sdk-tools` | Tool type definitions                             |

**Streaming:** `query()` returns `AsyncIterator` with `includePartialMessages: true` for real-time token emission.

**Structured output:** JSON schema → validated JSON in `ResultMessage.structured_output`.

**V2 Session API (preview):** `send()` / `stream()` for multi-turn with persistence.

## Communication Protocol

```
Frontend ←→ Tauri IPC ←→ Rust Backend
                             │
                             ├── Claude SDK (embed) ←→ Claude Code
                             ├── File System (skills, PRDs, memory)
                             └── WebSocket ←→ PAI Hook Events
```

### Tauri Commands (Frontend → Backend)

```typescript
invoke('send_message', { message, sessionId }) → Stream<Message>
invoke('list_skills') → Skill[]
invoke('invoke_skill', { name, args }) → void
invoke('get_settings') → PAISettings
invoke('list_conversations') → Conversation[]
invoke('get_prd', { path }) → PRDContent
invoke('mute_voice') → void
invoke('kill_agent', { agentId }) → void
```

### Event Stream (Backend → Frontend)

```typescript
'algorithm-phase-change' → { phase, number }
'isc-created' → { id, subject, type }
'isc-updated' → { id, status }
'agent-spawned' → { id, name, task }
'agent-completed' → { id, output }
'voice-state' → { state }
'message-chunk' → { sessionId, content, partial }
```

## Shared Types

```typescript
interface PAIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    phase?: AlgorithmPhase;
    toolCalls?: ToolCall[];
    iscMutations?: ISCMutation[];
    agentSpawns?: AgentSpawn[];
  };
}

type AlgorithmPhase =
  'observe' | 'think' | 'plan' |
  'build' | 'execute' | 'verify' | 'learn';

interface ISCCriterion {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  type: 'criterion' | 'anti';
  confidence: 'E' | 'I' | 'R';
  priority: 'critical' | 'important' | 'nice';
  verifyMethod: string;
}

interface Skill {
  name: string;
  description: string;
  triggers: string[];
  category: string;
}
```

## Key Decisions

1. **Tauri 2 over Electron** — native performance, 10x lighter
2. **SDK embed over subprocess** — official integration path, not a hack
3. **Extend Observability pattern** — PAI already has WebSocket event streaming
4. **Local-first** — no cloud, no accounts, reads PAI file system directly
5. **Project location:** `~/dev/home/pai-gui/`

---
*Created 2026-04-02 by Greg*
