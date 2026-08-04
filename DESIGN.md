# Sottotitoli Design System v2

> Visual reference for `index.html` (landing) and `panoramica.html` (dashboard).
> Updated 2026-08-04. Functionality/JS omitted — this is for visual makeovers only.

---

## 1. Typography

### Font Stack

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Primary UI** | Inter | 300, 400, 500, 600, 700, 800, 900 | Body text, buttons, labels, UI chrome |
| **Headlines** | Manrope | 400, 500, 600, 700, 800 | Slide headings, pricing, feature titles |
| **Eyebrow / Mono** | JetBrains Mono | 400, 500 | Uppercase labels, room codes, sidebar section titles |
| **Hero Serif** | Cormorant Garamond | 500, 600 | Hero banner heading on panoramica only |
| **Icons** | Material Symbols Outlined | variable weight 100-700, FILL 0-1 | Sidebar navigation icons |

### Font Sizes (Desktop → Mobile)

```
Landing (index.html):
  h1.headline:    clamp(38px, 5.5vw+12px, 68px)  →  clamp(26px,7vw,36px) at ≤400px
  h2.headline:    clamp(28px, 3.8vw+10px, 48px)
  .eyebrow:       13px (JetBrains Mono, letter-spacing:.14em)
  .body-text:     16px → 15px at ≤640px → 13px at ≤400px

Dashboard (panoramica.html):
  .panel-head h2:    48px → 38px ≤760px → 28px ≤500px
  .hero-content h2:  60px → 52px ≤1380px → 42px ≤760px → 30px ≤500px
  .hero-content p:   18px → 16px ≤760px → 14px ≤500px
  .metric-value:     clamp(1.2rem, 18cqw, 2.4rem) ← container-query units
  .metric-label:     9px, weight 900, uppercase, letter-spacing .15em, opacity .6
  .nav-item:         15px → icon-only at ≤1160px
  .topbar-brand:     28px + version tag (10px, 55% opacity)
  .sidebar-section-title: 10px, JetBrains Mono, letter-spacing .25em
```

---

## 2. Color System

### index.html — Dark-only Theme

```css
--bg:             #050810
--text:           #f8fafc
--accent:         #22d3ee          /* cyan */
--accent-glow:    rgba(34,211,238,.35)
```

Text opacity scale (on dark bg): .90 (captions) → .78 (body) → .55 (eyebrow) → .30 (copyright)

### panoramica.html — Light Mode

```css
--bg:             #f0f6f8          --panel:          #fdfefe
--bg-2:           #ecf2f4          --panel-2:        #f4f9fb
--line:           #d4e6ee          --line-strong:    #bcd6e2
--text:           #0f1c24          --text-soft:      #3d5260
--text-faint:     #71899e          --teal:           #0e7490
--cyan:           #06b6d4          --green:          #0e7490
--blue:           #06b6d4          --amber:          #d97706
--purple:         #cffafe
```

### panoramica.html — Dark Mode

```css
--bg:             #0b151c          --panel:          #141e28
--line:           #253545          --text:           #d8eaf4
--teal:           #22d3ee          --cyan:           #06b6d4
--green:          #22d3ee          --blue:           #38bdf8
--amber:          #f59e0b          --purple:         #142836
```

### Sidebar Accent (panoramica v147 redesign)

| State | Light Mode | Dark Mode |
|-------|-----------|-----------|
| Active/hover icon | `var(--cyan)` (#06b6d4) | `#d0bcff` (lavender-purple) |
| Active bg pill | `rgba(6,182,212,.12)` | `rgba(208,188,255,.15)` |
| Premium items | `#a855f7` (purple) | `#a855f7` |
| Disabled items | 35% opacity | 35% opacity |

### Gradient Card Accents (css/panoramica.css)

| Card Type | Gradient | Border |
|-----------|----------|--------|
| **Cyan** (metric cards) | `rgba(6,182,212,.25→.06)` | `rgba(6,182,212,.22)` |
| **Amber** (review/urgency) | `rgba(217,119,6,.25→.06)` | `rgba(217,119,6,.22)` |
| **Purple** (alt cards) | `rgba(192,132,252,.2→.05)` | `rgba(192,132,252,.18)` |

Dark mode equivalents use ~half opacity.

---

## 3. CSS File Map

| File | Scope |
|------|-------|
| `css/theme-2.css` | Core dashboard — layout, sidebar, panels, cards, buttons, forms, breakpoints |
| `css/panoramica.css` | Material Symbols config, gradient card backgrounds, brutal shadows, overflow fixes |
| `css/tailwind.min.css` | Utility margin/padding/flex classes |
| `css/review.css` | Review/spaced-repetition styles |
| Inline `<style>` in `index.html` | All landing page styles (self-contained, dark-only) |
| Inline `<style>` blocks in `panoramica.html` | Sidebar link animations, Start Session popup |

---

## 4. Layout — panoramica.html

### App Shell
```
.app-shell { height:100dvh; display:grid; grid-template-rows:72px 1fr; grid-template-columns:274px 1fr }

Desktop (>1160px):  sidebar(274px) + workspace(1fr)
Tablet  (≤1160px):  sidebar(66px icon-only) + workspace, column-gap:8px
Phone   (≤860px):   sidebar(48px) + workspace
```

### Sidebar v147 (Redesigned)

- **Icons**: Material Symbols Outlined, 26px, `FILL:1` (solid), `wght:500`
- **Active**: cyan bg pill + glow, `FILL:1 wght:700`
- **Hover**: tooltip via `::after content:attr(title)` + bg pill expands
- **Premium**: purple tint (#a855f7) on hover/active
- **Sections**: JetBrains Mono 10px uppercase labels at 25% letter-spacing
- **Bottom**: trial card ("Acquista minuti") + profile/settings/help

### Start Session (redesigned as popup overlay)

- Fixed overlay: `rgba(0,0,0,.7)` + `backdrop-filter:blur(8px)`
- Diagonal split card: max 1100px, 85vh/700px, 2rem radius
- Close button: top-right circle, red on hover
- Mobile: stacked vertically at ≤1024px

---

## 5. Components — panoramica.html

### Metric Cards (redesigned v147)

```
.stats-row: auto-fit, minmax(150px,1fr), gap:12px
            → repeat(2,1fr) at ≤760px

.metric-card:
  min-height: auto, padding: 24px 20px, border-radius: 20px
  background: cyan gradient (via css/panoramica.css)
  border: 1px solid cyan-tinted
  ::before: 1px gradient top accent line
  hover: translateY(-3px), border brightens
  .selected: 2px cyan border + glow (dark: #d0bcff)

.metric-value:
  clamp(1.2rem, 18cqw, 2.4rem), weight 900, tabular-nums

.metric-label:
  9px, weight 900, uppercase, letter-spacing .15em, opacity .6

.metric-badge: display:none (removed entirely)
```

### Other Cards

| Card | padding | radius | hover |
|------|---------|--------|-------|
| Alt card | 22px | 18px | translateY(-2px) + shadow |
| Feature chip (index) | 30px 20px 18px | 14px | 3D perspective tilt + cyan glow |
| Pricing card (index) | 24px | 18px | subtler lift |

---

## 6. Spacing & Breakpoints

### Radii
| Element | Desktop | Mobile ≤760px | Mobile ≤500px |
|---------|---------|---------------|---------------|
| Pill buttons | `999px` | `999px` | `999px` |
| Metric cards | `20px` | `20px` | `20px` |
| Alt cards | `18px` | `18px` | `18px` |
| Main panel | `34px` | `24px` | `18px` |
| Hero banner | `22px` | `22px` | `18px` |
| Sidebar links | `13px` | `13px` | `13px` |

### Breakpoints — panoramica
| Width | Behaviour |
|-------|-----------|
| `>1380px` | Full sidebar (274px) |
| `≤1380px` | Narrower sidebar (234px), smaller hero heading |
| `≤1160px` | Icon-only sidebar (66px), Material Symbols filled, tooltips |
| `≤860px` | Tight sidebar (48px), smaller icons |
| `≤760px` | Phone: stats 2-col, smaller panels/hero |
| `≤500px` | Small phone: very compact panels/headings |

### Breakpoints — index.html
| Width | Behaviour |
|-------|-----------|
| `>980px` | Desktop: side-by-side, full phone mockup, pricing table |
| `≤980px` | Tablet: column-reverse, smaller phone, full-width frames |
| `≤640px` | Phone: right-side arrows (no dots), hidden animations/feature-grid |
| `≤400px` | Small phone: further shrunk |

---

## 7. New Dependencies (panoramica v147)

| Library | Purpose |
|---------|---------|
| Material Symbols Outlined (Google Fonts) | Sidebar + UI icons, variable fill/weight |
| Tailwind CSS (min) | Utility classes |
| compromise 14.14.2 | NLP / POS tagging |
| pdf.js 3.11.174 | PDF rendering |
| mammoth 1.6.0 | .docx → HTML conversion |

---

## 8. Animation & Motion

### Timing Curves
| Name | Value | Use |
|------|-------|-----|
| `--t-micro` | `180ms cubic-bezier(.2,.8,.2,1)` | Micro-interactions |
| `--t-lift` | `280ms cubic-bezier(.34,1.56,.64,1)` | Springy lift transforms |
| `--t-surface` | `500ms cubic-bezier(.2,.8,.2,1)` | Surface/panel transitions |
| `--transition` | `260ms cubic-bezier(.2,.8,.2,1)` | Default dashboard |
| Sidebar link | `300ms cubic-bezier(.4,0,.2,1)` | Sidebar hover/active |
| Metric hover | `400ms cubic-bezier(.175,.885,.32,1.275)` | Bouncy card lift |

### Keyframe Animations
- **bgFade14s**: Background crossfade (7s half-cycle)
- **phoneRise**: Phone mockup entrance (1600ms)
- **dotPulse**: Active nav dot (2s infinite)
- **streamPulse**: 3-dot streaming indicator (1.6s, staggered)
- **floatSlow**: Hero banner blobs (11-14s alternate)
- **paneIn/paneOut**: Tab transitions with blur (200-340ms)
- **liftIn**: Card entrance (500ms, staggered)
- **btnBreathe**: CTA glow pulse
- **colReveal**: Pricing column fade-in (450ms)

### Reduced Motion
`@media(prefers-reduced-motion:reduce)` — all animations → 0.01ms, transitions → 0.01ms, decorative layers hidden, slides instant
