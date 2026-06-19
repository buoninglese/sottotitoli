# AGENTS.md — AI Agent Handoff File

This file gives future AI coding agents the full context needed to work on this project effectively — architecture, conventions, pitfalls, and lessons learned through trial and error.

---

## 1. Project Identity

Sottotitoli is a **real-time AI captioning + translation web app**, user-facing in **Italian**, code/comments in **English**. Freemium model with usage-based prepaid credits via Stripe.

- **Live:** `https://buoninglese.github.io/sottotitoli/`
- **Local dev:** `python3 -m http.server 8000` → `http://localhost:8000`
- **No build step.** Pure static HTML/CSS/JS. GitHub Pages hosting.

## 2. Multi-Repo Architecture

| Repo | Purpose | Stack |
|------|---------|-------|
| `sottotitoli` (this one) | Frontend — all pages, UI, client logic | Static JS/HTML/CSS |
| `sottotitoli-websocket` | WebSocket relay + Deepgram + OpenAI Whisper | Node.js (ESM), Render |
| `sottotitoli-learning` | Lesson reports + Oxford dictionary | Node.js (CJS), Render |

**Communication flow:** Browser mic → WebSocket relay → back to all clients in room. Room IDs stored in `localStorage`, passed via URL params.

**Message format (WebSocket):**
- Final: `{"msg": true, "final": "text", "id": counter, "label": label}`
- Interim: `{"msg": true, "interm": "partial", "id": counter}`

## 3. File Map — What Everything Does

### Core Pages (the ones that matter)

| File | Purpose | Key Notes |
|------|---------|-----------|
| `index.html` | Landing page | Parallax slider (4 slides), diagonal wipe transitions, pricing, testimonials. The slider is custom JS/CSS — fragile, don't rewrite it. |
| `studio.html` | Workspace selector | Horizontal scroll panels for caption/translate modes. Login redirect target. |
| `app.html` | Main cockpit/dashboard | **The biggest page (114KB).** Live transcription room, vocabulary bubbles, metrics, AI reports. The "control room." |
| `account.html` | User profile + "Il tuo viaggio" + goals/preferences | Settings persistence issues (see Known Issues). |
| `analysis.html` | Session analysis | Session history cards, AI reports, expandable cards, performance dashboard, NGSL mastery, favorite sessions, viaggio. |
| `wallet.html` | Credits & transactions | Voice Credits (VC) balance, token ledger, vouchers. |
| `gara.html` | Multiplayer language game | Supabase Realtime. Connection/sync bugs (see Known Issues). |
| `overlay.html` / `overlay-roll.html` / `overlay-cinema.html` | Caption display overlays | Different visual styles for captions. Used as pop-out windows. |

### JavaScript Files

| File | Role | Dependencies |
|------|------|-------------|
| `config.js` | **All configuration.** WebSocket URL, translation provider, modes, Deepgram settings. | Gitignored! Use `config.example.js` as template. |
| `js/auth.js` | Supabase auth (Google OAuth). Defines `window.sottotitoliSupabase`. | Must load before any Supabase-using code. |
| `js/theme.js` | Shared navbar, hamburger menu, theme toggle (day/night), iOS flexbox gap polyfill. | Load on every page. |
| `app.js` | Main application logic — huge file, core of the cockpit. | |
| `audio-recorder.js` | Audio capture module. | |
| `translation-providers.js` | MyMemory + Google Translate backends. | |
| `session-utils.js` | Session management utilities. | |
| `speaker-analytics.js` | Speaker diarization analysis. | |
| `text-rules.js` | Text processing rules. | |
| `ws-publisher.js` | WebSocket publishing client. | |
| `lesson-report.js` | Lesson report generation. | |
| `security-utils.js` | Security utilities. **Fragile — don't modify lightly.** | |
| `js/cefr-levels.js` | CEFR word-level mappings (A1-C2). Used for vocabulary coloring. | |
| `js/lemma-pos-map.js` | Lemma → Part-of-Speech mappings. | |
| `js/account.js` | Account page logic. Theme/settings persistence. | |
| `js/preferences.js` | User preferences management. | |
| `js/pos-coloring.js` | Part-of-speech coloring for overlay. | |

### CSS Files

| File | Role |
|------|------|
| `css/theme.css` | **Shared theme.** Navbar, panels, CSS variables, snapping. Imported by most pages. |
| `style.css` | Legacy global styles — mostly superseded by per-page `<style>` blocks. |
| `css/responsive.css` | Responsive breakpoints. |
| `css/bootstrap.min.css` / `css/bootstrap-theme.min.css` | Bootstrap 4 — used sparingly, mainly for grid utilities on older pages. |
| `css/animate.min.css` / `css/animate-text.css` | Animation libraries. |
| `css/magnific-popup.css` | Lightbox. |
| `css/owl.carousel.min.css` / `css/owl.theme.default.min.css` | Carousel (used on some mockup pages). |

### Supabase

| Path | Purpose |
|------|---------|
| `supabase/functions/create-checkout-session/` | Stripe checkout edge function |
| `supabase/functions/stripe-webhook/` | Stripe webhook handler |
| `supabase/functions/process-ai-reports/` | AI report generation |
| `supabase/migrations/` | Database migrations |
| `supabase_setup.sql` | Schema reference |
| `ai_report_modules.sql` | AI report module definitions |

## 4. CSS/Theming System — CRITICAL

### How Day/Night Mode Works

Every page uses `data-theme` attribute on `<html>`:
```html
<html lang="it" data-theme="dark">
```

Theme is toggled via `js/theme.js` which:
1. Reads `localStorage.getItem('sottotitoli-theme')`
2. Sets `document.documentElement.setAttribute('data-theme', t)`
3. Updates the toggle button icon (☀️/🌙)

### CSS Variable Pattern (per-page)

**Each page defines its OWN `:root` and `[data-theme="dark"]` variables in a `<style>` block.** Variables are NOT globally consistent across pages — each page has its own palette. Common variable names:

```css
:root {
  --bg: #f0f2f5;          /* page background */
  --card: #fff;            /* card/surface background */
  --line: #e2e5ea;         /* borders/dividers */
  --text: #111827;         /* primary text */
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --accent-purple: #7c3aed;
  --accent-green: #059669;
  --accent-blue: #2563eb;
  --accent-amber: #d97706;
}
[data-theme="dark"] {
  --bg: #0f1117;
  --card: #1a1d26;
  /* ... darker equivalents ... */
}
```

**If you add a new page, follow this pattern.** Copy the `:root`/`[data-theme="dark"]` block from `studio.html` or `app.html` as a starting point.

### Font

All pages use **Inter** from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800;14..32,900&display=swap" rel="stylesheet">
```

### Icons

Font Awesome 6 (Free) via CDN:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

## 5. JavaScript Conventions

### Script Loading Order (critical for pages with auth)

```html
<!-- 1. Dependencies -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- 2. Config (must come before auth) -->
<script src="config.js"></script>
<!-- 3. Auth (creates window.sottotitoliSupabase) -->
<script src="js/auth.js"></script>
<!-- 4. Theme (navbar, hamburger, theme toggle) -->
<script src="js/theme.js"></script>
<!-- 5. Page-specific logic -->
```

**Never load `auth.js` before `config.js`** — it needs `window.SOTTOTITOLI_CONFIG`.

### Config Pattern

`config.js` is **gitignored**. `config.example.js` is the template. All config lives on `window.SOTTOTITOLI_CONFIG`:
```js
window.SOTTOTITOLI_CONFIG = {
  websocketUrl: "wss://...",
  AUTH_REDIRECT_URL: "https://...",
  translation: { provider: "auto", ... },
  deepgram: { enabled: false },
  modes: { ... }
};
```

### Auth Flow

1. User clicks "Accedi" → `signInWithGoogle()` in `js/auth.js`
2. Google OAuth popup → redirects to `AUTH_REDIRECT_URL` (studio.html)
3. Supabase reads `#access_token` from URL via `detectSessionInUrl: true`
4. Return page stored in `localStorage.setItem('sottotitoli_return_page', ...)`
5. Referral codes preserved through OAuth via `localStorage.setItem('sottotitoli_referrer', ...)`

## 6. Supabase Integration

- **Project:** `qzqmuegbpmvqrjrlfbgk`
- **URL:** `https://qzqmuegbpmvqrjrlfbgk.supabase.co`
- **Anon Key:** `sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7` (publishable-safe, in `js/auth.js`)
- **Auth:** Google OAuth only
- **Edge Functions:** `create-checkout-session`, `stripe-webhook`, `process-ai-reports`

### Key Tables

`profiles`, `ai_report_requests`, `user_ai_entitlements`, `user_token_ledger`, `ai_configs`, `ai_report_modules`, `session_ai_reports`, `newsletter_subscribers`, `token_transactions`, `referrals`, `user_credits`

### Stripe Products

- 50h (3000 min): `prod_UcOPJ8zxdBTvxy`
- 90 tokens: `prod_UcORHDDoSul6TS`

## 7. Common Pitfalls & Lessons Learned

### DO NOT

1. **Never commit `config.js`** — it contains production URLs and is gitignored.
2. **Never hardcode URLs** — always use `window.SOTTOTITOLI_CONFIG` or relative paths.
3. **Never remove the `data-theme` attribute pattern** — every page depends on it for day/night mode.
4. **Never change the WebSocket message format** — the relay server and all clients depend on `{"msg":true, "final":"...", "id":..., "label":"..."}`.
5. **Never modify `js/auth.js` auth redirect logic** without understanding the full OAuth flow.
6. **Never edit files in the `Users/` directory** — it's a stale copy inside the workspace.
7. **Never write to `~/Desktop/...` from workspace** — paths don't resolve to the real Desktop.
8. **Don't copy Caption.Ninja branding** — already replaced with Sottotitoli.
9. **Don't add build steps** — this is a static site served by GitHub Pages.
10. **Don't use `status` as a variable name in zsh** — it's read-only.

### CSS/UI Pitfalls

1. **Each page has its own CSS variables.** If something looks wrong on one page but not another, check the `:root`/`[data-theme="dark"]` block on that specific page.
2. **`body` has `overflow:hidden` on many pages** (e.g., index, app). If you need scrolling, override with `overflow-y:auto` or `body.snap-body` class.
3. **The parallax slider on `index.html` is delicate.** Diagonal wipe transitions were perfected after many iterations. Don't rewrite the slider — make targeted fixes.
4. **Mobile is NOT fully designed yet.** Most pages are desktop-first. Test at 375px width before claiming something works.
5. **Italian is the UI language.** All user-facing text should be in Italian. Code/comments in English.

### JavaScript Pitfalls

1. **Auth race condition:** Code that needs the user must wait for `window.sottotitoliSupabase.auth.getSession()`. Don't assume the user is available at script load time.
2. **WebSocket rooms:** Room IDs come from URL params or localStorage. If WebSocket isn't connecting, check the room ID.
3. **Deepgram is English-only reliable.** For Italian, French, Spanish, German, Dutch, Polish, Portuguese — use browser Web Speech API (default when `deepgram.enabled: false`).
4. **Translation duplicates:** There's a known bug where translations can output duplicate/simultaneous results. The sentence concatenation issue may reappear after fixes.

### Supabase Pitfalls

1. **Policy names must be unique.** Error `42710: policy already exists` means you're trying to create a duplicate policy. Drop it first.
2. **Edge function secrets** are set in Supabase dashboard, NOT in code. `STRIPE_SECRET_KEY` for create-checkout-session.
3. **CORS:** Edge functions need explicit CORS headers. The template in `create-checkout-session/index.ts` handles this.
4. **Stripe product IDs must match** between `config.js`, the edge function's `PRICE_MAP`, and the Stripe dashboard.

## 8. Known Issues (as of Jun 18, 2026)

| Issue | Location | Status |
|-------|----------|--------|
| Session duration shows 0s after recording | `app.html` | Unresolved |
| Account settings not persisting | `account.html` | Unresolved |
| Hamburger menu links broken (Wallet, Impostazioni, Esci) | Some pages | Unresolved |
| "Pronto a cominciare" box has closeable X that shouldn't be there | `studio.html` | Unresolved |
| Gara multiplayer: mic stops after 2 sentences, connection/sync bugs | `gara.html` | Unresolved |
| AI report generation: constraint violations in `ai_report_requests` | Supabase | Unresolved |
| Translation duplicate outputs bug | `translation-providers.js` | Intermittent |
| NGSL coverage metric calculation questionable | `app.html` | Needs verification |
| Day/night mode doesn't work on `app.html` | `app.html` | Possibly fixed, verify |
| Index slider: occasional visual glitch blocks on backgrounds | `index.html` | Mostly fixed |

## 9. User Design Preferences

- **Aesthetic:** Cinema-inspired (Wes Anderson, Tarantino palettes). Clean, bold, dramatic.
- **Day mode:** Off-white/light gradients. Warm purples.
- **Night mode:** Dark blue→blackish gradients (not pure black). Deep space feel.
- **Font:** Inter only. No serif, no monospace (except for code/URLs).
- **Buttons:** Pill-shaped (`border-radius:100px`), purple accent for primary CTAs.
- **Cards:** Rounded corners (14-18px), subtle borders, soft shadows.
- **Language:** UI in Italian. The user is Dutch native, practicing Dutch→Italian.
- **Test account:** `studiobuoninglese@gmail.com` / `joliechanel84@gmail.com` (1000 VC)
- **Known preference:** User iterates heavily on copy/text and visual polish. Expect multiple rounds.

## 10. Workflow

### Local Development
```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8000
# Open http://localhost:8000
```

### Before Committing
1. Test the changed page at desktop AND mobile (375px)
2. Test day AND night mode
3. Check browser console for errors
4. Verify no hardcoded URLs slipped in
5. Make sure `config.js` changes aren't staged (it's gitignored)

### Deployment
- **Frontend:** Push to `main` → GitHub Pages auto-deploys
- **WebSocket relay:** Deploy on Render (separate repo)
- **Supabase functions:** `supabase functions deploy <name>`
- **Stripe:** Test mode. Products configured in Stripe dashboard.

## 11. External Services

| Service | Purpose | Config Location |
|---------|---------|----------------|
| GitHub Pages | Frontend hosting | Repo settings |
| Render | WebSocket + learning backends | Render dashboard |
| Supabase | Auth, DB, Edge Functions | `js/auth.js`, Supabase dashboard |
| Stripe | Payments (test mode) | Edge function secrets + dashboard |
| MyMemory | Free translation API | `config.js` |
| Deepgram | Speech-to-text (English) | `config.js` + WebSocket relay |
| Google Cloud STT | Browser-based speech | Web Speech API (no config) |
| OpenAI | Transcription, AI reports | WebSocket relay env vars |
| Font Awesome 6 | Icons | CDN link in `<head>` |
| Google Fonts | Inter font | CDN link in `<head>` |

## 12. Mockup Files (Reference Only)

These are design exploration files — not production pages:
`*-mockups.html`, `analisi-mockups.html`, `analysis-account-mockups.html`, `bg-shapes-mockups.html`, `blob-hover-mockups.html`, `font-mockups.html`, `gauge-mockup.html`, `gradient-mockups.html`, `hero-bg-mockups.html`, `index-mockup.html`, `index-parallax-mockup.html`, `prezzi-*-mockups.html`, `scheme-mockups.html`, `site-gradients-mockups.html`, `slider-*-mockups.html`, `steps-mockups.html`, `style-mockups.html`, `translate-pipeline-mockup.html`, `viaggio-mockup.html`

**Do not modify mockup files unless the user explicitly asks.** They serve as visual reference/snapshots.

## 13. Fragile Files — Modify With Extreme Caution

- `config.js` — Production config. Gitignored. Edit `config.example.js` instead.
- `js/auth.js` — Supabase anon key + OAuth redirect. Breaking this locks everyone out.
- `security-utils.js` — Security invariants.
- `index.html` slider code — The diagonal wipe transitions took many iterations to perfect.
- `.github/workflows/` — CI/CD pipeline definitions.
- Supabase edge functions — Deployed separately; test locally first.
- Render environment variables — Set via dashboard, not in code.


