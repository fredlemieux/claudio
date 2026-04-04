# Claudio Component Guidelines

## Directory Structure

```
src/
  components/     # Reusable primitives
  sections/       # Page-level composites
  hooks/          # Shared logic
  App.tsx          # Orchestrator
```

## components/ — Reusable Primitives

Self-contained UI elements that could appear anywhere in the app. They receive data via props and emit events via callbacks. They do NOT know about the app's page layout or which section they live in.

**Examples:** `MessageContent`, `SkillPalette`, `AgentDrawer`, `ToolUseIndicator`, `SlashAutocomplete`

**Rules:**
- Never import from `sections/`
- No direct hook calls for app-level state (sessions, Claude process, etc.)
- Local UI state (open/closed, hover, animation) is fine
- Should be demonstrable in Storybook in isolation

## sections/ — Page Composites

Compose multiple `components/` into a region of the App layout. They ARE specific to the page structure — there's only one `TitleBar`, one `InputBar`, etc.

**Examples:** `TitleBar`, `WelcomeScreen`, `MessageList`, `InputBar`

**Rules:**
- May import from `components/` (one-way dependency)
- Never import from other `sections/`
- Receive data and callbacks from App.tsx via props
- May contain local UI state (slash autocomplete index, scroll position)
- Should NOT contain business logic (that goes in hooks)

## hooks/ — Shared Logic

Custom hooks that encapsulate state and side effects.

**Examples:** `useSessions` (localStorage persistence), `useClaude` (CLI interaction), `useSkills` (skill registry), `useSettings` (preferences)

**Rules:**
- Pure logic — no JSX
- May be consumed by App.tsx or sections (but not components, unless the hook is truly UI-generic)
- Business logic lives here, not in components or sections

## App.tsx — The Orchestrator

Composes sections, passes props, manages cross-cutting concerns (keyboard shortcuts, overlay toggles). Should stay under ~120 lines.

**Rules:**
- No inline JSX beyond composing sections and overlays
- State that spans multiple sections lives here
- If a piece of state is only used by one section, consider moving it into that section

## When to Create a New Component vs Section

| Signal | Create a... |
|--------|-------------|
| Reusable in multiple places | `components/` |
| Has its own Storybook story in isolation | `components/` |
| Represents a page region (title bar, footer, sidebar panel) | `sections/` |
| Composes 2+ existing components into a layout | `sections/` |
| Only makes sense in the context of App.tsx's layout | `sections/` |

## Naming

- PascalCase for component files: `TitleBar.tsx`, `MessageList.tsx`
- camelCase for hooks: `useClaude.ts`, `useSessions.ts`
- No `index.ts` barrel files — import directly from the file

## Storybook

Every component and section should have a `.stories.tsx` file. Place stories in:
- `src/components/__stories__/ComponentName.stories.tsx`
- `src/sections/__stories__/SectionName.stories.tsx`

Stories should demonstrate the component in isolation with representative props. For sections, mock the data they'd receive from App.tsx.

## Dependency Direction

```
App.tsx
  └─ sections/
       └─ components/
  └─ hooks/ (consumed by App and sections)
```

**Never:** components → sections, sections → sections, components → App
