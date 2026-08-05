# pages-directory.md — Complete Page Index

> **Cross-refs:** `architecture.md` · `coding-procedures.md` · `css-theme-guide.md` · `AGENTS.md`

---

## Production Pages

| File | Route | Purpose | Status | Size |
|------|-------|---------|--------|------|
| `index.html` | `/` | Landing page — parallax slider, diagonal wipes | 🟢 Live | ~30KB |
| `panoramica.html` | `/panoramica.html` | Main dashboard — sessions, reports, vocab, settings | 🟢 Live | 114KB+ |
| `caption-s8t.html` | `/caption-s8t.html` | Next-gen caption — 5 slides, word bank, grammar | 🟢 Live | ~8K lines |
| `studio.html` | `/studio.html` | Original caption workspace | 🟡 Legacy | ~114KB |
| `purchase.html` | `/purchase.html` | Stripe checkout / pricing | 🟢 Live | ~20KB |
| `onboarding.html` | `/onboarding.html` | New user onboarding flow | 🟢 Live | ~15KB |
| `account.html` | `/account.html` | User profile + "Il tuo viaggio" | 🟡 Buggy | ~30KB |
| `analysis.html` | `/analysis.html` | Session analysis + AI reports | 🟢 Live | ~50KB |
| `gara.html` | `/gara.html` | Multiplayer language game | 🔴 Buggy | ~40KB |
| `termini.html` | `/termini.html` | Terms of Service | 🟢 Live | ~5KB |
| `privacy.html` | `/privacy.html` | Privacy Policy | 🟢 Live | ~5KB |
| `overlay.html` | `/overlay.html` | Caption display overlay | 🟢 Live | ~10KB |
| `overlay-roll.html` | `/overlay-roll.html` | Rolling overlay variant | 🟢 Live | ~10KB |
| `overlay-cinema.html` | `/overlay-cinema.html` | Cinema overlay variant | 🟢 Live | ~10KB |

## In Development

| File | Purpose | Status |
|------|---------|--------|
| `duo-s8t.html` | DUO+ multi-speaker | 🟡 In dev |
| `ai-s8t.html` | AI-powered caption | 🟡 In dev |
| `traduzione-s8t.html` | Translation-focused | 🟡 In dev |
| `capture-pro.html` | Enhanced audio capture | 🟡 In dev |
| `tools.html` | Utilities hub | 🟡 In dev |
| `manual.html` | Manual text entry | 🟢 Live |
| `report-ai.html` | AI report viewer | 🟡 In dev |
| `self-plan.html` | Self-study planner | 🟡 In dev |
| `seb-va.html` | Voice assistant (experimental) | 🔵 Experimental |

## JavaScript Files

| File | Role | Dependencies |
|------|------|-------------|
| `config.js` | All configuration (GITIGNORED) | Nothing |
| `config.example.js` | Config template | Nothing |
| `js/auth.js` | Google OAuth → `window.sottotitoliSupabase` | config.js |
| `js/theme.js` | Navbar, hamburger, theme toggle | Nothing |
| `js/i18n.js` | Language toggle (IT↔EN) | Nothing |
| `app.js` | Main application logic | Multiple |
| `audio-recorder.js` | Audio capture | config.js |
| `translation-providers.js` | MyMemory + Google Translate | config.js |
| `session-utils.js` | Session management | Supabase |
| `speaker-analytics.js` | Speaker diarization | app.js |
| `text-rules.js` | Text processing | Nothing |
| `ws-publisher.js` | WebSocket publishing | config.js |
| `lesson-report.js` | Lesson report generation | Supabase |
| `security-utils.js` | Security utilities (FRAGILE) | Nothing |
| `js/notifications.js` | Supabase Realtime notifications | Supabase |

## CSS Files

| File | Role |
|------|------|
| `css/theme-2.css` | Newer shared theme (navbar, panels) |
| `css/theme.css` | Legacy shared theme |
| `css/panoramica.css` | Panoramica-specific |
| `css/studio-caption.css` | Studio/caption styles |
| `css/responsive.css` | Global responsive breakpoints |
| `css/tailwind.min.css` | Tailwind utilities |
| `css/bootstrap.min.css` | Bootstrap 4 (legacy) |

## Mockups (Reference Only — DO NOT EDIT)
`mockups/`, `mockup-relics/`, `Reference-mockups/`

---

*→ Next: `coding-procedures.md` for how to safely edit these files*
*→ Related: `css-theme-guide.md` for which CSS file belongs where*
