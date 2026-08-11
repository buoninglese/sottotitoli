# pages-directory.md — Complete Page Index & Status

> **For any AI agent needing to understand what every page does, its status, and whether it's safe to edit.**
> Last verified: 2026-08-06

---

## Production Pages (Live, Actively Maintained)

| File | Route | Purpose | Status | Size |
|------|-------|---------|--------|------|
| `index.html` | `/` | Landing page with parallax slider, diagonal wipes, pricing, testimonials | 🟢 Live | ~30KB |
| `panoramica.html` | `/panoramica.html` | Dashboard shell (~2,000 lines) — 10 panels as ES modules in `js/panoramica/panels/` + 6 shared utilities. Architecture restructured 2026-08-11. | 🟢 Live | 118KB shell + ~2,700 lines JS |
| `caption-s8t.html` | `/caption-s8t.html` | Real-time captioning — 5 slides, live caption bar, word bank, grammar, DUO+ | 🟢 Live | ~8.9K lines |
| `traduzione-s8t.html` | `/traduzione-s8t.html` | Translation-focused caption variant | 🟡 In dev | — |
| `duo-s8t.html` | `/duo-s8t.html` | DUO+ multi-speaker collaborative mode | 🟡 In dev | — |
| `ai-s8t.html` | `/ai-s8t.html` | AI-powered voice iframe shell | 🟡 In dev | — |
| `grammarhub.html` | `/grammarhub.html` | Grammar practice hub | 🟡 In dev | — |
| `onboarding.html` | `/onboarding.html` | New user onboarding wizard | 🟢 Live | ~15KB |
| `purchase.html` | `/purchase.html` | Stripe checkout — product grid, pricing | 🟢 Live | ~20KB |
| `privacy.html` | `/privacy.html` | Privacy Policy (Italian) | 🟢 Live | ~2KB |
| `termini.html` | `/termini.html` | Terms of Service (Italian) | 🟢 Live | ~2KB |
| `404.html` | `/404.html` | Custom 404 page | 🟢 Live | — |

## Dev Tools (in `dev/`)

| File | Purpose |
|------|---------|
| `dev/dev.html` | Developer tools/testing page |
| `dev/prompts.html` | AI prompt management |
| `dev/api-dashboard.html` | API usage dashboard |
| `dev/dashboard-messages.html` | Notification center |
| `dev/dashboards.html` | Dashboard aggregator |
| `dev/grammar-check.html` | Grammar check tester |
| `dev/prompt-workspace.html` | Prompt workspace |
| `dev/WORKFLOW.md` | AI report prompt workflow |

## Archived Pages (moved to Desktop or mockup-relics/)

| File | Note |
|------|------|
| `mockup-relics/traduzione-s8t.html` | Old version, kept for reference |
| `~/Desktop/sottotitoli-archived/` | seb-va.html, self-plan.html, and other archived files |

---

## JavaScript Files

### Root JS
| File | Role | Status |
|------|------|--------|
| `config.js` | All configuration (**GITIGNORED**) | 🔒 Active |
| `config.example.js` | Config template for new setups | ✅ Active |
| `config.secrets.js` | Production secrets (**GITIGNORED**) | 🔒 Active |
| `tailwind.config.js` | Tailwind CSS build config | 🛠️ Dev tool |
| `translation-providers.js` | MyMemory + Google Translate | ✅ Active |
| `ws-publisher.js` | WebSocket publishing | ✅ Active |

### `js/` Folder
| File | Role | Page(s) |
|------|------|---------|
| `auth.js` | Supabase Google OAuth | 7 pages |
| `theme-2.js` | Current theme — navbar, toggle, dropdowns | 5 pages |
| `theme.js` | Legacy theme | privacy, termini only |
| `i18n.js` | Language toggle (IT↔EN) | 4 pages |
| `notifications.js` | Supabase realtime notifications | 3 pages |
| `cefr-levels.js` | CEFR word-level mappings | 3 pages |
| `cefr-gse.js` | GSE scoring integration | 3 pages |
| `smart-suggestions.js` | Smart suggestion engine | 2 pages |
| `lemma-pos-map.js` | Lemma→POS mappings | 2 pages |
| `ai-voice.js` | AI voice interface | 2 pages |
| `language-resolver.js` | Language detection | 2 pages |
| `data-service.js` | Data service layer | 2 pages |
| `speech-icons.js` | TTS speaker buttons | 1 page |
| `real-mic.js` | Mic + speech recognition | 1 page |
| `grammar-viz.js` | Grammar visualization | 1 page |
| `cefr-info.js` | CEFR tooltips | 1 page |
| `traduzione/*.js` | Translation module (6 files) | 1 page |

---

## CSS Files

| File | Role | Page(s) |
|------|------|---------|
| `css/theme-2.css` | Current shared theme | 6 pages |
| `css/panoramica.css` | Dashboard-specific styles | 2 pages |
| `css/review.css` | AI review display | 2 pages |
| `css/tailwind.min.css` | Compiled Tailwind utilities | 2 pages |
| `css/traduzione.css` | Translation page styles | (archived page) |
| `style.css` | Original Appland template (legacy) | 5 pages |

---

*Last updated: 2026-08-06 · Verified against actual repo state*
