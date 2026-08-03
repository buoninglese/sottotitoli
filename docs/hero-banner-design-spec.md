# Hero Banner — Design Architecture Spec

> Feed this to Google Stitch / v0 / any AI design tool to experiment with color palettes.

---

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  HERO BANNER (article#heroBanner)                                │
│  border-radius:56px  ·  margin-bottom:40px                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PRISM OVERLAY (::before pseudo-element)                    │  │
│  │  position:absolute  ·  inset:-50%                          │  │
│  │  conic-gradient  ·  rotate 360° over 30s (infinite)        │  │
│  │  z-index:0 (behind content)                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌────────────────────────────────┐   │
│  │  LEFT COLUMN (7fr)   │  │  RIGHT COLUMN (5fr)            │   │
│  │                      │  │                                │   │
│  │  [Suggested Pill]    │  │  ┌─ Streak Card ───────────┐   │   │
│  │                      │  │  │ 🔥  Learning Streak     │   │   │
│  │  "Bentornato, Name"  │  │  │     0 giorni           │   │   │
│  │  (52px italic light) │  │  └─────────────────────────┘   │   │
│  │                      │  │                                │   │
│  │  Hero description    │  │  CONTINUA AD APPRENDERE        │   │
│  │  (18px, 520px max)   │  │                                │   │
│  │                      │  │  ┌─ Glass Card ───────────┐   │   │
│  │  [🔍 Search input]   │  │  │ 📄  Trascrizione       │   │   │
│  │                      │  │  │     Caricamento…       │   │   │
│  │  [Chip] [Chip] [Chip]│  │  └─────────────────────────┘   │   │
│  │                      │  │                                │   │
│  │                      │  │  ┌─ Glass Card ───────────┐   │   │
│  │                      │  │  │ 📚  Banca Parole       │   │   │
│  │                      │  │  │     Caricamento…       │   │   │
│  │                      │  │  └─────────────────────────┘   │   │
│  └──────────────────────┘  └────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Color Tokens (CSS Variables)

These resolve differently per theme. Set these in your design tool as the base palette before applying overrides.

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--bg` | `#0f1117` | `#f0f2f5` | Page background |
| `--card` | `#1a1d26` | `#fff` | Card/surface background |
| `--line` | `rgba(255,255,255,.07)` | `rgba(0,0,0,.08)` | Borders & dividers |
| `--text` | `#e8eaed` | `#111827` | Primary text |
| `--text-soft` | `#9ca3af` | `#6b7280` | Secondary text |
| `--cyan` | `#06b6d4` | `#0891b2` | Accent: cyan (captions, CTAs) |
| `--teal` | `#14b8a6` | `#0d9488` | Accent: teal (word banks) |
| `--amber` | `#f59e0b` | `#d97706` | Accent: amber (warnings) |

---

## Component A: Hero Banner Shell

**Element:** `<article id="heroBanner" class="hero-banner">`

| Property | Dark Mode | Light Mode |
|----------|-----------|------------|
| `background` | `linear-gradient(135deg, var(--card) 0%, rgba(6,182,212,.08) 100%)` | `linear-gradient(135deg, #ede9fe 0%, #ddd6fe 30%, #e0e7ff 70%, #f0f4ff 100%)` |
| `border` | `1px solid rgba(255,255,255,.07)` | `1px solid rgba(139,92,246,.15)` |
| `border-radius` | `56px` | `56px` |
| `position` | `relative` | `relative` |
| `overflow` | `hidden` | `hidden` |

> **To change the banner color:** Edit the `background` gradient above. Dark mode uses `var(--card)` as base (safe to swap). Light mode uses hardcoded hex values — change the 4 color stops.

---

## Component B: Prism Overlay (Rotating Background Effect)

**Element:** `#heroBanner::before` (CSS pseudo-element)

| Property | Dark Mode | Light Mode |
|----------|-----------|------------|
| `position` | `absolute` | `absolute` |
| `inset` | `-50%` | `-50%` |
| `background` | `conic-gradient(from 180deg at 50% 50%, transparent 0%, rgba(6,182,212,.08) 10%, transparent 20%, rgba(5,150,105,.08) 40%, transparent 50%, rgba(217,119,6,.08) 70%, transparent 80%)` | `conic-gradient(from 180deg at 50% 50%, transparent 0%, rgba(99,102,241,.06) 10%, transparent 20%, rgba(5,150,105,.05) 40%, transparent 50%, rgba(217,119,6,.04) 70%, transparent 80%)` |
| `animation` | `hero-prism-rotate 30s linear infinite` | same |

The prism has 3 colored bands at 120° intervals:
1. **Cyan/Indigo band** (10% mark) — primary accent
2. **Green/Teal band** (40% mark) — secondary accent  
3. **Amber band** (70% mark) — tertiary accent

> **To change the prism:** Edit the 3 `rgba()` stops. Each controls one of the rotating colored bands. Make them subtle (opacity .04–.08) so they don't overpower the content.

---

## Component C: "Suggested for You" Pill

**Element:** Top-left pill badge

| Property | Value |
|----------|-------|
| `background` | `rgba(6,182,212,.1)` (cyan tint) |
| `border` | `1px solid rgba(6,182,212,.25)` |
| `border-radius` | `99px` (pill shape) |
| `padding` | `5px 14px` |
| **Dot** | `7px circle, var(--cyan), pulse animation 2s infinite` |
| **Text** | `10px, 900 weight, var(--cyan), uppercase, .12em letter-spacing` |

> **To change:** Swap `rgba(6,182,212,…)` to your chosen accent color. The dot and text both use `var(--cyan)`.

---

## Component D: Heading + Description

| Element | Property | Value |
|---------|----------|-------|
| **Heading (h2)** | `font-size` | `52px` |
| | `font-weight` | `300` (light) |
| | `font-style` | `italic` |
| | `color` | `var(--text)` |
| | `line-height` | `1.12` |
| | `letter-spacing` | `-.02em` |
| **Name (em)** | `font-style` | `italic` |
| | `font-weight` | `300` |
| **Description (p)** | `font-size` | `18px` |
| | `color` | `var(--text-soft)` |
| | `opacity` | `.7` (dark) / `.85` (light) |
| | `max-width` | `520px` |
| | `font-weight` | `300` |
| **Strong highlights** | `font-weight` | `500` |
| | `color` | `var(--cyan)` |

---

## Component E: Search Input

| Property | Value |
|----------|-------|
| `background` | `rgba(0,0,0,.02)` (subtle tint) |
| `border` | `1px solid var(--line)` |
| `border-radius` | `14px` |
| `padding` | `16px 16px 16px 48px` (left padding for icon) |
| `color` | `var(--text)` |
| `font-size` | `14px` |
| `max-width` | `400px` |
| **Focus** | `border-color: var(--cyan)` |

---

## Component F: Streak Card (Right Column)

| Element | Property | Value |
|---------|----------|-------|
| **Card** | `background` | `rgba(0,0,0,.02)` |
| | `border` | `1px solid var(--line)` |
| | `border-radius` | `18px` |
| | `padding` | `14px 18px` |
| **Icon box** | `width/height` | `48px` |
| | `background` | `linear-gradient(135deg, #3B82F6, #2563EB)` (blue) |
| | `border-radius` | `12px` |
| | `box-shadow` | `0 6px 16px rgba(59,130,246,.25)` |
| **Glow** | `background` | `rgba(59,130,246,.25)` |
| | `filter` | `blur(14px)` |
| **Label** | `9px, 900 weight, uppercase` | |
| | `color` | `var(--text-soft)` |
| | `opacity` | `.4` |
| **Value** | `24px, 900 weight` | |
| | `color` | `var(--text)` |

> **To change streak color:** Swap `#3B82F6` / `#2563EB` (blue gradient) to your color. Change the glow and shadow rgba values to match.

---

## Component G: Glass Cards (Continue Learning)

| Property | Dark Mode | Light Mode |
|----------|-----------|------------|
| `background` | `rgba(0,0,0,.02)` | `rgba(99,102,241,.04)` |
| `border` | `1px solid var(--line)` | `1px solid rgba(99,102,241,.1)` |
| `border-radius` | `24px` | `24px` |
| `padding` | `18px` | `18px` |
| **Hover** | `rgba(0,0,0,.04)` | `rgba(99,102,241,.08)` |
| **Hover border** | `rgba(6,182,212,.2)` | `rgba(99,102,241,.2)` |
| **Opacity** | `.5` | `.5` |
| **Icon box** | `56px, border-radius:12px, linear-gradient with accent` | same |
| **Icon color** | `var(--cyan)` or `var(--teal)` | same |

---

## Component H: Hero Chips

**Element:** `#heroChips` (dynamically populated by JS)

| Property | Value |
|----------|-------|
| (Individual chip) | `padding: 8px 16px` |
| | `border-radius: 99px` |
| | `font-size: 13px` |
| | `font-weight: 600` |
| **Light mode override** | `background: rgba(99,102,241,.06)` |
| | `border-color: rgba(99,102,241,.12)` |

---

## Quick Color Swaps (for Google Stitch)

To change the **ENTIRE** banner's accent color, replace these values together:

| Accent | Cyan (current dark) | Indigo (current light) | Your Color |
|--------|---------------------|------------------------|------------|
| Banner bg | `rgba(6,182,212,.08)` | `#ede9fe→#ddd6fe→#e0e7ff→#f0f4ff` | ??? |
| Prism band 1 | `rgba(6,182,212,.08)` | `rgba(99,102,241,.06)` | ??? |
| Prism band 2 | `rgba(5,150,105,.08)` | `rgba(5,150,105,.05)` | ??? |
| Prism band 3 | `rgba(217,119,6,.08)` | `rgba(217,119,6,.04)` | ??? |
| Pill bg | `rgba(6,182,212,.1)` | ← same cyan | ??? |
| Glass card bg | `rgba(0,0,0,.02)` | `rgba(99,102,241,.04)` | ??? |
| Glass hover | `rgba(6,182,212,.2)` | `rgba(99,102,241,.2)` | ??? |
| Streak gradient | `#3B82F6→#2563EB` | same blue | ??? |
| Text highlights | `var(--cyan)` | `var(--cyan)` | ??? |

---

## Typography

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Heading | Inter | 300 italic | 52px |
| Description | Inter | 300 | 18px |
| Pill label | Inter | 900 | 10px |
| Card label | Inter | 900 | 9px |
| Card value | Inter | 900 | 24px |
| Section label | Inter | 900 | 10px |
| Chips | Inter | 600 | 13px |
| Search input | Inter | 400 | 14px |
