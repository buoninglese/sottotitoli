# css-theme-guide.md — CSS & Theming System

> **For any AI agent editing styles in Sottotitoli.**
> The theming system is the most fragile part of the codebase. Understand it before touching CSS.

---

## 1. How Day/Night Mode Works

Every page uses a `data-theme` attribute on `<html>`:
```html
<html lang="it" data-theme="dark">
```

`js/theme.js` (or inline theme toggle) handles:
1. Reading `localStorage.getItem('sottotitoli-theme')`
2. Setting `document.documentElement.setAttribute('data-theme', t)`
3. Updating the toggle button icon (☀️/🌙)

---

## 2. The CSS Variable Pattern (CRITICAL)

**Each page defines its OWN `:root` and `[data-theme="dark"]` block in a `<style>` tag.**
Variables are NOT globally consistent across pages. Each page has its own palette.

### panoramica.html Pattern (Use This as Template)

```css
:root {
  --bg: #f0f6f8;
  --bg-2: #ecf2f4;
  --panel: #fdfefe;
  --panel-2: #f4f9fb;
  --line: #d4e6ee;
  --line-strong: #bcd6e2;
  --text: #0f1c24;
  --text-soft: #3d5260;
  --text-faint: #71899e;
  --teal: #0e7490;
  --cyan: #06b6d4;
  --green: #0e7490;
  --blue: #06b6d4;
  --amber: #d97706;
  --purple: #cffafe;
  --purple-soft: #ecfeff;
}

[data-theme="dark"] {
  --bg: #0b151c;
  --bg-2: #091118;
  --panel: #141e28;
  --panel-2: #18232e;
  --line: #253545;
  --line-strong: #2f4254;
  --text: #d8eaf4;
  --text-soft: #a0c0d4;
  --text-faint: #6b8a9e;
  --teal: #22d3ee;
  --cyan: #06b6d4;
  --green: #22d3ee;
  --blue: #38bdf8;
  --amber: #f59e0b;
  --purple: #142836;
  --purple-soft: #1a3040;
}
```

### index.html Pattern (Dark-Only)

```css
:root {
  --bg: #050810;
  --text: #f8fafc;
  --accent: #22d3ee;
  --accent-glow: rgba(34,211,238,.35);
}
/* No [data-theme] override — index is always dark */
```

### purchase.html Pattern (Shared Variables)

```css
:root {
  --font-ui: "Inter", ui-sans-serif, system-ui, sans-serif;
  --bg: #f0f6f8;
  --text: #0f1c24;
  /* ... */
}

body[data-theme="dark"] {
  --bg: #0b151c;
  --text: #d8eaf4;
  /* ... */
}
```
Note: Some pages use `body[data-theme="dark"]` instead of `[data-theme="dark"]`.

---

## 3. Variable Naming Conventions

| Variable | Purpose | Example Light | Example Dark |
|----------|---------|---------------|--------------|
| `--bg` | Page background | `#f0f6f8` | `#0b151c` |
| `--bg-2` | Secondary background | `#ecf2f4` | `#091118` |
| `--panel` | Card/surface background | `#fdfefe` | `#141e28` |
| `--panel-2` | Alt panel background | `#f4f9fb` | `#18232e` |
| `--line` | Borders/dividers | `#d4e6ee` | `#253545` |
| `--line-strong` | Strong borders | `#bcd6e2` | `#2f4254` |
| `--text` | Primary text | `#0f1c24` | `#d8eaf4` |
| `--text-soft` | Secondary text | `#3d5260` | `#a0c0d4` |
| `--text-faint` | Muted/disabled text | `#71899e` | `#6b8a9e` |
| `--teal` | Primary accent | `#0e7490` | `#22d3ee` |
| `--cyan` | Bright accent | `#06b6d4` | `#06b6d4` |
| `--green` | Success/positive | `#0e7490` | `#22d3ee` |
| `--blue` | Info/links | `#06b6d4` | `#38bdf8` |
| `--amber` | Warning/callout | `#d97706` | `#f59e0b` |
| `--purple` | Premium/secondary | `#cffafe` | `#142836` |

---

## 4. Common Variable Patterns Per Page

### Older Pages (studio.html, account.html)
```css
:root {
  --bg: #f0f2f5;
  --card: #fff;
  --line: #e2e5ea;
  --text: #111827;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --accent-purple: #7c3aed;
  --accent-green: #059669;
  --accent-blue: #2563eb;
  --accent-amber: #d97706;
}
```

### caption-s8t.html (Extended Theme)
Has additional caption-specific variables:
```css
--cap-v5-color, --cap-v5-panel-bg, --cap-v6-*, --cap-v7-*
```
Plus font variables:
```css
.font-crisp { --font-live: ...; --font-tx: ...; }
```

---

## 5. How to Add Theming to a New Page

1. Copy the `:root` and `[data-theme="dark"]` blocks from `panoramica.html`
2. Adjust colors if needed for your page's specific aesthetic
3. Use `var(--variable)` for ALL colors in your CSS
4. Add `<html data-theme="light">` or `data-theme="dark"` as default
5. Include `js/theme.js` or an inline theme toggle
6. Test both modes

---

## 6. NEVER Do This

- ❌ Use raw hex colors in CSS — always use `var(--variable)`
- ❌ Assume variables from one page exist on another
- ❌ Change a variable name without updating ALL usages
- ❌ Remove the `[data-theme="dark"]` block
- ❌ Use `!important` to override theme variables

---

## 7. Responsive Breakpoints (General)

| Breakpoint | Target |
|-----------|--------|
| 1380px | Large desktop adjustments |
| 1160px | Sidebar collapses to icon-only |
| 1100px | Layout reflows |
| 1000px | Tablet adjustments |
| 860px | Grid changes |
| 768px | Tablet portrait |
| 760px | Font size reductions |
| 700px | Stack layouts |
| 640px | Small tablet |
| 520px | Compact layouts |
| 500px | Phone — major adjustments |
| 400px | Small phone |
| 375px | **Minimum test width** |

---

## 8. Font Stack (Per-Page)

| Page | Fonts |
|------|-------|
| `panoramica.html` | Inter, Manrope, Cormorant Garamond, Material Symbols |
| `index.html` | Inter, Manrope, JetBrains Mono |
| `caption-s8t.html` | Inter (primary) |
| `purchase.html` | Inter, Manrope |
| `onboarding.html` | Inter, Manrope |
| Older pages | Inter only |

---

*Last updated: 2026-08-05*
