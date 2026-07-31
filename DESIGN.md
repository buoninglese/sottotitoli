# Sottotitoli Design System

> Visual reference for `index.html` (landing) and `panoramica.html` (dashboard).
> Functionality/JS omitted — this is for visual makeovers only.

---

## 1. Typography

### Font Stack

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Primary UI** | Inter | 300, 400, 500, 600, 700, 800, 900 | Body text, buttons, labels, UI chrome |
| **Headlines** | Manrope | 400, 500, 600, 700, 800 | Slide headings, pricing, feature titles |
| **Eyebrow / Mono** | JetBrains Mono | 400, 500 | Uppercase labels, room codes, tech accents |
| **Hero Serif** | Cormorant Garamond | 500, 600 | Hero banner heading on panoramica only |

### Font Sizes (Desktop → Mobile)

```
Landing (index.html):
  h1.headline:    clamp(38px, 5.5vw+12px, 68px)  →  clamp(26px,7vw,36px) at ≤400px
  h2.headline:    clamp(28px, 3.8vw+10px, 48px)
  .eyebrow:       13px (JetBrains Mono, letter-spacing:.14em)
  .body-text:     16px → 15px at ≤640px → 13px at ≤400px
  .continua-btn:  14px
  .topbar-brand:  17px (Manrope)

Dashboard (panoramica.html):
  .panel-head h2:    48px → 38px ≤760px → 28px ≤500px
  .hero-content h2:  60px → 52px ≤1380px → 42px ≤760px → 30px ≤500px
  .hero-content p:   18px → 16px ≤760px → 14px ≤500px
  .metric-value:     28px
  .nav-item:         15px → hidden ≤1160px (icon-only)
  .topbar-brand:     28px (Inter, weight 800)
  .alt-card h3:      24px
```

### Line Heights
- Headlines: `1.1` (tight)
- Body text: `1.55–1.65`
- Hero paragraph: `1.55`

---

## 2. Color System

### index.html — Dark-only Theme

```css
--bg:             #050810          /* deep near-black blue */
--surface:        rgba(255,255,255,.03)
--text:           #f8fafc          /* near-white */
--text-secondary: rgba(226,232,240,.70)
--accent:         #22d3ee          /* cyan */
--accent-glow:    rgba(34,211,238,.35)
```

**Text opacity scale (on dark bg):**
- `.90` — captions, prices
- `.88` — lang-it translation lines
- `.85` — auth toast, mobile arrow buttons
- `.78` — body text
- `.75` — table heads, phone-brand
- `.70` — text-secondary
- `.65` — pricing list items, mobile toggle btns
- `.62` — feature chip descriptions
- `.60` — arrow buttons (desktop)
- `.55` — pricing toggle (inactive), eyebrow
- `.50` — phone-time
- `.48` — plan descriptions
- `.45` — bottom nav links, table row labels
- `.42` — lang-en subtitle lines
- `.35` — main-detail
- `.30` — copyright
- `.25` — stream indicator dots

**Accent glow variants:**
- `rgba(34,211,238,.35)` — accent-glow
- `rgba(34,211,238,.22)` — selection
- `rgba(34,211,238,.15)` — scrollbar thumb
- `rgba(34,211,238,.06-.12)` — borders, hover states

### panoramica.html + theme-2.css — Light & Dark

#### Light Mode
```css
--bg:             #f0f6f8          /* cool off-white-blue */
--bg-2:           #ecf2f4
--panel:          #fdfefe           /* white card surface */
--panel-2:        #f4f9fb           /* slightly blue card */
--line:           #d4e6ee           /* soft blue-grey border */
--line-strong:    #bcd6e2
--text:           #0f1c24           /* near-black blue */
--text-soft:      #3d5260           /* secondary text */
--text-faint:     #71899e           /* muted/hint text */
--black-btn:      #12222e           /* dark CTA button bg */
--teal:           #0e7490
--cyan:           #06b6d4
--green:          #0e7490           /* (synonym for teal in this theme) */
--blue:           #06b6d4
--amber:          #d97706            /* urgency/warning */
--purple:         #cffafe            /* accent highlight bg */
--purple-soft:    #ecfeff
```

#### Dark Mode
```css
--bg:             #0b151c           /* dark navy */
--bg-2:           #091118
--panel:          #141e28           /* dark card */
--panel-2:        #18232e
--line:           #253545
--line-strong:    #2f4254
--text:           #d8eaf4           /* light blue-white */
--text-soft:      #a0c0d4
--text-faint:     #6b8a9e
--teal:           #22d3ee
--cyan:           #06b6d4
--green:          #22d3ee
--blue:           #38bdf8
--amber:          #f59e0b
--purple:         #142836
--purple-soft:    #1a3040
```

### Gradient Card Accents (panoramica.html inline)

Cards use gradient backgrounds with color-coded borders:

| Card Type | Gradient | Border | Use |
|-----------|----------|--------|-----|
| **Cyan** | `rgba(6,182,212,.25→.06)` | `rgba(6,182,212,.22)` | Metric cards, insights |
| **Amber** | `rgba(217,119,6,.25→.06)` | `rgba(217,119,6,.22)` | Review/urgency cards |
| **Purple** | `rgba(192,132,252,.2→.05)` | `rgba(192,132,252,.18)` | Personal/admin cards |
| **Green** | `rgba(16,185,129,.25→.06)` | `rgba(16,185,129,.22)` | Vocabulary/word banks |

Dark mode equivalents use ~half opacity.

---

## 3. Spacing & Layout

### Radii
| Element | Desktop | Mobile (≤760px) | Mobile (≤500px) |
|---------|---------|-----------------|-----------------|
| Pill buttons | `999px` | `999px` | `999px` |
| Cards | `14–18px` | `14–18px` | `14–18px` |
| Main panel | `34px` | `24px` | `18px` |
| Topbar (mobile) | — | `12px` | `10px` |
| Hero banner | `22px` | `22px` | `18px` |
| Feature chips | `14px` | `14px` | `14px` |

### Padding
| Element | Desktop | Mobile |
|---------|---------|--------|
| Slides (index) | `100px 40px 80px` | `80px 52px 72px 18px` (≤640px) |
| Main panel (panoramica) | `40px 40px` | `32px 18px` (≤760px) / `20px 12px` (≤500px) |
| Hero content | `42px 40px 40px` | `30px 22px 26px` (≤760px) |
| Cards | `18–22px` | `18–22px` |
| Topbar | `0 22px` | `0 12px` |

### Safe Area (iOS)
- `env(safe-area-inset-bottom, 0px)` added to slide padding, bottom-nav, slide-cta-btn, main-panel
- `100vh` → `100dvh` everywhere for dynamic viewport height

### Gap / Grid Spacing
- `.stats-row`: `22px` gap → `12px` at ≤500px
- `.feature-grid`: `16px` → `10px` at ≤400px
- `.alt-card-grid`: `22px`
- `.container` (index): `56px` → `28px` at ≤980px
- Slide nav dots: `8px` gap

---

## 4. Breakpoints

### index.html
| Width | Behaviour |
|-------|-----------|
| `>980px` | Desktop: side-by-side text+media, full phone mockup, pricing table |
| `≤980px` | Tablet: column-reverse, smaller phone, full-width frames |
| `≤640px` | Phone: compact topbar, right-side arrows (no dots), hidden animations/feature-grid, left-right asymmetric padding |
| `≤400px` | Small phone: further shrunk, single-column feature grid |

### panoramica.html (theme-2.css)
| Width | Behaviour |
|-------|-----------|
| `>1380px` | Full sidebar with text labels (274px) |
| `≤1380px` | Slightly narrower sidebar (234px), smaller hero heading |
| `≤1160px` | Icon-only sidebar (58px), topbar nav hidden |
| `≤860px` | Tighter icon sidebar (48px) |
| `≤760px` | Single-column stats, smaller panel padding, hero shrinks |
| `≤500px` | Phone-optimized: very compact panels, small headings |

### Height Breakpoints
| Height | Behaviour |
|--------|-----------|
| `≤620px` | Icon-only sidebar |
| `≤520px` | Even tighter icon sidebar |

---

## 5. Component Patterns

### Buttons

**Pill CTA (index.html)**
```
height: 48px, padding: 0 24px
border-radius: 999px
background: rgba(255,255,255,.06–.08)
border: 1px solid rgba(255,255,255,.10–.15)
color: #fff, font: Inter 14px/500-600
hover: border cyan, slight lift (-1px), glow shadow
active: scale(.96), inset shadow
```

**Arrow Nav Buttons (index.html)**
```
Desktop: 44×44px, translucent white, center-bottom
Mobile:  36×36px, dark bg (rgba(0,0,0,.55)), right-edge vertical stack
SVG arrows: viewBox 0 0 24 24, paths span ~50% of canvas
```

**Primary CTA (panoramica)**
```
height: 48px, padding: 0 22px, border-radius: 14px
background: var(--black-btn) → #fff text
hover: lift -2px, darker bg
```

**Start Session Button**
```
background: linear-gradient(135deg, teal→cyan)
color: #fff, border-radius: 14px
hover: brighter gradient + stronger glow
breathe animation on idle
```

**Theme Toggle**
```
height: 38px, border-radius: 999px, border: 1px solid
shows ☀️ in light, 🌙 in dark
```

### Cards

**Metric Card (panoramica)**
```
min-height: 180px, padding: 18px
border-radius: 16px, border: 1px solid
box-shadow: soft layered shadow
hover: lift -2px, stronger shadow
has sparkline bar chart inside (40px tall)
value: 28px bold, label: 16px, badge: 11px teal pill
```

**Feature Chip (index.html)**
```
2×2 grid, max-width: 460px
padding: 30px 20px 18px, gap: 10px
macOS-style window dots (r/y/g) at top
icon: 34×34px, rounded 9px
title: Manrope 16px/600
desc: Inter 13px, 62% opacity
hover: 3D perspective tilt + cyan glow
```

**Alt Card (panoramica)**
```
min-height: 200px, padding: 22px
border-radius: 18px
title: 24px, body: 16px
grid: 2-col → 1-col at ≤760px
```

### Navigation

**Slide Controls (index.html)**
```
Desktop: fixed bottom-center — left arrow + 4 dot indicators + right arrow
Mobile:  fixed right-edge vertical stack — up arrow + down arrow (no dots)
Dots: 10×10px circles, active=cyan with pulse glow animation
```

**Sidebar Nav (panoramica)**
```
Grid-based layout: sidebar (274px) + main content (1fr)
Nav items: 15px, 10px border-radius, gap: 2px between items
Active state: purple background (#cffafe light / #142836 dark)
Icon-only mode at ≤1160px (58px sidebar)
```

### Phone Mockup (index.html, slide 2)
```
250×520px → 210×440px (≤980px) → 150×320px (≤400px)
max-width: 55vw constraint
border-radius: 24px
notch: 110×26px, black, bottom-rounded
screen: inset 8px, rounded 20px, dark translucent bg
footer: bottom bar with brand name
hidden entirely on mobile (≤640px)
```

### Subtitle Stream Frame (index.html, slide 2)
```
max-width: 480px, padding: 32px, border-radius: 18px
frosted glass (backdrop-filter: blur(16px))
accent bar: 2px wide cyan gradient on left of each line
translation lines: IT (Manrope 18px) above EN (Inter 13px)
stream indicator: 3 pulsing dots
hidden on mobile (≤640px)
```

### Hero Banner (panoramica)
```
min-height: 278px, border-radius: 22px
teal gradient background with animated floating blobs
serif heading (Cormorant Garamond 60px)
close button: top-right, 34×34px, rotates 90° on hover
collapsible (slides up + fades out)
```

### Start Session Split Panel
```
Desktop: 2-column grid, each half centered content
Left:  Caption mode (cyan-tinted bg, mic icon)
Right: Translate mode (slightly different cyan bg, language icon)
Language spinner: full-cover overlay with 2-col flag grid
Mobile (≤1024px): stacked vertically, scrollable
Mobile (≤500px): further compacted (18px headings, 12px body)
```

### Pricing (index.html, slide 4)
```
Desktop (>600px): 4-column comparison table, dark translucent bg
Mobile (≤599px): card-based toggle — tier buttons + single card with price
Fonts: Manrope for prices (clamp 42-52px), Inter for details
Active tier: cyan accent background
```

### Vocabulary Builder (panoramica)
```
Fullscreen mode: position:fixed, 100dvh, z-index: 5000
Expand/compress button stays visible as fixed top-right circle (40×40px)
Grid: auto-fill, minmax(300px,1fr) → 1fr at ≤860px
```

---

## 6. Animation & Motion

### Timing Curves
| Name | Value | Use |
|------|-------|-----|
| `--t-micro` | `180ms cubic-bezier(.2,.8,.2,1)` | Micro-interactions, color/bg changes |
| `--t-lift` | `280ms cubic-bezier(.34,1.56,.64,1)` | Lift transforms (springy overshoot) |
| `--t-surface` | `500ms cubic-bezier(.2,.8,.2,1)` | Surface/panel transitions |
| `--transition` | `260ms cubic-bezier(.2,.8,.2,1)` | Default dashboard transitions |

### Keyframe Animations
- **bgFade14s**: Crossfade between two background images (7s half-cycle)
- **phoneRise**: Phone mockup rises + fades in (1600ms)
- **dotPulse**: Active nav dot glows (2s infinite)
- **streamPulse**: 3-dot streaming indicator (1.6s, staggered)
- **colReveal**: Pricing table column fade-in (450ms)
- **floatSlow**: Hero banner blobs drift (11-14s infinite alternate)
- **paneIn/paneOut**: Tab/content panel transitions (blur + translate, 200-340ms)
- **liftIn**: Card entrance animation (500ms, staggered delays)
- **btnBreathe**: CTA button glow pulse

### Hover Patterns
- **Buttons**: lift -1px to -3px + glow shadow + slightly brighter bg
- **Cards**: lift -2px + stronger shadow + border color shift
- **Feature chips**: 3D perspective tilt (rotateX/Y) + cyan glow
- **Active press**: scale(.95-.98) + inset shadow
- **Nav items**: translateX(2px) + bg highlight

### Reduced Motion
```css
@media(prefers-reduced-motion:reduce){
  all animations → 0.01ms
  transitions → 0.01ms
  noise overlay, stream indicator, bg crossfade → hidden
  phone-base → static (no animation)
  slides → instant show/hide (no transition)
}
```

---

## 7. Decorative Layers (index.html only)

```
z-index stack (bottom → top):
  -2: bg-xf-a / bg-xf-b  (crossfading background images)
  -1: bg-overlay           (vignette gradient)
   0: content
  50: bottom-nav, slide-cta-btn
 100: controls, topbar
9000: page-border (inset frame, hidden on mobile)
9996: noise-overlay (SVG fractal noise at 2.8% opacity)
```

---

## 8. Dark/Light Mode Mechanism

- `data-theme="dark"` or `data-theme="light"` on `<html>`
- Each page defines its own `:root` and `[data-theme="..."]` CSS variable blocks
- **index.html**: dark-only (no light mode variables)
- **panoramica.html**: full light+dark via `css/theme-2.css` `:root` + `[data-theme="dark"]`
- Theme persisted in `localStorage('sottotitoli-theme')`
- Toggle button: ☀️/🌙 icon swap via `.theme-icon-sun`/`.theme-icon-moon` display

---

## 9. Page Structure — index.html

```
<html data-theme="dark">
  <body>
    .bg-xf-a / .bg-xf-b        ← crossfading background
    .bg-overlay                  ← vignette
    .page-border                 ← inset frame (desktop only)
    .noise-overlay               ← grain texture
    #authToast                   ← fixed top-center toast
    header.topbar                ← brand + login
    main.stage-root
      .stage-track
        section.slide (×4)      ← full-viewport slides
          .container
            .text-side           ← headline + body + CTA
            .media-side          ← phone mockup / feature grid / pricing
      .slide-cta-btn             ← absolute bottom CTA per slide
    nav.controls                 ← arrows + dot indicators
    footer.bottom-nav            ← copyright + links
```

---

## 10. Page Structure — panoramica.html

```
<html data-theme="light|dark">
  <body>
    .app-shell (CSS Grid)
      header.topbar              ← brand + start-session btn + tools (spans full width)
      aside.sidebar              ← icon nav + trial card + bottom links
        .brand-row
        nav.side-nav
        .trial-card
        .sidebar-bottom
      .workspace
        main.main-panel
          .start-split           ← caption/translate launch panel (toggled)
            .start-half.caption
            .start-half.translate
          .content-panel#pnl-panoramica
            section.panel-head   ← "Panoramica" h2
            article.hero-banner  ← welcome back + CTA
            section.stats-row    ← 5 metric cards
            chart cards          ← daily/practice charts
          .content-panel#pnl-profilo
          .content-panel#pnl-insights
          .content-panel#pnl-vocabulary-builder
          .content-panel#pnl-impostazioni
          ...more panels...
```

---

## 11. Key CSS File Map

| File | Scope |
|------|-------|
| `css/theme-2.css` | **Shared dashboard styles** — layout, sidebar, panels, cards, buttons, form fields, tables, dropdowns, start-split, hero-banner, breakpoints |
| `css/theme.css` | Legacy shared theme (navbar, panels, snapping) |
| `css/review.css` | Review/spaced-repetition styles |
| `css/responsive.css` | Legacy responsive breakpoints (mostly unused now) |
| `css/studio-caption.css` | Caption studio styles |
| Inline `<style>` in `index.html` | All landing page styles (self-contained) |
| Inline `<style>` in `panoramica.html` | Page-specific overrides (gradient cards, sparklines, CEFR icons, word banks, percorso, milestone timeline, transcript cards, AI voice, fullscreen, etc.) |

---

## 12. Design Tokens Quick Reference

```
Fonts:       Inter (UI), Manrope (headings), JetBrains Mono (mono), Cormorant Garamond (hero serif)
Icons:       Font Awesome 6 Free (CDN), inline SVGs
Corners:     Pills=999px, Cards=14-18px, Panels=24-34px, Buttons=10-15px
Shadows:     Layered — soft card shadow + colored glow on hover
Glass:       backdrop-filter: blur(8-16px) on frosted elements
Textures:    SVG fractal noise (2.8% opacity), crossfading bg images
Motion:      Springy overshoot on lifts, smooth bezier fades, staggered entrances
```
