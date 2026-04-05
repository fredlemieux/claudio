---
prd: true
id: PRD-20260405-m4-agent-drawer
status: COMPLETE
mode: loop
effort_level: Extended
created: 2026-04-05
updated: 2026-04-05
iteration: 1
maxIterations: 20
loopStatus: completed
last_phase: VERIFY
failing_criteria: []
verification_summary: "20/20"
parent: null
children: []
---

# M4: Agent Drawer — Live Agent Visibility

> Transform the basic agent drawer into a polished, real-time agent monitoring panel that makes background agent activity visible, understandable, and beautiful — the feature that makes Claudio better than any other Claude GUI.

## STATUS

| What | State |
|------|-------|
| Progress | 20/20 criteria passing |
| Phase | COMPLETE |
| Next action | Commit changes |
| Blocked by | Nothing |

## CONTEXT

### Problem Space
Claudio spawns background agents (Engineer, Explore, Research, etc.) during Algorithm execution. Currently the AgentDrawer is a basic shell with flat cards. The mockup at `docs/mockups/mockup-agent-drawer.png` shows the vision: rich cards with progress bars, live terminal output, agent grouping, and auto-open behavior. This is the feature that differentiates Claudio from every other Claude GUI.

### Key Files
- `src/components/AgentDrawer.tsx` — Main drawer component (REWRITE — currently basic shell)
- `src/utils/handleStreamEvent.ts` — Stream parser (MODIFY — enhance agent event extraction)
- `src/hooks/useClaude.ts` — Hook wiring (MODIFY — agent state management, auto-open)
- `src/App.tsx` — Top-level wiring (MODIFY — auto-open callback)
- `src/components/__stories__/AgentDrawer.stories.tsx` — Storybook (UPDATE — match new design)
- `docs/mockups/mockup-agent-drawer.png` — Design reference (READ)

### Constraints
- Must use existing design tokens from App.css (bg-base, bg-surface-1, text-text-primary, etc.)
- Must not break existing chat, ISC, or streaming functionality
- AgentInfo interface changes must be backwards-compatible (new fields optional)
- No new npm dependencies — use only what's already installed
- TypeScript strict mode must pass (`pnpm tsc --noEmit`)

### Technical Discovery
- Agent spawns appear in NDJSON stream as `tool_use` blocks with `name: "Agent"`
- Agent input contains: `description` (short), `prompt` (full task), `subagent_type`, `run_in_background`
- Agent results appear as `tool_result` blocks matched by `tool_use_id`
- The stream does NOT provide intermediate agent progress — we can only detect start and end
- Elapsed time must be computed client-side with a 1-second interval timer
- Progress percentage is NOT available from the stream — use indeterminate/estimated display

### Decisions Made
- Progress bars will be indeterminate (animated gradient) for running agents since we can't get real progress %
- Completed agents show full (100%) green bar
- Failed agents show red bar at whatever position
- Agent output is captured from tool_result content (up to 500 chars currently, expand to 2000)
- Auto-open drawer triggers on first agent spawn, but user can close and it stays closed

## PLAN

### Phase 1: AgentInfo Model Expansion
Extend the AgentInfo interface with new optional fields for richer display without breaking existing code.

### Phase 2: AgentCard Redesign
Rewrite AgentCard to match mockup: progress bar, terminal output, type icons, live elapsed timer, ISC subtitle, grouped by status.

### Phase 3: Stream Parser Enhancement
Improve handleStreamEvent to extract richer agent data and increase output capture limit.

### Phase 4: Auto-Open & State Management
Add auto-open behavior when first agent spawns. Drawer auto-opens once per streaming session, respects user close.

### Phase 5: Storybook Stories
Update stories with realistic mock data showing all states.

### Phase 6: Visual Polish
Animations, transitions, terminal styling, responsive behavior.

## IDEAL STATE CRITERIA (Verification Criteria)

### Agent Data Model
- [x] ISC-M4-C1: AgentInfo has optional fields for progress and ISC description | Verify: Grep: `progress.*number` in AgentDrawer.tsx
- [x] ISC-M4-C2: Agent output capture expanded to two thousand characters maximum | Verify: Grep: `2000` in handleStreamEvent.ts
- [x] ISC-M4-C3: Agent type extracted from subagent_type field in stream events | Verify: Grep: `subagent_type` in handleStreamEvent.ts

### Agent Card UI
- [x] ISC-M4-C4: Each agent card displays animated indeterminate progress bar when running | Verify: Grep: `animate` in AgentDrawer.tsx
- [x] ISC-M4-C5: Completed agents show full green progress bar with checkmark icon | Verify: Grep: `completed.*green` in AgentDrawer.tsx
- [x] ISC-M4-C6: Failed agents show red progress bar with error icon | Verify: Grep: `failed.*red` in AgentDrawer.tsx
- [x] ISC-M4-C7: Elapsed time updates live every second via interval timer | Verify: Grep: `setInterval\|useEffect.*1000` in AgentDrawer.tsx
- [x] ISC-M4-C8: Agent type has distinct icon per type like Engineer Explore Research | Verify: Grep: `Engineer\|Explore\|Research` in AgentDrawer.tsx
- [x] ISC-M4-C9: Expanded card shows terminal-styled output with dark background and monospace | Verify: Grep: `font-mono.*bg-` in AgentDrawer.tsx

### Agent Grouping & Layout
- [x] ISC-M4-C10: Running agents displayed above completed and failed agents in drawer | Verify: Read: check sort/filter logic in AgentDrawer.tsx
- [x] ISC-M4-C11: Header shows active count like Active Agents with running number | Verify: Grep: `Active Agents\|running` in AgentDrawer.tsx
- [x] ISC-M4-C12: Empty state shows helpful message with sparkle icon when no agents | Verify: Read: check empty state JSX in AgentDrawer.tsx

### Auto-Open Behavior
- [x] ISC-M4-C13: Drawer auto-opens when first agent spawns during a streaming session | Verify: Grep: `onAutoOpen\|setDrawerOpen` in useClaude.ts or App.tsx
- [x] ISC-M4-C14: Auto-open only fires once per streaming session not on every agent | Verify: Read: check guard logic (ref or flag) preventing repeated opens

### Integration
- [x] ISC-M4-C15: TypeScript strict compilation passes with zero errors after all changes | Verify: CLI: pnpm tsc --noEmit
- [x] ISC-M4-C16: Agent events from real Claude stream populate drawer correctly | Verify: Read: onAgentUpdate callback wired in useClaude.ts streamCallbacks

### Storybook
- [x] ISC-M4-C17: Storybook story exists with running agents showing live timer simulation | Verify: Read: AgentDrawer.stories.tsx has Running story
- [x] ISC-M4-C18: Storybook story shows mixed states with running completed and failed | Verify: Read: AgentDrawer.stories.tsx has MixedStates story

### Anti-Criteria
- [x] ISC-M4-A1: No regressions to message streaming or chat rendering from changes | Verify: Read: MessageList.tsx unchanged, handleStreamEvent text/assistant cases unchanged
- [x] ISC-M4-A2: No new npm dependencies added to package.json for agent drawer | Verify: CLI: git diff package.json shows no new dependencies

## DECISIONS

### 2026-04-05 — Message Layout Order
**Decision:** Assistant message content renders top-to-bottom as: (1) Text response, (2) File changes (collapsible diffs), (3) Steps (optional process view — least important).
**Rationale:** User reads the explanation first, optionally inspects artifacts, rarely needs process steps. File changes are more important than steps but less important than the response text.
**Rejected:** Diffs above text (wrong priority), diffs after steps (buries the artifacts).

### 2026-04-05 — Shiki for Code Rendering
**Decision:** Replace highlight.js/rehype-highlight with Shiki for all code block rendering.
**Rationale:** VS Code TextMate grammars produce dramatically better syntax highlighting. Lazy-loads languages. Supports all VS Code themes.

### 2026-04-05 — Future Milestones Identified
- M5: Shiki code styling (replace highlight.js)
- M6: File change display (collapsible diff cards below text, above steps)
- M7: Rich input bar (markdown-aware, pasted code styling, bullet points)

## LOG

### Iteration 0 — 2026-04-05
- Phase reached: PLAN
- Criteria progress: 0/20
- Work done: PRD created with 18 criteria + 2 anti-criteria
- Failing: all
- Context for next iteration: Start with AgentInfo model expansion (ISC-M4-C1,C2,C3), then AgentCard redesign (C4-C9), then grouping (C10-C12), auto-open (C13-C14), integration (C15-C16), stories (C17-C18)

### Iteration 1 — 2026-04-05
- Phase reached: VERIFY (COMPLETE)
- Criteria progress: 20/20
- Work done: All criteria implemented in prior session. Reconciliation verified every criterion against built code.
- Failing: none
- Evidence: tsc --noEmit passes, all Grep/Read checks confirm implementation, 7 Storybook stories with realistic mock data, no package.json changes, MessageList.tsx untouched
