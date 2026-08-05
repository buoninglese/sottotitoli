# css-theme-guide.md — CSS & Theming System

> **Cross-refs:** `coding-procedures.md` · `solve-mistakes.md` · `pages-directory.md` · `AGENTS.md`

---

## 1. How Day/Night Mode Works

Every page uses `data-theme` attribute on `<html>`:
```html
<html lang="it" data-theme="dark">
```

`js/theme.js` handles:
1. Reads `localStorage.getItem('sottotitoli-theme')`
2. Sets `document.documentElement.setAttribute('data-theme', t)`
3. Updates toggle button icon

---

## 2. CSS Variable Pattern (CRITICAL)

**Each page defines its OWN `:root` and `[data-theme="dark"]` block in a `<style>` tag.**
Variables are NOT globally shared.

### panoramica.html (Use as Template)

```css
:root {
  --bg: #f0f6f8;        --bg-2: #ecf2f4;
  --panel: #fdfefe;      --panel-2: #f4f9fb;
  --line: #d4e6ee;       --line-strong: #bcd6e2;
  --text: #0f1c24;       --text-soft: #3d5260;
  --text-faint: #71899e; --teal: #0e7490;
  --cyan: #06b6d4;       --green: #0e7490;
  --blue: #06b6d4;       --amber: #d97706;
  --purple: #cffafe;
}

[data-theme="dark"] {
  --bg: #0b151c;         --bg-2: #091118;
  --panel: #141e28;      --panel-2: #18232e;
  --line: #253545;       --line-strong: #2f4254;
  --text: #d8eaf4;       --text-soft: #a0c0d4;
  --text-faint: #6b8a9e; --teal: #22d3ee;
  --cyan: #06b6d4;       --green: #22d3ee;
  --blue: #38bdf8;       --amber: #f59e0b;
  --purple: #142836;
}
```

### Variable Naming Convention

| Variable | Purpose | Light | Dark |
|----------|---------|-------|------|
| `--bg` | Page background | `#f0f6f8` | `#0b151c` |
| `--panel` | Card surface | `#fdfefe` | `#141e28` |
| `--line` | Borders | `#d4e6ee` | `#253545` |
| `--text` | Primary text | `#0f1c24` | `#d8eaf4` |
| `--text-soft` | Secondary text | `#3d5260` | `#a0c0d4` |
| `--text-faint` | Muted text | `#71899e` | `#6b8a9e` |
| `--teal`/`--cyan` | Primary accent | teal tones | cyan tones |
| `--amber` | Warnings | `#d97706` | `#f59e0b` |
| `--purple` | Premium | purple tones | dark tones |

---

## 3. How to Add Theming to a New Page

1. Copy `:root` and `[data-theme="dark"]` from `panoramica.html`
2. Adjust colors for your page's aesthetic
3. Use `var(--variable)` for ALL colors
4. Set `<html data-theme="light">` or `"dark"` default
5. Include `js/theme.js` or inline theme toggle
6. Test both modes

---

## 4. Responsive Breakpoints

| Breakpoint | Target |
|-----------|--------|
| 1380px | Large desktop |
| 1160px | Sidebar → icon-only |
| 1100px | Layout reflow |
| 768px | Tablet portrait |
| 500px | Phone — major adjustments |
| **375px** | **Minimum test width** |

---

## 5. Font Stack

| Page | Fonts |
|------|-------|
| panoramica.html | Inter, Manrope, Cormorant Garamond, Material Symbols |
| index.html | Inter, Manrope, JetBrains Mono |
| caption-s8t.html | Inter (primary) |
| purchase.html | Inter, Manrope |
| Most others | Inter |

---

## 6. NEVER Do This

- ❌ Raw hex colors — always `var(--variable)`
- ❌ Assume variables from one page exist on another
- ❌ Remove `[data-theme="dark"]` block
- ❌ `!important` to override theme variables
- ❌ Change variable names without updating ALL usages

---

*→ Next: `solve-mistakes.md` for CSS-related bugs*
*→ Related: `pages-directory.md` for which CSS file belongs to which page*
