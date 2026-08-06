---
name: layout-migration
description: |
  Migrate content from an existing HTML tab/section into a new layout from a mockup
  or stitch file, preserving all text content, i18n keys, JavaScript functionality,
  and event handlers. For Sottotitoli static HTML pages (panoramica.html pattern).
  Use this when the user provides a mockup and wants to restyle an existing section
  without losing content or breaking JS.
---

# Layout Migration — Content-Preserving Restyle

## What This Skill Does

Take an existing working tab/section and apply a new visual layout from a mockup while keeping all content, i18n, and JS intact. You're a surgeon, not a bulldozer — remove no functionality.

## Required Reading (in order)

Before touching code, read these files:

| Order | File | Why |
|-------|------|-----|
| 1 | `AGENTS.md` | Project identity, conventions, never-list |
| 2 | `docs/ai/coding-procedures.md` | Safe HTML/CSS/JS editing rules |
| 3 | `docs/ai/css-theme-guide.md` | Day/night theming per page |
| 4 | `docs/ai/pages-directory.md` | Find which file contains the tab |
| 5 | Per-page deep dive (e.g., `docs/ai/caption-s8t.md` or `docs/ai/voc-explorer.md`) | Tab-specific context |
| 6 | `/memories/repo/i18n-rules.md` | Leaf-span rule for `data-i18n` |
| 7 | `docs/ai/solve-mistakes.md` | Don't repeat known bugs |

## The Process

### Step 1: Understand Both Sources

**Existing tab:**
- Find the exact line range in the HTML file
- List every `data-i18n` key present
- List every `onclick`, event listener, and JS function reference
- Note where the tab sits in the page structure (what `<section>`, `<div>` tree)

**Stitch mockup:**
- Identify every visual "box" or "card" in the mockup
- Map each box to a purpose (title, stat, chart, button, etc.)
- Note the layout: grid, flex, columns

### Step 2: Create the Content-to-Box Map

```
Mockup Box A (title area)    → Existing <h2> with data-i18n="key"
Mockup Box B (stat card)     → Existing stat value + label
Mockup Box C (chart area)    → Existing chart <div>
Mockup Box D (action button) → Existing <button> with onclick
```

### Step 3: Build the New HTML

Rules:
- Preserve ALL `data-i18n` attributes on their original elements
- Preserve ALL `id` attributes (JS needs them)
- Preserve ALL `onclick` handlers
- Preserve ALL `class` names that JS selects on (check `js/` files)
- Follow the same `:root` / `[data-theme="dark"]` CSS pattern as the page
- Use the page's existing design tokens (variables from css-theme-guide.md)

### Step 4: Validate Before Committing

```bash
# Count div balance in the edited range only
# Check for orphaned tags
node --check <file.js>  # if inline JS was changed
get_errors               # for HTML

# Quick visual test:
# - Desktop 1200px+
# - Mobile 375px
# - Day mode AND night mode
# - Click every button, toggle every tab
```

## What NOT to Do

- ❌ Don't copy the stitch mockup's CSS variables — use the page's existing ones
- ❌ Don't change element `id` values — JS depends on them
- ❌ Don't remove `data-i18n` spans
- ❌ Don't change the tab's position in the page (don't move the section)
- ❌ Don't add new JS without checking if it conflicts with existing
- ❌ Don't edit other tabs/sections — stay in your lane

## Common Pitfalls

| Mistake | Prevention |
|---------|-----------|
| Orphaned `</div>` | Count divs in the edited range, not the whole file |
| Broken i18n | Every text element must keep its `<span data-i18n="...">` |
| Broken dark mode | Test both modes after every significant block of changes |
| Missing JS bindings | Search for each `id` in `js/` to verify it's still used |
| CSS bleed | The stitch mockup may use different class names — adapt, don't copy verbatim |
