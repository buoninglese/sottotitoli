# pages-directory.md — Complete Page Index & Status

> **For any AI agent needing to understand what every page does, its status, and whether it's safe to edit.**

---

## Production Pages (Live, Actively Maintained)

| File | Route | Purpose | Status | Size |
|------|-------|---------|--------|------|
| `index.html` | `/` | Landing page with parallax slider (4 slides), diagonal wipe transitions, pricing, testimonials | 🟢 Live | ~30KB |
| `panoramica.html` | `/panoramica.html` | Main dashboard/cockpit — session history, AI reports, vocabulary, metrics, settings. **The biggest page.** | 🟢 Live | 114KB+ |
| `caption-s8t.html` | `/caption-s8t.html` | Next-gen caption interface — 5 horizontal slides, live caption bar, word bank, grammar correction, DUO+ multi-speaker | 🟢 Live | ~8K lines |
| `studio.html` | `/studio.html` | Original caption workspace — workspace selector, live transcription room, vocabulary bubbles, metrics, AI reports | 🟡 Legacy | ~114KB |
| `purchase.html` | `/purchase.html` | Stripe checkout — product grid (50h pack, 90 tokens), pricing, legal info | 🟢 Live | ~20KB |
| `onboarding.html` | `/onboarding.html` | New user onboarding — language pair selection, goals, preferences | 🟢 Live | ~15KB |
| `account.html` | `/account.html` | User profile + "Il tuo viaggio" + goals/preferences | 🟡 Buggy | ~30KB |
| `termini.html` | `/termini.html` | Terms of Service (Italian law, Bari jurisdiction) | 🟢 Live | ~5KB |
| `privacy.html` | `/privacy.html` | Privacy Policy | 🟢 Live | ~5KB |

## Special-Purpose Pages

| File | Purpose | Status |
|------|---------|--------|
| `gara.html` | Multiplayer language game (Supabase Realtime) | 🔴 Buggy — mic stops after 2 sentences, connection/sync bugs |
| `overlay.html` | Caption display overlay (pop-out window) | 🟢 Live |
| `overlay-roll.html` | Rolling caption overlay variant | 🟢 Live |
| `overlay-cinema.html` | Cinema-style caption overlay variant | 🟢 Live |
| `duo-s8t.html` | DUO+ multi-speaker collaborative mode | 🟡 In development |
| `ai-s8t.html` | AI-powered caption variant | 🟡 In development |
| `traduzione-s8t.html` | Translation-focused caption variant | 🟡 In development |
| `capture-pro.html` | Enhanced audio capture mode | 🟡 In development |
| `tools.html` | Utilities and tools hub | 🟡 In development |
| `manual.html` | Manual text entry for captioning | 🟢 Live |
| `report-ai.html` | AI report viewer | 🟡 In development |
| `dashboard-messages.html` | Dashboard notification/message center | 🟡 In development |
| `self-plan.html` | Self-study planning tool | 🟡 In development |
| `prompts.html` | AI prompt management | 🟡 In development |
| `api-dashboard.html` | API usage dashboard | 🟡 In development |
| `seb-va.html` | Voice assistant page (Seb VA) | 🟡 Experimental |
| `dev.html` | Developer tools/testing page | 🔵 Dev only |

## Mockup Files (Reference Only — DO NOT EDIT)

These are design exploration files in root and `mockups/`, `mockup-relics/`, `Reference-mockups/`:
`*-mockups.html`, `analisi-mockups.html`, `analysis-account-mockups.html`, `bg-shapes-mockups.html`, `blob-hover-mockups.html`, `font-mockups.html`, `gauge-mockup.html`, `gradient-mockups.html`, `hero-bg-mockups.html`, `index-mockup.html`, `index-parallax-mockup.html`, `prezzi-*-mockups.html`, `scheme-mockups.html`, `site-gradients-mockups.html`, `slider-*-mockups.html`, `steps-mockups.html`, `style-mockups.html`, `translate-pipeline-mockup.html`, `viaggio-mockup.html`

## JavaScript Files

| File | Role | Depends On |
|------|------|-----------|
| `config.js` | All configuration (gitignored!) | Nothing |
| `config.example.js` | Config template | Nothing |
| `js/auth.js` | Supabase Google OAuth | `config.js` |
| `js/theme.js` | Navbar, hamburger, theme toggle | Nothing |
| `app.js` | Main application logic (huge) | Multiple |
| `audio-recorder.js` | Audio capture module | `config.js` |
| `translation-providers.js` | MyMemory + Google Translate | `config.js` |
| `session-utils.js` | Session management | Supabase |
| `speaker-analytics.js` | Speaker diarization | `app.js` |
| `text-rules.js` | Text processing rules | Nothing |
| `ws-publisher.js` | WebSocket publishing | `config.js` |
| `lesson-report.js` | Lesson report generation | Supabase |
| `security-utils.js` | Security utilities (FRAGILE) | Nothing |
| `js/cefr-levels.js` | CEFR word-level mappings | Nothing |
| `js/lemma-pos-map.js` | Lemma→POS mappings | Nothing |
| `js/account.js` | Account page logic | Supabase |
| `js/preferences.js` | User preferences | Supabase |
| `js/pos-coloring.js` | POS coloring for overlay | Nothing |
| `js/i18n.js` | Language toggle system | Nothing |
| `js/notifications.js` | Supabase realtime notifications | Supabase |

## CSS Files

| File | Role |
|------|------|
| `css/theme.css` | Legacy shared theme (older pages) |
| `css/theme-2.css` | Newer shared theme (navbar, panels, snapping) |
| `css/panoramica.css` | Panoramica-specific styles |
| `css/studio-caption.css` | Studio/caption styles |
| `css/traduzione.css` | Translation page styles |
| `css/responsive.css` | Global responsive breakpoints |
| `css/review.css` | Review/testimonial styles |
| `css/tailwind.min.css` | Tailwind utilities (sparingly) |
| `css/tw-input.css` | Tailwind input styles |
| `css/bootstrap.min.css` | Bootstrap 4 (legacy pages) |
| `css/animate.min.css` | Animation library |
| `css/animate-text.css` | Text animation library |
| `css/magnific-popup.css` | Lightbox |
| `css/owl.carousel.min.css` | Carousel (mockup pages) |

## Legacy / Backup Files

| File | Note |
|------|------|
| `studio-caption.BACKUP.html` | Backup of studio.html |
| `panoramica.html.backup-*` | Timestamped backups of panoramica |
| `backups/` | Directory with timestamped backups |

---

*Last updated: 2026-08-05*
