# ERROR-CODES.md — Error Catalog & Recovery Paths

> **Every error state, its user-facing message, and how to recover.**
> For AI agents debugging, and for future error-handling improvements.
>
> **Cross-refs:** `solve-mistakes.md` · `architecture.md` · `deploy-runbook.md` · `websocket-protocol.md`

---

## Error Categories

### 🔴 Critical (User sees nothing / page broken)
### 🟠 High (Feature broken, user impacted)
### 🟡 Medium (Degraded experience)
### 🟢 Low (Cosmetic / logged only)

---

## Authentication Errors

### AUTH-001: No Supabase Session
| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **Symptom** | Redirect to `index.html?auth=required` |
| **Console** | `No session yet, polling for auth...` |
| **User sees** | 🔐 "Accedi per continuare" page |
| **Root cause** | `js/auth.js` detects no active session in Supabase |
| **Recovery** | User clicks "Accedi" → Google OAuth flow |
| **Dev bypass** | See `docs/ai/auth-bypass-testing.md` |

### AUTH-002: Token Expired
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | API calls fail with 401, page seems to work but no data loads |
| **Console** | `JWT expired` or `Auth session missing` |
| **User sees** | Panels show "Caricamento…" indefinitely |
| **Root cause** | Supabase session token expired (default: 1 hour) |
| **Recovery** | `supabase.auth.refreshSession()` or user re-logs in |

### AUTH-003: Google OAuth Popup Blocked
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | Click "Accedi" → nothing happens |
| **Console** | Popup blocked by browser |
| **User sees** | Button appears to do nothing |
| **Root cause** | Browser popup blocker or strict privacy settings |
| **Recovery** | User enables popups for the domain, or use redirect flow instead of popup |

---

## WebSocket Errors

### WS-001: Render Instance Asleep
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | No captions appear, no errors in console |
| **Console** | `WebSocket connection to 'wss://...' failed` |
| **User sees** | Caption area empty or showing "Connecting…" |
| **Root cause** | Render free tier sleeps after 15 min inactivity. Cold start takes 30–60s |
| **Recovery** | Wait 30s, refresh page. Auto-reconnect after 2s |
| **Prevention** | Keep-alive ping every 10 min (not yet implemented) |

### WS-002: CSP Blocks WebSocket
| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **Symptom** | WebSocket never connects, captions never appear |
| **Console** | `Refused to connect to 'wss://...' because it violates CSP` |
| **Root cause** | `wss://` URL not in Content-Security-Policy `connect-src` |
| **Recovery** | Add `wss://sottotitoli-websocket.onrender.com` to CSP meta tag |
| **Prevention** | Check CSP whenever adding new WebSocket endpoints |

### WS-003: Network Drop During Session
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | Captions stop mid-session |
| **Console** | `WebSocket is closed` or `WebSocket error` |
| **User sees** | Last caption frozen, no new text |
| **Root cause** | WiFi drop, VPN disconnect, Render instance restart |
| **Recovery** | Auto-reconnect after 2s. If room lost, start new session |

---

## Supabase Data Errors

### DB-001: Column Name Mismatch
| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **Symptom** | API call succeeds but data doesn't load. No error in UI. |
| **Console** | `column "transcript" does not exist` |
| **User sees** | Empty panels, "Caricamento…" |
| **Root cause** | Wrong column name in query (see `memories/repo/supabase-schema.md`) |
| **Common traps** | `transcript` → `transcript_text`, `wpm_avg` → `wpm`, `cefr` → `cefr_level` |
| **Recovery** | Fix column name in query |

### DB-002: Row-Level Security Block
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | Query returns empty array `[]` when data exists |
| **Console** | No error (RLS silently filters) |
| **User sees** | "No sessions found" despite having sessions |
| **Root cause** | RLS policy doesn't match the current user's auth context |
| **Recovery** | Verify RLS policy in Supabase dashboard, check `user_id` filter |

### DB-003: Edge Function Cold Start
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | First API call after inactivity takes 3–8 seconds |
| **Console** | No error (just slow) |
| **User sees** | Spinner for 5+ seconds |
| **Root cause** | Supabase free tier cold-starts edge functions after inactivity |
| **Recovery** | Wait. Subsequent calls are fast (cached). |

---

## Payment Errors

### PAY-001: Stripe Checkout Failed
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | Click "Acquista" → error or redirect to index |
| **Console** | `Stripe checkout error: ...` |
| **User sees** | Checkout page doesn't load or payment declined |
| **Root cause** | Invalid product ID, Stripe API key mismatch, or card declined |
| **Recovery** | User retries. If persistent, check Stripe dashboard for failed payments |

### PAY-002: Webhook Not Processed
| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **Symptom** | Payment succeeds but credits don't appear |
| **Console** | (server-side) `stripe-webhook` function error |
| **User sees** | Balance unchanged after successful payment |
| **Root cause** | Webhook signature verification failed, or edge function errored |
| **Recovery** | Manual credit grant in Supabase, fix webhook handler |

---

## Translation Errors

### TR-001: Google Translate Rate Limit
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | Translations stop appearing, fallback to MyMemory |
| **Console** | `translate error: 429 Too Many Requests` |
| **User sees** | Slower translations or "Translation unavailable" |
| **Root cause** | Google Translate unofficial API rate-limited |
| **Recovery** | MyMemory fallback handles automatically. Rate limit resets after ~1 min |

### TR-002: MyMemory Daily Limit
| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **Symptom** | Translation returns empty string |
| **Console** | `MyMemory quota exceeded` |
| **User sees** | Blank translation field |
| **Root cause** | MyMemory free tier: 5000 chars/day (anonymous), 10000 chars/day (with email) |
| **Recovery** | Wait until next day, or use authenticated MyMemory key |

---

## UI Errors

### UI-001: Div Imbalance — Panels Hidden
| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **Symptom** | Multiple panels show blank content, no console errors |
| **Console** | Nothing (silent failure) |
| **User sees** | Clicking sidebar tabs shows empty panels |
| **Root cause** | Missing `</div>` on a `display:none` element swallows subsequent panels |
| **Detection** | See `docs/ai/html-edit-playbook.md` Technique 1 |
| **Recovery** | Find missing close, add it, verify with `get_errors` |

### UI-002: Font Awesome Icons Missing
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | All `.fa-*` icons show as empty squares or nothing |
| **Console** | `Failed to find valid digest in integrity attribute` |
| **User sees** | Buttons without icons, broken layout |
| **Root cause** | Stale SRI hash on CDN link (see ADR-009 in `docs/ai/DECISIONS.md`) |
| **Recovery** | Remove `integrity` and `crossorigin` from Font Awesome `<link>` tag |

### UI-003: i18n Text Not Displaying
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | Some UI elements show raw key names like `[start_session]` |
| **Console** | `SyntaxError` in `js/i18n.js` |
| **User sees** | Raw translation keys instead of text |
| **Root cause** | Unescaped quote or syntax error in `i18n.js` prevents the file from loading |
| **Recovery** | `node --check js/i18n.js`, fix syntax error |

---

## AI Report Errors

### AI-001: Token Balance Insufficient
| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **Symptom** | "Generate Report" button shows error |
| **Console** | `Insufficient tokens` |
| **User sees** | "Crediti insufficienti" or button disabled |
| **Root cause** | User has fewer tokens than the selected report costs |
| **Recovery** | User purchases more tokens via `purchase.html` |

### AI-002: OpenAI API Error
| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **Symptom** | Report generation fails, error toast appears |
| **Console** | `OpenAI API error: 429` or `500` |
| **User sees** | "Errore nella generazione del report" |
| **Root cause** | OpenAI rate limit, API downtime, or invalid prompt |
| **Recovery** | Retry after 30s. If persistent, check OpenAI dashboard for quota |

---

## Summary Matrix

| Code | Severity | Category | Auto-Recover? |
|------|----------|----------|---------------|
| AUTH-001 | 🔴 | Auth | No (user must log in) |
| AUTH-002 | 🟠 | Auth | Yes (refresh token) |
| AUTH-003 | 🟠 | Auth | No (user must enable popups) |
| WS-001 | 🟡 | WebSocket | Yes (auto-reconnect) |
| WS-002 | 🔴 | WebSocket | No (fix CSP) |
| WS-003 | 🟡 | WebSocket | Partial (reconnect, may lose room) |
| DB-001 | 🔴 | Data | No (fix column name) |
| DB-002 | 🟠 | Data | No (fix RLS) |
| DB-003 | 🟡 | Data | Yes (cold start resolves) |
| PAY-001 | 🟠 | Payment | Partial (retry) |
| PAY-002 | 🔴 | Payment | No (manual intervention) |
| TR-001 | 🟡 | Translation | Yes (MyMemory fallback) |
| TR-002 | 🟢 | Translation | No (daily limit) |
| UI-001 | 🔴 | UI | No (fix HTML) |
| UI-002 | 🟠 | UI | No (fix CDN link) |
| UI-003 | 🟡 | UI | No (fix syntax) |
| AI-001 | 🟡 | AI | No (purchase tokens) |
| AI-002 | 🟠 | AI | Yes (retry) |

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
