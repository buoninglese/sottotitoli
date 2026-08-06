# dependency-map.md — JavaScript Dependency Graph

> **Load order, global dependencies, and which file expects what from whom.**
> If you change the load order, you WILL break things.
>
> **Cross-refs:** `architecture.md` · `state-management.md` · `pages-directory.md` · `AGENTS.md`

---

## Load Order (All Authenticated Pages)

```
                    ┌─────────────────────┐
                    │ 1. config.js         │ ← Sets window.SOTTOTITOLI_CONFIG
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │ 2. js/auth.js        │ ← Sets window.sottotitoliSupabase
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌──────▼──────────┐
    │ 3. language-   │ │ 4. cefr-    │ │ 5. lemma-pos-   │
    │    resolver.js │ │    levels.js│ │    map.js        │
    └────────┬───────┘ └──────┬──────┘ └──────┬──────────┘
             │                │               │
             └────────────────┼───────────────┘
                              │
                    ┌─────────▼───────────┐
                    │ 6. js/theme-2.js     │ ← Theme, sidebar nav, sub-tabs
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌──────▼──────────┐
    │ 7. ai-voice.js │ │ 8. data-    │ │ 9. smart-       │
    │                │ │    service  │ │    suggestions  │
    └────────────────┘ └──────┬──────┘ └────────────────┘
                              │
                    ┌─────────▼───────────┐
                    │ 10. js/i18n.js       │ ← Sets window.I18n
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │ 11. notifications   │ ← Supabase Realtime
                    └─────────────────────┘
```

---

## Global Dependency Matrix

| File | Creates | Requires |
|------|---------|----------|
| `config.js` | `window.SOTTOTITOLI_CONFIG` | — (none) |
| `js/auth.js` | `window.sottotitoliSupabase` | `window.SOTTOTITOLI_CONFIG` |
| `js/language-resolver.js` | — (utility) | — |
| `js/cefr-levels.js` | CEFR level mappings | — |
| `js/cefr-gse.js` | GSE score mappings | — |
| `js/lemma-pos-map.js` | Lemma→POS lookups | — |
| `js/theme-2.js` | Theme toggle, sidebar nav, sub-tabs, language switch, `startSplit` | `window.SOTTOTITOLI_CONFIG` (optional) |
| `js/ai-voice.js` | Voice orb UI logic | `window.sottotitoliSupabase` |
| `js/data-service.js` | `window.SottotitoliData` | `window.sottotitoliSupabase` |
| `js/smart-suggestions.js` | `window.SMART_SUGGESTIONS` | `window.SottotitoliData` |
| `js/i18n.js` | `window.I18n` | — |
| `js/notifications.js` | Notification badge + dropdown | `window.sottotitoliSupabase` |

---

## Page-Specific Scripts

### panoramica.html
Loads all 11 shared scripts + large inline `<script>` block (lines 4166–12254) containing:
- `SottotitoliData.loadSettings()`, `saveSettings()`, `getWordbanks()`, etc.
- `renderSessions()`, `renderWordbanks()`, `renderAIReports()`, `renderProfile()`
- `renderCEFRQuad()`, `renderExpandSuggestions()`, `renderReviewDue()`
- `toggleStartSession()`, `openSSSpinner()`, `closeSSSpinner()`

### caption-s8t.html
Loads shared scripts + `real-mic.js` + `translation-providers.js` + inline script.

### grammarhub.html
Loads shared scripts (no page-specific inline JS — static content only).

### Index + landing pages
Load `js/theme.js` (older theme), `js/i18n.js`. No Supabase dependency.

---

## CDN Dependencies

| CDN | File | Required By |
|-----|------|------------|
| `unpkg.com` | compromise@14.14.2 | panoramica (NLP), caption-s8t |
| `cdnjs.cloudflare.com` | pdf.js 3.11.174 | panoramica (Import feature) |
| `cdnjs.cloudflare.com` | mammoth 1.6.0 | panoramica (DOCX import) |
| `cdn.jsdelivr.net` | @supabase/supabase-js@2 | All authenticated pages |
| `cdnjs.cloudflare.com` | font-awesome 6.5.0 | All pages |
| `fonts.googleapis.com` | Inter, Manrope, JetBrains Mono, Material Symbols | All pages |

---

## What Happens If...

| You Do This | Result |
|-------------|--------|
| Load `theme-2.js` before `config.js` | `window.SOTTOTITOLI_CONFIG` is undefined → sidebar nav works (config is optional) but some features break |
| Load `data-service.js` before `auth.js` | `window.sottotitoliSupabase` is undefined → data service silently fails |
| Load `i18n.js` before `theme-2.js` | Fine — they're independent |
| Remove `cefr-levels.js` | Vocabulary panels show "Caricamento…" indefinitely |
| Remove `lemma-pos-map.js` | Word lookups return without POS tags |

---

## Adding a New JS File

1. Determine its dependencies (check the matrix above)
2. Insert it AFTER all dependencies in the load order
3. Add the `<script>` tag to every page that needs it
4. Update this file's dependency matrix
5. Run `node --check newfile.js`
6. Test on 3 pages minimum

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
