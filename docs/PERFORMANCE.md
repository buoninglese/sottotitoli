# PERFORMANCE.md — Performance Targets & Optimization

> **Bundle sizes, load times, and optimization targets for a 12,000-line static site.**
>
> **Cross-refs:** `architecture.md` · `deploy-runbook.md` · `AGENTS.md`

---

## Baseline Metrics

Measured on GitHub Pages (production), throttled to Fast 3G.

| Metric | Target | Current (est.) |
|--------|--------|----------------|
| **First Contentful Paint (FCP)** | < 2.0s | ~1.5s |
| **Largest Contentful Paint (LCP)** | < 2.5s | ~2.0s (panoramica) |
| **Time to Interactive (TTI)** | < 3.0s | ~2.5s |
| **Total Blocking Time (TBT)** | < 200ms | ~100ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 | ~0.05 |

---

## Resource Sizes

### CSS (6 files)

| File | Size | Critical? |
|------|------|-----------|
| `css/theme-2.css` | ~12KB | ✅ Shared theme across 6 pages |
| `css/panoramica.css` | ~8KB | ✅ Dashboard-specific |
| `css/tailwind.min.css` | ~120KB | ⚠️ Full Tailwind — only ~30% used |
| `css/traduzione.css` | ~4KB | ❌ Translation page only |
| `css/review.css` | ~2KB | ❌ Review display only |
| `css/bootstrap-theme.min.css` | ~20KB | ⚠️ Bootstrap — mostly unused |
| **Total CSS** | **~166KB** | |

### JavaScript (20+ files)

| File | Size | Critical? |
|------|------|-----------|
| `config.js` | ~2KB | ✅ Required by all pages |
| `js/auth.js` | ~8KB | ✅ Required by 7 pages |
| `js/theme-2.js` | ~12KB | ✅ Required by 5 pages |
| `js/i18n.js` | ~6KB | ✅ Required by 4 pages |
| `js/data-service.js` | ~15KB | ⚠️ Data-heavy pages only |
| `js/cefr-*.js` (3 files) | ~20KB | ❌ Vocabulary pages only |
| CDN: Supabase SDK | ~80KB | ✅ Required by all authenticated pages |
| CDN: compromise.js | ~60KB | ❌ NLP pages only |
| CDN: pdf.js | ~300KB | ❌ Import feature only |
| CDN: mammoth.js | ~100KB | ❌ Import feature only |
| **Total self-hosted JS** | **~80KB** | |
| **Total CDN JS** | **~540KB** | |

### Fonts

| Font | Format | Size |
|------|--------|------|
| Inter (400-900) | Google Fonts CDN | ~80KB (subset) |
| Manrope (500-800) | Google Fonts CDN | ~50KB (subset) |
| JetBrains Mono | Google Fonts CDN | ~20KB (subset) |
| Material Symbols Outlined | Google Fonts CDN | ~30KB (subset) |
| Font Awesome 6.5 | CDN | ~30KB |
| **Total fonts** | | **~210KB** |

---

## Optimization Opportunities

### 🔴 High Impact

| # | What | Saving | Effort |
|---|------|--------|--------|
| 1 | **Tree-shake Tailwind** — compile only used classes | ~80KB CSS | 1h |
| 2 | **Lazy-load pdf.js + mammoth.js** — only on Import click | ~400KB JS | 30min |
| 3 | **Remove Bootstrap** — `bootstrap-theme.min.css` mostly unused | ~20KB CSS | 15min |

### 🟡 Medium Impact

| # | What | Saving | Effort |
|---|------|--------|--------|
| 4 | **Defer non-critical JS** — `<script defer>` for CEFR, NLP | Perceived TTI -0.5s | 15min |
| 5 | **Preload critical fonts** — `<link rel="preload">` for Inter, Manrope | FCP -0.3s | 5min |
| 6 | **Inline critical CSS** — above-the-fold styles in `<head>` | FCP -0.2s | 1h |

### 🟢 Low Impact

| # | What | Saving | Effort |
|---|------|--------|--------|
| 7 | **Font subsetting** — limit Google Fonts to Latin + weights used | ~40KB | 30min |
| 8 | **Compromise.js tree-shaking** — only import needed plugins | ~20KB | 1h |
| 9 | **SVG sprite inline** — replace `<use href="#i-*">` with inline SVGs | ~5KB, zero requests | 1h |

---

## Font Loading Strategy

Current (all blocking):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet">
```

Recommended:
```html
<!-- Preconnect early -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload critical weights -->
<link rel="preload" href="https://fonts.gstatic.com/s/inter/..." as="font" crossorigin>

<!-- Load with display=swap for text visibility during load -->
<link href="https://fonts.googleapis.com/css2?family=Inter:...&display=swap" rel="stylesheet">
```

---

## panoramica.html — Largest Page Analysis

| Metric | Value | Note |
|--------|-------|------|
| HTML size | ~830KB | 12,000+ lines |
| DOM elements | ~8,000 | All 11 panels rendered at once |
| CSS rules | ~3,000 | 6 stylesheets combined |
| Event listeners | ~200 | Sidebar clicks, sub-tabs, tooltips |
| Memory (idle) | ~15MB | Primarily DOM + Supabase SDK |

**Biggest wins for panoramica:**
1. Lazy-load panels that aren't visible (`display:none` already prevents rendering cost, but DOM weight remains)
2. Tree-shake Tailwind (saves ~80KB)
3. Defer pdf.js + mammoth.js (saves ~400KB on initial load)

---

## Mobile Targets

| Metric | Target | Current |
|--------|--------|---------|
| FCP (3G) | < 3.0s | ~2.5s |
| TTI (3G) | < 5.0s | ~4.0s |
| Total weight | < 500KB | ~1MB (with CDN) |
| Self-hosted weight | < 200KB | ~250KB |

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
