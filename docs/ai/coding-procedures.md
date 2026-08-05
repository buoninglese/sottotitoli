# coding-procedures.md — Sottotitoli Coding Procedures

> **For any AI agent writing or editing code in the Sottotitoli repos.**
> These are the mandatory procedures. Follow them or you WILL break things.

---

## 1. Before You Write Any Code

### 1.1 Read the Context Files
| Order | File | Why |
|-------|------|-----|
| 1 | `AGENTS.md` | Architecture, conventions, pitfalls, known issues |
| 2 | `docs/ai/glossary.md` | Understand the vocabulary |
| 3 | `/memories/repo/supabase-schema.md` | Correct column names |
| 4 | `/memories/repo/i18n-rules.md` | i18n leaf-span rules |

### 1.2 Understand the Repo Structure
- **Frontend:** `/Users/sebastiankrauwel/sottotitoli` — static HTML/CSS/JS
- **WebSocket relay:** Separate repo `sottotitoli-websocket` (Node.js ESM, Render)
- **Learning backend:** Separate repo `sottotitoli-learning` (Node.js CJS, Render)
- **No build step.** No webpack, no vite, no npm build. Pure static files served by GitHub Pages.

### 1.3 Know Which File You're Editing
- Check if the file is a **production page** or a **mockup** (mockups in `mockups/`, `mockup-relics/`, `Reference-mockups/` — never edit these unless asked)
- Check if the file is **synced from another source** (e.g., `hugging-voice/` files synced from `voice-core/` by `sync_voice.py`)
- Check if the file is **gitignored** (`config.js` — edit `config.example.js` instead)

---

## 2. Editing HTML Files

### 2.1 CSS Variable Pattern
Every page has its OWN `:root` and `[data-theme="dark"]` CSS variables in a `<style>` block. Copy from `panoramica.html` or `caption-s8t.html` as a starting point.

```css
:root {
  --bg: #f0f6f8;
  --text: #0f1c24;
  /* ... */
}
[data-theme="dark"] {
  --bg: #0b151c;
  --text: #d8eaf4;
  /* ... */
}
```

### 2.2 i18n Leaf-Span Pattern (MUST FOLLOW)
```html
<!-- ❌ WRONG — wipes child elements -->
<button data-i18n="key"><i class="fa fa-check"></i> Save</button>

<!-- ✅ CORRECT — icon survives -->
<button><i class="fa fa-check"></i> <span data-i18n="key">Save</span></button>
```

### 2.3 Script Loading Order (auth pages)
```html
<!-- 1. Dependencies -->
<script src="supabase-js@2"></script>
<!-- 2. Config (before auth!) -->
<script src="config.js"></script>
<!-- 3. Auth -->
<script src="js/auth.js"></script>
<!-- 4. Theme -->
<script src="js/theme.js"></script>
<!-- 5. Page-specific -->
```

### 2.4 External Resources
- Supabase JS: `@supabase/supabase-js@2` (CDN)
- NLP: `compromise@14` (unpkg)
- Font Awesome 6: CDN link (free)
- Google Fonts: Inter, Manrope, JetBrains Mono, Cormorant Garamond
- Material Symbols Outlined: Google Fonts CDN

---

## 3. Editing JavaScript Files

### 3.1 Syntax Check (MANDATORY)
```bash
node --check /path/to/file.js
```
For HTML files with inline scripts, use the `get_errors` tool.

### 3.2 Config Access
Always use `window.SOTTOTITOLI_CONFIG` — never hardcode URLs or keys.

### 3.3 Auth Access
Always wait for `window.sottotitoliSupabase.auth.getSession()` — user is not available at script load time.

### 3.4 Supabase Column Names (VERIFIED)
| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `transcript` | `transcript_text` |
| `wpm_avg` | `wpm` |
| `cefr` (user_vocabulary) | `cefr_level` |
| `lemma` | `word` |
| `transaction_type` | `type` |
| `metadata` (token_transactions) | Doesn't exist |

### 3.5 WebSocket Message Format (DO NOT CHANGE)
```json
{"msg": true, "final": "text", "id": counter, "label": "label"}
{"msg": true, "interm": "partial", "id": counter}
```

### 3.6 localStorage Keys (standard)
- `sottotitoli-theme` — day/night
- `sottotitoli-lang` — UI language
- `sottotitoli-caption-lang` — caption language
- `sottotitoli-translate-target` — translation target
- `sottotitoli_wordbank` — saved words
- `sottotitoli-settings` — user settings JSON

---

## 4. Editing CSS Files

### 4.1 Theme File Map
| File | Scope |
|------|-------|
| `css/theme-2.css` | Current shared theme (navbar, panels, snapping) |
| `css/theme.css` | Legacy theme (privacy, termini only) |
| `css/panoramica.css` | Panoramica-specific styles |
| `css/review.css` | AI review/testimonial styles |
| `css/tailwind.min.css` | Compiled Tailwind utilities |
| `style.css` | Original Appland template (legacy, no conflicts) |
| `<style>` blocks in HTML | Page-specific overrides |

### 4.2 Never Do
- Don't add `!important` unless absolutely necessary
- Don't change CSS variable names — they're used across multiple pages
- Don't remove the `data-theme` attribute pattern

---

## 5. Testing Checklist (Before Committing)

- [ ] Syntax check passed (`node --check` for .js, `get_errors` for .html)
- [ ] Tested at **desktop** width (1200px+)
- [ ] Tested at **mobile** width (375px)
- [ ] Tested in **day mode** (`data-theme="light"`)
- [ ] Tested in **night mode** (`data-theme="dark"`)
- [ ] Browser console: **no errors**
- [ ] i18n: **no icons disappearing** after language toggle
- [ ] WebSocket: **message format unchanged**
- [ ] Auth: **login flow works**
- [ ] No hardcoded URLs
- [ ] `config.js` changes are **NOT staged** (gitignored)
- [ ] Version number bumped (if editing `panoramica.html`)

---

## 6. Git Workflow

```bash
# 1. Check what you changed
git status
git diff

# 2. Stage specific files (NOT config.js!)
git add <files>

# 3. Commit with descriptive message in English
git commit -m "fix: description of what was fixed"

# 4. ALWAYS push immediately after commit
git push origin main
```

### Commit Message Convention
- `fix: ...` — bug fixes
- `feat: ...` — new features
- `style: ...` — visual/CSS changes
- `refactor: ...` — code restructuring
- `docs: ...` — documentation

---

## 7. Deployment

- **Frontend:** Push to `main` → GitHub Pages auto-deploys
- **WebSocket relay:** Deploy on Render dashboard (separate repo)
- **Supabase functions:** `supabase functions deploy <name>`
- **Stripe:** Products configured in Stripe dashboard (test mode)

---

*Last updated: 2026-08-05*
