# Claudio Design Tokens

> A proposal for centralising colours, spacing, and other visual constants so they're defined once and referenced everywhere.

## The Problem

Right now, Claudio has **11 hardcoded hex colours** used **216 times** across the codebase:

| Hex | Usage Count | Meaning |
|-----|-------------|---------|
| `#0a0a14` | 24 | App background (deepest dark) |
| `#0e0e1a` | 4 | Title bar background |
| `#12121e` | 16 | Card/input background |
| `#16162a` | 3 | Assistant message bubble |
| `#1a1a2e` | 4 | Hover states |
| `#1e1e3a` | 49 | Borders (most used!) |
| `#2a2a4a` | 3 | Hover borders |
| `#334155` | 19 | Muted text (tertiary) |
| `#475569` | 44 | Secondary text |
| `#94a3b8` | 32 | Hover text / interactive |
| `#e2e8f0` | 18 | Primary text |

Plus `blue-400`, `blue-500`, `blue-600` from Tailwind's palette for the accent colour.

Changing the theme or tweaking a colour means find-and-replace across dozens of files. That's fragile.

## What Are Design Tokens?

Design tokens are **named variables for visual decisions**. Instead of writing `bg-[#0a0a14]`, you write `bg-base` or `bg-surface-1`. The actual hex value lives in one place.

This is exactly what design systems like Material, Radix, and shadcn/ui do — they don't hardcode colours in components, they reference a token layer.

## How Tailwind 4 Handles This

Tailwind 4 introduced `@theme` — a CSS-native way to define design tokens that become Tailwind utility classes. No `tailwind.config.ts` needed. Everything lives in your CSS file.

### The `@theme` directive

```css
@import "tailwindcss";

@theme {
  /* Surfaces (backgrounds) */
  --color-base: #0a0a14;
  --color-surface-1: #0e0e1a;
  --color-surface-2: #12121e;
  --color-surface-3: #16162a;
  --color-surface-hover: #1a1a2e;

  /* Borders */
  --color-border: #1e1e3a;
  --color-border-hover: #2a2a4a;

  /* Text */
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #475569;
  --color-text-tertiary: #334155;
  --color-text-interactive: #94a3b8;

  /* Accent (Claudio blue) */
  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-accent-muted: rgba(59, 130, 246, 0.3);
}
```

This **automatically** generates Tailwind classes:

```html
<!-- Before (hardcoded) -->
<div class="bg-[#0a0a14] text-[#e2e8f0] border-[#1e1e3a]">

<!-- After (tokens) -->
<div class="bg-base text-text-primary border-border">
```

### Why `@theme` and not CSS variables directly?

You *could* use plain CSS custom properties (`var(--color-base)`) with Tailwind's `bg-[var(--color-base)]` syntax. But `@theme` is better because:

1. **Generates real utility classes** — `bg-base` not `bg-[var(--color-base)]`
2. **IDE autocomplete** — Tailwind IntelliSense picks them up
3. **Purging works** — Tailwind tree-shakes unused token classes correctly
4. **No config file** — Everything in CSS, no `tailwind.config.ts` needed

### Semantic naming convention

The token names describe **purpose**, not **appearance**:

| Layer | Convention | Examples |
|-------|-----------|----------|
| **Surface** | `base`, `surface-1`, `surface-2`, `surface-3` | Backgrounds at different elevations |
| **Border** | `border`, `border-hover` | All divider lines |
| **Text** | `text-primary`, `text-secondary`, `text-tertiary` | Content hierarchy |
| **Interactive** | `text-interactive`, `accent`, `accent-hover` | Clickable elements |
| **Status** | `success`, `error`, `warning` | Agent status, alerts |

This means a future light theme just swaps the hex values in `@theme` — the component code doesn't change at all.

## Proposed Token Palette

```css
@theme {
  /* ═══ Surfaces ═══ */
  --color-base: #0a0a14;            /* App background */
  --color-surface-1: #0e0e1a;       /* Title bar, elevated panels */
  --color-surface-2: #12121e;       /* Cards, inputs, dropdowns */
  --color-surface-3: #16162a;       /* Assistant bubbles, nested content */
  --color-surface-hover: #1a1a2e;   /* Hover state on surfaces */

  /* ═══ Borders ═══ */
  --color-border: #1e1e3a;          /* Default border */
  --color-border-hover: #2a2a4a;    /* Hover border */

  /* ═══ Text ═══ */
  --color-text-primary: #e2e8f0;    /* Main content */
  --color-text-secondary: #475569;  /* Labels, hints */
  --color-text-tertiary: #334155;   /* Timestamps, metadata */
  --color-text-interactive: #94a3b8;/* Hover state text */

  /* ═══ Accent ═══ */
  --color-accent: #3b82f6;          /* Primary action, links */
  --color-accent-hover: #60a5fa;    /* Hover on accent */
  --color-accent-muted: rgba(59, 130, 246, 0.3); /* Selection, focus ring */
  --color-accent-strong: #2563eb;   /* User message bubble */

  /* ═══ Status ═══ */
  --color-success: #22c55e;         /* Completed, passing ISC */
  --color-error: #ef4444;           /* Failed, error states */
  --color-warning: #f59e0b;         /* Rate limit warning */
  --color-info: #3b82f6;            /* Running, in progress */

  /* ═══ Radius ═══ */
  --radius-sm: 0.5rem;              /* Badges, chips */
  --radius-md: 0.75rem;             /* Cards, panels */
  --radius-lg: 1rem;                /* Message bubbles, input */
  --radius-xl: 1.25rem;             /* Modal, large containers */
}
```

## Migration Path

**Phase 1: Define tokens** (non-breaking)
- Add `@theme` block to `App.css`
- No component changes yet — both old hex and new token classes work simultaneously

**Phase 2: Migrate components** (file by file)
- Replace `bg-[#0a0a14]` → `bg-base`
- Replace `text-[#e2e8f0]` → `text-text-primary`
- Replace `border-[#1e1e3a]` → `border-border`
- Each file is a single commit

**Phase 3: Light theme** (optional future)
- Wrap current tokens in `@media (prefers-color-scheme: dark)` or a `.dark` class
- Add light theme values
- Components don't change — tokens do all the work

## What This Enables

- **Theme switching** — dark/light with a class toggle
- **Consistent UI** — no more "is it `#475569` or `#334155` for this text?"
- **Storybook theming** — stories can render in both themes
- **Future Claudio skins** — user-customisable accent colour, surface tones

---

*Proposal by Greg, 2026-04-04 — for Fred's review before implementation*
