# architecture-overview.md — System Architecture

> **For any AI agent who needs to understand how all the pieces fit together.**
> High-level architecture with data flow diagrams.

---

## 1. System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ index.html│  │panoramica│  │caption-  │  │ overlay    │ │
│  │ (landing) │  │(dashboard│  │s8t.html  │  │ (display)  │ │
│  │           │  │ )         │  │(capture) │  │            │ │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────┬─────┘ │
│                                    │                │       │
│                           Mic input│                │       │
│                                    ↓                │       │
│                          ┌──────────────┐          │       │
│                          │ WebSocket    │──────────┘       │
│                          │ Client       │                  │
│                          └──────┬───────┘                  │
│                                 │                          │
│                    Google OAuth │                          │
│                    ┌────────────┴──────┐                   │
│                    │ js/auth.js        │                   │
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
│ • Database      │ │   relay         │ │ • word_cefr.db  │
│ • Edge Funcs    │ │ • OpenAI STT    │ │ • Oxford dict   │
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

## 2. Data Flow: Live Captioning Session

```
1. User opens caption-s8t.html
2. Page loads config.js → wsUrl from window.SOTTOTITOLI_CONFIG
3. User clicks "Avvia sessione" → toggleSession()
4. AudioRecorder starts capturing mic
5. Audio chunks sent via WebSocket to Render relay
6. Render relay processes with OpenAI Whisper → returns text
7. Text broadcast to all clients in room (including overlay pages)
8. Translation provider translates text (MyMemory/Google)
9. Captions rendered in real-time in caption bar
10. Session saved to Supabase sessions table on stop
```

---

## 3. Data Flow: Auth

```
1. User clicks "Accedi" on any page
2. signInWithGoogle() in js/auth.js
3. Google OAuth popup → user authenticates
4. Redirect to AUTH_REDIRECT_URL (panoramica.html)
5. Supabase reads #access_token from URL
6. Session stored in Supabase local storage
7. User data loaded from profiles table
8. Return page restored from localStorage('sottotitoli_return_page')
```

---

## 4. Data Flow: Payment

```
1. User on purchase.html selects product
2. Frontend calls Supabase Edge Function: create-checkout-session
3. Edge function creates Stripe Checkout session
4. User redirected to Stripe Checkout page
5. User completes payment
6. Stripe sends webhook to Supabase Edge Function: stripe-webhook
7. Webhook verifies signature, credits user's token ledger
8. User redirected back to panoramica with updated balance
```

---

## 5. Data Flow: AI Reports

```
1. User requests AI report from panoramica or caption-s8t
2. Request inserted into ai_report_requests table
3. Supabase Edge Function process-ai-reports triggered (scheduled or on-insert)
4. Edge function processes session transcript with OpenAI
5. Results saved to session_ai_reports table
6. User notified via Supabase Realtime (notifications.js)
7. User views report on panoramica → AI Reports panel
```

---

## 6. Communication Contract: WebSocket Messages

### Client → Server
```json
// Initial connection with room ID
// Room ID from URL param or localStorage
```

### Server → Client (Final)
```json
{
  "msg": true,
  "final": "This is the complete recognized text.",
  "id": 42,
  "label": "Speaker 1"
}
```

### Server → Client (Interim)
```json
{
  "msg": true,
  "interm": "This is partial recogni...",
  "id": 42
}
```

### DO NOT CHANGE THIS FORMAT
The relay server and all clients depend on this exact structure.

---

## 7. Multi-Repo Coordination

| Change | Which Repo | What to Update |
|--------|-----------|----------------|
| New WebSocket feature | `sottotitoli` + `sottotitoli-websocket` | Both client and server |
| New API endpoint | `sottotitoli` + `sottotitoli-learning` | Client fetch + server route |
| New DB column | `sottotitoli` (migration) | Migration SQL + frontend queries |
| Stripe product change | `sottotitoli` (edge function) + Stripe dashboard | PRICE_MAP + Stripe product |
| Config change | `sottotitoli` (`config.example.js`) | Template only (config.js is gitignored) |

---

## 8. Known Fragile Points

| Component | Why Fragile | Mitigation |
|-----------|------------|------------|
| CSS theme variables | Each page has its own | Copy from panoramica, test both modes |
| WebSocket format | Contract with relay server | Never change message structure |
| Supabase column names | Traps (transcript vs transcript_text) | Always check supabase-schema.md |
| i18n leaf-span | Icons get wiped | Wrap text in span, never on parent |
| Auth race condition | User not available at load | Always await getSession() |
| config.js | Contains secrets, gitignored | Edit config.example.js only |
| index.html slider | Diagonal wipe transitions | Make targeted fixes, don't rewrite |

---

*Last updated: 2026-08-05*
