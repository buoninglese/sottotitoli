# ACCESSIBILITY.md — Accessibility Patterns & Compliance

> **ARIA patterns, screen reader support, and accessibility conventions used across all 11 pages.**
>
> **Cross-refs:** `css-theme-guide.md` · `coding-procedures.md` · `AGENTS.md`

---

## ARIA Patterns in Use

### Tab Panels (panoramica.html)

Every sub-tab panel uses the WAI-ARIA Tabs pattern:

```html
<div class="tabs" role="tablist">
  <button role="tab" aria-selected="true" class="tab-link active" data-subtab="gh-dashboard">Dashboard</button>
  <button role="tab" aria-selected="false" class="tab-link" data-subtab="gh-strategy">Strategy</button>
</div>
<div role="tabpanel" class="subtab-pane active" id="sub-gh-dashboard">...</div>
<div role="tabpanel" class="subtab-pane" id="sub-gh-strategy">...</div>
```

**JavaScript contract:** When switching tabs, update `aria-selected` on the button and toggle `.active` on the matching `tabpanel`.

### Sidebar Navigation (all authenticated pages)

```html
<a class="nav-item sidebar-link active" href="#" data-panel="panoramica" aria-current="page">...</a>
```

- `aria-current="page"` marks the active section
- Sidebar links use `title` attributes for tooltip text on mobile

### Skip Link (all pages)

```html
<a href="#main-content" class="skip-link sr-only">Vai al contenuto principale</a>
```

Allows keyboard users to bypass the topbar and sidebar. First focusable element on every page.

---

## Screen Reader Support

### SR-Only Text

Hidden headings provide page context for screen readers:

```html
<h1 class="sr-only">Sottotitoli</h1>
```

The `.sr-only` class (from Tailwind) visually hides content while keeping it in the accessibility tree.

### Icon Labels

All icon-only buttons have `aria-label`:

```html
<button class="theme-toggle" aria-label="Toggle color theme">...</button>
<button class="icon-btn" aria-label="Notifications">...</button>
<button class="icon-btn" aria-label="Account">...</button>
```

### Live Caption Region

The caption area in `caption-s8t.html` should use `aria-live="polite"` to announce new captions to screen readers (not yet implemented — pending).

---

## Keyboard Navigation

### Tab Order

1. Skip link → 2. Topbar (brand, start session, theme, notifications, account) → 3. Sidebar navigation → 4. Main content → 5. Footer

### Focus Styles

All interactive elements have visible focus indicators via CSS:

```css
:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
```

### Dropdown Menus

The user dropdown and notification dropdown close on Escape:

```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.getElementById('userDropdown').classList.remove('open');
    document.getElementById('notifDropdown').classList.remove('open');
  }
});
```

---

## Color & Contrast

### Dark Mode

| Element | Background | Text | Contrast Ratio |
|---------|-----------|------|---------------|
| Body | `#0b151c` | `#d8eaf4` | 12.4:1 ✅ |
| Cards | `rgba(30,31,38,.4)` | `#e0e2e6` | 7.8:1 ✅ |
| Cyan accent | `#06b6d4` | `#fff` | 4.6:1 ⚠️ (AA for large text only) |
| Purple accent | `#a855f7` | `#fff` | 4.5:1 ⚠️ |

### Light Mode

| Element | Background | Text | Contrast Ratio |
|---------|-----------|------|---------------|
| Body | `#f0f6f8` | `#0f1c24` | 12.8:1 ✅ |
| Cards | `#fff` | `#1e293b` | 10.2:1 ✅ |

**Note:** Cyan and purple accents may not meet WCAG AA for small text (4.5:1 minimum). Consider darkening accent colors or using them only for large text / decorative elements.

---

## Semantic HTML

### Landmarks Used

| Element | Purpose |
|---------|---------|
| `<header class="topbar">` | Site header with brand, actions, tools |
| `<aside class="sidebar">` | Primary + account navigation |
| `<main id="main-content">` | All page content |
| `<nav aria-label="Navigazione principale">` | Workspace + learning navigation |
| `<nav aria-label="Account e impostazioni">` | Bottom sidebar nav |
| `<section class="panel-head">` | Panel title area |
| `<article>` | Hero banner cards, stat cards |

---

## Known Gaps

| Issue | Priority | Fix |
|-------|----------|-----|
| `aria-live` on caption region | 🟡 Medium | Add `aria-live="polite"` to caption bar |
| Accent color contrast (cyan/purple) | 🟢 Low | Darken accent colors or use only for large text |
| Modal focus trapping | 🟡 Medium | Trap focus inside modals (Start Session, Import, Create Bank) |
| Form labels on search inputs | 🟢 Low | Add visible or `aria-label` to search fields |
| Mobile touch targets < 44px | 🟢 Low | Some icon buttons are 36px on mobile |

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
