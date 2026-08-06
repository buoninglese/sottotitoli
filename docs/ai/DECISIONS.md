# DECISIONS.md — Architecture Decision Records

> **Why we built it this way.** Read this before proposing a rewrite.
> Every decision here was made for a reason. If that reason no longer holds, update this file.
>
> **Cross-refs:** `AGENTS.md` · `docs/ai/architecture.md` · `docs/ai/solve-mistakes.md` · `docs/ai/coding-procedures.md`
>
> Last updated: 2026-08-06

---

## ADR-001: Static HTML/CSS/JS — No Framework

**Date:** 2024 (project inception)
**Status:** Accepted ✅

### Context
The site needed to run on GitHub Pages (static hosting only). The primary audience is language learners using the app for real-time captioning. No server-side rendering needed — all interactivity is client-side.

### Decision
Pure static HTML, CSS, and vanilla JavaScript. No React, Vue, Svelte, or build step. No `node_modules`, no bundler, no transpiler.

### Consequences

**Pros:**
- Zero build step — edit and refresh
- Deploys instantly via `git push` to GitHub Pages
- No framework churn or dependency rot
- Full control over every byte
- AI agents can edit files directly without understanding a build pipeline

**Cons:**
- No component reuse — each page duplicates its own header/sidebar/footer
- 12,000-line HTML files (`panoramica.html`) are fragile
- No type checking
- Manual DOM manipulation everywhere
- CSS scoping relies on discipline, not tooling

### Mitigations
- `AGENTS.md` enforces strict editing procedures via AI agents
- `css/theme-2.css` centralizes shared styles
- `js/theme-2.js` centralizes shared behavior (theme toggle, sidebar nav, sub-tabs)
- `config.js` isolates all configuration (gitignored; `config.example.js` as template)
- Div-balance checks (`docs/ai/coding-procedures.md`) prevent structural breaks

---

## ADR-002: Multi-Repo Architecture

**Date:** 2024
**Status:** Accepted ✅

### Context
The frontend is static HTML on GitHub Pages. But real-time captioning needs a WebSocket server, and vocabulary scoring needs a Python API. GitHub Pages can't run servers.

### Decision
Three separate repos, each deployed independently:

| Repo | Role | Stack | Host |
|------|------|-------|------|
| `sottotitoli` | Frontend — all pages, UI, client logic | Static HTML/CSS/JS | GitHub Pages |
| `sottotitoli-websocket` | WebSocket relay + OpenAI Whisper STT | Node.js ESM | Render |
| `sottotitoli-learning` | CEFR vocabulary + Oxford dictionary | Node.js CJS | Render |

### Consequences

**Pros:**
- Each service scales and deploys independently
- Clear separation of concerns
- Frontend can be tested with any WebSocket endpoint
- Learning service can be swapped without touching the frontend

**Cons:**
- Three deploy targets to monitor
- Cross-repo changes need coordination
- WebSocket message format is a shared contract (see `docs/ai/architecture.md`)

### Mitigations
- WebSocket message format is documented in `docs/ai/architecture.md` and treated as immutable
- All three repos have their own `AGENTS.md` or equivalent

---

## ADR-003: Panel-Based SPA Navigation (data-panel Pattern)

**Date:** 2024
**Status:** Accepted ✅

### Context
With 10+ content panels (Panoramica, Word Banks, Vocabulary Builder, Grammar Hub, Trascrizioni, Report AI, Profilo, Impostazioni, Aiuto, AI Voice), real page navigation would be slow. Users expect instant tab switching.

### Decision
All panels live in a single HTML file (`panoramica.html`). Navigation uses `data-panel` attributes on sidebar links, with JavaScript toggling `.active` classes. CSS hides all `.content-panel` elements except the one with `.active`.

```css
.content-panel { display: none; }
.content-panel.active { display: block; }
```

### Consequences

**Pros:**
- Instant tab switching (no network requests)
- Shared state across panels (auth, settings, study language)
- Single file to deploy and cache

**Cons:**
- 12,000+ line HTML files with deeply nested panels
- A single missing `</div>` can hide multiple panels (see ADR-007)
- All panels load on page open, even if never visited
- Memory usage scales with total panel count

### Mitigations
- `docs/ai/coding-procedures.md` mandates div-balance checks after every HTML edit
- `get_errors` tool used before every commit
- Extracted Explorer to `grammarhub.html` when nesting became unmanageable (see ADR-008)

---

## ADR-004: Supabase for Auth + Data

**Date:** 2024
**Status:** Accepted ✅

### Context
The site needed user authentication (Google OAuth), a database for sessions/vocabulary/reports, and realtime notifications. Building this from scratch would take weeks.

### Decision
Supabase (PostgreSQL + Auth + Realtime + Edge Functions + Storage).

### Consequences

**Pros:**
- Google OAuth in 10 lines of JS (`js/auth.js`)
- Row-Level Security handles permissions
- 21 Edge Functions handle complex server-side logic
- Realtime subscriptions power notifications
- Free tier sufficient for current scale

**Cons:**
- Vendor lock-in (PostgreSQL schema, RLS policies, Edge Functions)
- Cold starts on Edge Functions (~1-2s for first invocation)
- Column name traps (see `memories/repo/supabase-schema.md`)

### Mitigations
- `memories/repo/supabase-schema.md` documents all column name traps
- `config.js` isolates all Supabase credentials (gitignored)
- Edge Functions are synced between repo (`supabase/`) and production

---

## ADR-005: CEFR/GSE Vocabulary Scoring

**Date:** 2024
**Status:** Accepted ✅

### Context
Users need to understand their vocabulary level. "You know 500 words" is meaningless without a framework. The Common European Framework of Reference (CEFR) and Global Scale of English (GSE) are the standards.

### Decision
Score every word against CEFR levels (A1–C2) and GSE (10–90). Store scores in `user_vocabulary` table. Use `sottotitoli-learning` service for lookups.

### Consequences

**Pros:**
- Users get actionable level feedback ("Your vocabulary is B1, target B2 words are...")
- Industry-standard framework (recognizable to learners)
- Enables smart suggestions based on level gaps

**Cons:**
- CEFR/GSE data is not open-source (requires licensing)
- Single words can have multiple CEFR levels depending on context
- Scoring accuracy depends on session volume

---

## ADR-006: WebSocket Relay for Real-Time Captions

**Date:** 2024
**Status:** Accepted ✅

### Context
Real-time captions require sub-second latency. REST polling would be too slow. WebRTC is overkill for one-way audio streaming.

### Decision
WebSocket relay server (`sottotitoli-websocket` on Render) receives browser microphone audio, forwards to OpenAI Whisper for STT, and broadcasts transcriptions back to all clients in the room.

### Message Format (Immutable)
```json
{"msg": true, "final": "text", "id": counter, "label": "label"}
{"msg": true, "interm": "partial", "id": counter}
```

### Consequences

**Pros:**
- Real-time captions with ~500ms latency
- Multi-client rooms (DUO+ mode)
- Simple message format, easy to debug

**Cons:**
- Single point of failure (Render WebSocket server)
- No offline support
- Message format is a hard contract — changing it breaks the relay

### Mitigations
- Message format documented here and in `docs/ai/architecture.md`
- `AGENTS.md` "Never" list explicitly forbids changing the format

---

## ADR-007: Div-Balance Checking as Standard Practice

**Date:** 2026-08-05
**Status:** Accepted ✅

### Context
`panoramica.html` is 12,000+ lines with deeply nested panels. A single missing `</div>` on a `display:none` popup (`wbImportPopup`) caused 5 content panels to disappear silently — no console errors, no visual clue.

### Decision
After every HTML edit, verify div balance with a Python one-liner:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    t = f.read()
print('Opens:', len(re.findall(r'<div[\s>]', t)))
print('Closes:', len(re.findall(r'</div>', t)))
"
```

If the count differs, narrow down the region with:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
for start in range(0, len(lines), 500):
    end = min(start+500, len(lines))
    net = sum(len(re.findall(r'<div[\s>]', l)) - len(re.findall(r'</div>', l)) for l in lines[start:end])
    if net != 0:
        print(f'Lines {start+1}-{end}: net {net:+d}')
"
```

### Consequences

**Pros:**
- Catches the most common silent bug in static HTML
- Instant feedback (no browser needed)
- Already prevented 2 regressions in this session alone

**Cons:**
- Adds 30 seconds to every edit cycle
- Doesn't catch all structural issues (e.g., `<section>` imbalance)

### Mitigations
- `docs/ai/coding-procedures.md` mandates this check
- `docs/ai/solve-mistakes.md` documents the `display:none` swallowing pattern (bug #13)

---

## ADR-008: Extracting Explorer to Standalone Page

**Date:** 2026-08-05
**Status:** Accepted ✅

### Context
The Grammar Hub Explorer subtab was nested 3 levels deep inside the Dashboard pane's section structure. Every attempt to fix the nesting caused cascading structural breaks. The Explorer content itself was correct — it just lived in the wrong place in the DOM.

### Decision
Extract the Explorer to its own page (`grammarhub.html`) rather than continue fighting the nesting. The Grammar Hub sidebar link now navigates to `grammarhub.html` instead of using the `data-panel` pattern.

### Consequences

**Pros:**
- Clean separation — Explorer has its own file with zero nesting issues
- Grammar Hub panel simplified from 3 tabs to 2 (Dashboard + Learning Strategy)
- No more `display:none` swallowing bugs for this content
- Page loads faster since Explorer content isn't pre-loaded in `panoramica.html`

**Cons:**
- Full page navigation instead of instant tab switch (~500ms vs 0ms)
- Shared state (auth, theme, language) must be re-initialized
- Auth redirect on local dev (see `docs/ai/auth-bypass-testing.md`)

### Mitigations
- `js/auth.js`, `js/theme-2.js`, and `config.js` are loaded on both pages
- `serve.py` blocks internal docs from public access on both pages

---

## ADR-009: SRI Hash Removal for External CDN Resources

**Date:** 2026-08-06
**Status:** Accepted ✅

### Context
Font Awesome icons disappeared across all pages. The Subresource Integrity (SRI) hash on the `<link>` tag was stale — cdnjs updated the CSS file but the `integrity` attribute wasn't regenerated. The browser's SRI check blocked the entire CSS file.

### Decision
Remove `integrity` and `crossorigin` attributes from the Font Awesome CDN link:

```html
<!-- Before -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      integrity="sha384-..." crossorigin="anonymous">

<!-- After -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

SRI is unnecessary for this project — it's a publicly hosted static site using a trusted CDN. The risk of a CDN compromise is lower than the risk of silent breakage from stale hashes.

### Consequences

**Pros:**
- No more silent icon failures from stale hashes
- One less thing to maintain per CDN resource
- Icons render reliably

**Cons:**
- Slightly reduced security posture (CDN compromise could inject CSS)
- Not best practice for high-security applications

### Mitigations
- Only 2 CDN resources have SRI removed (Font Awesome, Google Fonts)
- All other resources are self-hosted
- CSP header still restricts which domains can load resources

---

## ADR-010: `serve.py` Dev Server with Path Blocking

**Date:** 2024
**Status:** Accepted ✅

### Context
Local development needs a simple HTTP server. Python's `http.server` works but exposes all files including internal docs (`docs/ai/`) and secrets (`config.js`, `supabase/`).

### Decision
Custom `serve.py` wrapper that blocks access to internal paths:

```python
# serve.py
# Blocks: docs/ai/, supabase/, config.js, .env, .git, memories/
```

Run with: `python3 serve.py` → http://localhost:8000

### Consequences

**Pros:**
- One-command dev server
- Internal docs stay private on local dev
- No accidental exposure of config.js

**Cons:**
- Must remember to use `serve.py`, not `python3 -m http.server`
- Blocked paths hardcoded (add new internal paths manually)

---

## ADR-011: Auth Redirect with Query Parameter Bypass

**Date:** 2024
**Status:** Accepted ✅

### Context
All authenticated pages redirect to `index.html?auth=required` when no session is detected. This makes local testing of authenticated pages impossible without a real login.

### Decision
`js/auth.js` checks for `window.location.search.includes('auth=required')` and shows a login prompt. For local testing, pages that don't need auth should be testable without the redirect.

See `docs/ai/auth-bypass-testing.md` for the complete bypass strategy.

---

## Summary Matrix

| ADR | Decision | Revisit When |
|-----|----------|-------------|
| 001 | Static HTML, no framework | Site needs SSR or component reuse at scale |
| 002 | 3 repos, 3 hosts | Monorepo becomes cheaper than coordination cost |
| 003 | Panel-based SPA in one file | File exceeds 15,000 lines or panel count > 15 |
| 004 | Supabase | Migrating to self-hosted PostgreSQL |
| 005 | CEFR/GSE scoring | Switching to a different proficiency framework |
| 006 | WebSocket relay | Moving to WebRTC or serverless STT |
| 007 | Div-balance checks | Switching to a framework with automatic DOM balancing |
| 008 | Explorer as standalone page | Re-merging if SPAs get component-level isolation |
| 009 | No SRI on CDN links | Switching to a different CDN or self-hosting |
| 010 | Custom dev server | VS Code Live Server or similar becomes reliable |
| 011 | Auth query param bypass | Implementing a proper local auth mock |

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
