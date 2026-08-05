# Brutalist Style Migration Guide

Best practices for implementing the new brutalist design system on other Panoramica tabs.

---

## 1. Core Dependencies (already in `<head>`)

These are added once and reused across all tabs:

```html
<!-- Material Symbols (icon font) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<!-- Tailwind CSS CDN with forms + container-queries plugins -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Tailwind config with brutalist color palette -->
<script>
  tailwind.config = { /* ... color/spacing/font config ... */ };
</script>
```

And the custom brutalist utility classes:

```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24';
}
.brutal-shadow { box-shadow: 6px 6px 0px 0px #000000; }
.brutal-shadow-hover:hover { box-shadow: 4px 4px 0px 0px #000000; transform: translate(2px, 2px); }
.premium-glow { box-shadow: 0 0 20px rgba(53, 37, 205, 0.3), 6px 6px 0px 0px #000000; }
.transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
/* CRITICAL: Prevent shadow clipping */
#YOUR-PANEL-ID.content-panel.active { overflow-x: visible; overflow-y: visible; }
#sub-YOUR-TAB { overflow: visible; }
```

---

## 2. Panel Structure — NEVER Delete the Subtabs

**ALWAYS keep the existing panel structure:**

```html
<div class="content-panel" id="pnl-YOUR-PANEL">
  <section class="panel-head"><h2>Panel Title</h2></section>
  <section class="panel-tabs">
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" class="tab-link active" data-subtab="xxx-tab1">Tab 1</button>
      <button role="tab" aria-selected="false" class="tab-link" data-subtab="xxx-tab2">Tab 2</button>
    </div>
  </section>

  <!-- Your new brutalist content goes in the ACTIVE subtab pane -->
  <div role="tabpanel" class="subtab-pane active" id="sub-xxx-tab1">
    <!-- NEW BRUTALIST CONTENT HERE -->
  </div>

  <!-- Other subtabs preserved as-is or updated separately -->
  <div role="tabpanel" class="subtab-pane" id="sub-xxx-tab2">
    <!-- existing or updated content -->
  </div>
</div>
```

**Why:**
- The `panel-head` gives each tab a consistent title that matches every other tab.
- The `panel-tabs` / `subtab-pane` system is the navigation pattern for the entire page.
- The sidebar nav items use `data-panel` attributes to switch between panels.
- Breaking this pattern means the tab disappears from navigation or can't be switched to.

---

## 3. Use Existing CSS Variables for Theming

The page already has CSS variables for light/dark mode. **Map Tailwind colors to these variables with inline styles:**

```html
<!-- Map Tailwind classes to CSS variables via inline style -->
<div class="bg-surface-container-lowest border-2 border-border-brutal brutal-shadow"
     style="background:var(--card);border-color:var(--line);padding:32px">
```

**Variable mapping reference:**

| Tailwind Class | CSS Variable | Purpose |
|---|---|---|
| `bg-surface-container-lowest` / `bg-white` | `var(--card)` | Card/surface background |
| `bg-surface-container-high` | `var(--card)` | Elevated card |
| `bg-surface-container-low` | `var(--bg)` | Page background |
| `border-border-brutal` | `var(--line)` | Border color |
| `text-secondary` | `var(--text-soft)` | Secondary text |
| `text-on-background` | `var(--text)` | Primary text |
| `bg-primary` / `text-primary` | `var(--cyan)` | Accent color (cyan) |
| `text-success-emerald` | `#10B981` | Green (static, works in both modes) |
| `text-warning-amber` | `#F59E0B` | Amber (static) |
| `bg-secondary-container` | `rgba(6,182,212,.08)` | Subtle accent background |

**Always add both the Tailwind class AND the inline CSS variable.** The Tailwind class provides the base utility, the inline style ensures light/dark mode compatibility.

---

## 4. Font Usage

| Element Type | Font | Example |
|---|---|---|
| Headings / Titles | Inter (default) | `<h3 class="font-bold">` |
| UI Labels / Badges / Status text | **Manrope** | `<span style="font-family:'Manrope',sans-serif">` |
| Body text | Inter (default) | `<p>` |
| Code / Technical labels | JetBrains Mono | `<span class="font-label-mono">` |

**Manrope is already loaded** on the page (via Google Fonts in `<head>`). Use it for anything label-like: status badges, button sub-labels, config confirmation text, "Ready for Synthesis", etc.

---

## 5. Icon System

Use **Material Symbols** for brutalist components (step numbers, preset icons, metric checkmarks):

```html
<span class="material-symbols-outlined">bolt</span>
<span class="material-symbols-outlined">fact_check</span>
<span class="material-symbols-outlined" style="color:var(--cyan)">checklist</span>
```

Use **Font Awesome** for legacy components (settings icons, sidebar nav, existing cards):

```html
<i class="fa-solid fa-language"></i>
<i class="fa-solid fa-user"></i>
```

**Do not mix them in the same UI element.** New brutalist sections → Material Symbols. Existing panels/sidebar → Font Awesome.

---

## 6. Shadow Clipping Fix

The `.content-panel.active` class has `overflow-x: hidden` which clips brutalist shadows (they extend 6px beyond the element). **Always add these two rules for any panel using brutalist shadows:**

```css
#pnl-YOUR-PANEL.content-panel.active { overflow-x: visible; overflow-y: visible; }
#sub-YOUR-TAB { overflow: visible; }
```

Without this, the `brutal-shadow` and `premium-glow` shadows will be cut off on the right and bottom edges.

---

## 7. Hook Up Data Sources

Every interactive element must be connected to real data:

- **Transcript selectors** → `window.SottotitoliData.getSessions()`
- **Credits display** → `window.SottotitoliData.getAITokens()`
- **Report generation** → `window.sottotitoliSupabase` edge functions
- **Auth checks** → `window.sottotitoliSupabase.auth.getSession()`

Always handle the case where `SottotitoliData` isn't available yet (it loads asynchronously). Use a retry loop:

```js
if (window.SottotitoliData && window.SottotitoliData.getSessions) {
  window.SottotitoliData.getSessions().then(function(sessions) { /* ... */ });
} else {
  var retries = 0;
  var interval = setInterval(function() {
    if (window.SottotitoliData && window.SottotitoliData.getSessions) {
      clearInterval(interval);
      // proceed
    }
    if (++retries > 20) clearInterval(interval);
  }, 300);
}
```

---

## 8. Preserve Backward Compatibility

When replacing a subtab's content:

1. **Keep the old DOM IDs** if other code references them (e.g., `#sub-rai-miei`, `#raiMieiList`)
2. **Keep `window.generateReport`** if other panels call it (grammar panel does)
3. **Keep settings restore logic** (`localStorage` reads for lang, auto-generate, etc.)
4. **Add new features as opt-in** — don't remove functionality users depend on

---

## 9. Grid Layout Pattern

Use the 12-column bento grid for brutalist layouts:

```html
<div class="grid grid-cols-12 gap-gutter" style="gap:24px">
  <!-- Main content: 8 columns on desktop -->
  <section class="col-span-12 lg:col-span-8 ...">...</section>
  <!-- Sidebar: 4 columns on desktop -->
  <section class="col-span-12 lg:col-span-4 flex flex-col gap-gutter" style="gap:24px">
    <!-- stacked cards -->
  </section>
  <!-- Full-width sections -->
  <section class="col-span-12 ...">...</section>
</div>
```

---

## 10. Checklist Before Committing

- [ ] Subtabs structure preserved (`panel-head` + `panel-tabs` + `subtab-pane`)
- [ ] All Tailwind classes have matching CSS variable overrides via inline `style`
- [ ] Labels/status text use Manrope font
- [ ] Shadow clipping fix added for the panel ID
- [ ] Data sources hooked up (SottotitoliData, Supabase, localStorage)
- [ ] Backward compatibility: old IDs preserved, stub functions kept
- [ ] Tested in both light and dark mode
- [ ] Tested at 375px mobile width
- [ ] Browser console shows no errors on panel switch
