# state-management.md — State & Data Flow

> **Where every piece of data lives and how it flows between components.**
> Helps AI agents understand the mental model without reading all 12,000 lines.
>
> **Cross-refs:** `architecture.md` · `dependency-map.md` · `supabase-edge-functions.md` · `AGENTS.md`

---

## The Four Data Sources

```
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│ localStorage │  │  Supabase   │  │  Supabase     │  │   In-Memory │
│ (client)     │  │  (auth+DB)  │  │  Realtime     │  │   (JS vars) │
└──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘
       │                 │                │                  │
       ▼                 ▼                ▼                  ▼
   User prefs       Persistent data   Live updates      Session state
   Theme, lang      Sessions, vocab   Notifications     Active panel
   Study lang       Word banks        Credits balance   Search queries
   Settings         AI reports                           WebSocket conn
```

---

## localStorage Keys

| Key | Type | Set By | Read By | Purpose |
|-----|------|--------|---------|---------|
| `sottotitoli-theme` | `"light"│"dark"` | `js/theme-2.js` | All pages | Color theme preference |
| `sottotitoli-study-lang` | `"en"│"it"│...` | `js/theme-2.js` | panoramica, caption-s8t | Target study language |
| `sottotitoli-settings` | JSON object | `panoramica.html` | panoramica | UI language, default caption/translation |
| `sottotitoli-return-page` | URL string | `js/auth.js` | `js/auth.js` | Page to return to after OAuth |
| `sottotitoli-fav-banks` | JSON array | panoramica | panoramica | Favorite word bank IDs |
| `sottotitoli-recent-imports` | JSON array | panoramica | panoramica | Recently imported files |
| `wbx-accent-scheme` | `"2"│"4"│...` | panoramica | panoramica | Word bank card color scheme |
| `wbx-accent-mode` | `"none"│"pos"│"cefr"` | panoramica | panoramica | Word bank card color mode |

---

## Supabase Tables (Persistent Data)

| Table | Key Data | Written By | Read By |
|-------|----------|-----------|---------|
| `profiles` | display_name, avatar_url, native_lang, plan | `js/auth.js` (upsert on login) | All auth pages |
| `sessions` | transcript_text, duration_minutes, wpm, clarity_score, mattr_score | `caption-s8t.html` (on stop) | panoramica |
| `user_vocabulary` | word, cefr_level, lemma, pos, session_count | `process-session-analytics` | panoramica |
| `user_wordbanks` | name, lang, description | panoramica | panoramica |
| `session_ai_reports` | report_type, content_json, scores | `process-ai-reports` | panoramica, caption-s8t |
| `ai_report_requests` | transcript_ids, module_id, status, tokens_used | panoramica | `process-ai-reports` |
| `grammar_reports` | errors_json, scores, advice | `generate-grammar-report` | panoramica (Grammar Hub) |
| `notifications` | type, message, read | `session-rewards`, `welcome-notification` | `js/notifications.js` |
| `user_credits` | free_minutes, paid_minutes | `stripe-webhook` | panoramica, purchase.html |
| `user_tokens` | token_balance | `stripe-webhook` | panoramica |
| `review_words` | word, mastery_score, next_review_at | AI | panoramica (Vocabulary Builder) |
| `rooms` | name, created_by | `create-room` | traduzione-s8t |
| `room_members` | room_id, user_id, role | `join-room` | traduzione-s8t |

---

## Supabase Realtime (Live Updates)

Subscriptions active in `js/notifications.js`:

| Channel | Table | Filter | Action |
|---------|-------|--------|--------|
| `notifications` | `notifications` | `user_id = auth.uid()` | Show toast, update badge count |

**Usage:** `panoramica.html`, `caption-s8t.html`, `duo-s8t.html` (3 pages).

---

## In-Memory State (JavaScript Variables)

### Global (window.*)

| Variable | Type | Set By | Purpose |
|----------|------|--------|---------|
| `window.sottotitoliSupabase` | SupabaseClient | `js/auth.js` | Authenticated Supabase client |
| `window.SOTTOTITOLI_CONFIG` | object | `config.js` | All configuration (URLs, keys) |
| `window.SOTTOTITOLI_STUDY_LANG` | string | `js/theme-2.js` | Current study language |
| `window.SottotitoliData` | object | `js/data-service.js` | Cached data access layer |
| `window.I18n` | object | `js/i18n.js` | Translation engine |

### Page-Specific (closures)

| Variable | Page | Purpose |
|----------|------|---------|
| `_cefrApi` | panoramica | CEFR API base URL |
| `_sd` (settingsData) | panoramica | Loaded settings cache |
| `ssCapCode`, `ssSrcCode`, `ssTgtCode` | panoramica | Start Session language codes |
| `room` | caption-s8t | Active WebSocket room ID |
| `modeConfig` | caption-s8t | Caption/translation mode settings |

---

## Data Flow: Changing Study Language

```
1. User clicks hero chip or sidebar lang-opt
2. switchLang(lang) in js/theme-2.js
3. Sets localStorage('sottotitoli-study-lang')
4. Sets window.SOTTOTITOLI_STUDY_LANG
5. Dispatches CustomEvent('studylang-changed')
6. Panoramica listeners refresh vocabulary data
7. Word banks, CEFR quad, suggestions all re-render
```

## Data Flow: Authentication

```
1. Page loads → js/auth.js runs
2. Checks Supabase session (getSession())
3. If session: sets window.sottotitoliSupabase, polls for profile
4. If no session: saves current URL to localStorage, redirects to index
5. After Google OAuth: reads access_token from URL hash, restores return page
```

## Data Flow: Session Save

```
1. User stops caption session
2. caption-s8t.html calls SottotitoliData.saveSession()
3. INSERT into sessions (transcript_text, duration, wpm, ...)
4. Supabase triggers process-session-analytics Edge Function
5. Computes MATTR, CEFR breakdown, updates user_vocabulary
6. session-rewards Edge Function checks for milestones
7. Notifications appear via Supabase Realtime
```

---

## Cache Invalidation

| Data | Cache Strategy | Refresh Trigger |
|------|---------------|-----------------|
| Word banks | `SottotitoliData.cacheClear()` | After create/rename/delete |
| Sessions | No cache — fetch on panel open | Tab click in panoramica |
| Settings | localStorage + Supabase | Save button in Impostazioni |
| AI Reports | Fetch on tab click | "I miei Report" tab open |
| Notifications | Supabase Realtime | Instant on insert |

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
