# architecture.md — System Architecture

> **Cross-refs:** `AGENTS.md` · `pages-directory.md` · `deploy-runbook.md` · `glossary.md`

---

## 1. System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ index    │  │panoramica│  │caption-  │  │duo-s8t     │ │
│  │ (landing)│  │(dashboard│  │s8t       │  │(multi-spkr)│ │
│  │          │  │)         │  │(capture) │  │            │ │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────┬─────┘ │
│                                    │Mic              │       │
│                                    ↓                ↓       │
│                          ┌──────────────┐                  │
│                          │ WebSocket    │←── room ID       │
│                          │ Client       │                  │
│                          └──────┬───────┘                  │
│                    Google OAuth │                          │
│                    ┌────────────┴──────┐                   │
│                    │ window.sottotitoli│                   │
│                    │ Supabase          │                   │
│                    └────────┬──────────┘                   │
└─────────────────────────────┼──────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ↓                   ↓                   ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Supabase      │ │  Render (WS)    │ │  Render (Learn) │
│                 │ │                 │ │                 │
│ • Auth (Google) │ │ • WebSocket     │ │ • CEFR API      │
│ • PostgreSQL    │ │   relay         │ │ • word_cefr.db  │
│ • 21 Edge Funcs │ │ • OpenAI STT    │ │ • Oxford dict   │
│ • Realtime      │ │ • Translation   │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │
          ↓
┌─────────────────┐
│   Stripe        │
│ • Checkout      │
│ • Webhooks      │
└─────────────────┘
```

---

## 2. Data Flows

### Live Captioning Session
```
1. User opens caption-s8t.html (or duo-s8t.html, traduzione-s8t.html)
2. Config loaded → wsUrl from window.SOTTOTITOLI_CONFIG
3. User clicks "Avvia sessione" → toggleSession()
4. real-mic.js captures mic → sends via WebSocket to Render relay
5. Render relay → OpenAI Whisper → returns text
6. Text broadcast to all clients in room
7. Translation provider (MyMemory/Google) translates
8. Captions rendered in real-time in caption bar
9. Session saved to Supabase sessions table on stop
```

### Auth Flow
```
1. User clicks "Accedi" → signInWithGoogle() in js/auth.js
2. Google OAuth popup → redirects to AUTH_REDIRECT_URL (panoramica.html)
3. Supabase reads #access_token from URL
4. Return page restored from localStorage('sottotitoli_return_page')
```

### Payment Flow
```
1. User on purchase.html selects product
2. Frontend → Supabase Edge Function: create-checkout-session
3. Edge function → Stripe Checkout session
4. User completes payment → Stripe webhook → grant credits
5. User redirected to panoramica with updated balance
```

### AI Report Flow
```
1. User requests AI report from panoramica or caption-s8t
2. Request → ai_report_requests table (status: 'queued')
3. process-ai-reports Edge Function (scheduled)
4. Processes transcript with OpenAI GPT-4o
5. Results → session_ai_reports table
6. User notified via Supabase Realtime (notifications.js)
```

---

## 3. WebSocket Contract (DO NOT CHANGE)

```json
// Final transcript
{"msg": true, "final": "Complete text.", "id": 42, "label": "Speaker 1"}

// Interim/partial
{"msg": true, "interm": "Partial text...", "id": 42}
```

Room IDs: URL params or localStorage. No auth on WebSocket — rooms are the security boundary.

---

## 4. Multi-Repo Coordination

| Change | Repos | What to Update |
|--------|-------|---------------|
| New WebSocket feature | sottotitoli + sottotitoli-websocket | Both client and server |
| New API endpoint | sottotitoli + sottotitoli-learning | Client fetch + server route |
| New DB column | sottotitoli (migration) | Migration SQL + frontend queries |
| Stripe product | sottotitoli (edge function) + Stripe | PRICE_MAP + dashboard |

---

## 5. Known Fragile Points

| Component | Risk | Mitigation |
|-----------|------|------------|
| CSS theme variables | Each page has own palette | Copy from panoramica, test both modes |
| WebSocket format | Contract with relay | Never change message structure |
| Supabase columns | transcript vs transcript_text | Check supabase-schema.md |
| i18n leaf-span | Icons get wiped | Wrap text in span |
| Auth race condition | User null at load | Always await getSession() |
| config.js | Contains secrets | Edit config.example.js only |
| HTML div balance | Missing </div> hides panels | Count divs after edits |

---

## 6. Page Architecture

### Core Pages
| Page | Role | JS Dependencies |
|------|------|----------------|
| `index.html` | Landing, auth gate | auth.js, theme.js, i18n.js, notifications.js |
| `panoramica.html` | Dashboard shell (118KB) | auth.js, theme-2.js, i18n.js, notifications.js, cefr-*.js, ai-voice.js, data-service.js, smart-suggestions.js, lemma-pos-map.js, language-resolver.js, plus 17 ES modules in `js/panoramica/` (app.js router + 10 panel modules + 6 shared utilities) |
| `caption-s8t.html` | Live captioning | auth.js, theme-2.js, i18n.js, notifications.js, real-mic.js, grammar-viz.js, speech-icons.js, cefr-gse.js, cefr-info.js, language-resolver.js |

### Theme
- Current theme: `theme-2.css` (6 pages) + `css/` per-page styles
- Legacy: `theme.css` used only by privacy/termini (migrating to theme-2)
- Root `style.css`: Original Appland template CSS, 5 pages still load it (no conflicts)

---

*→ Next: `pages-directory.md` for file-by-file reference*
*→ Related: `deploy-runbook.md` for deployment*
