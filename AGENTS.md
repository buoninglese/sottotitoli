# AGENTS.md — Sottotitoli AI Agent Hub

> **You are an AI coding agent. This is your entry point.**
> Start here. Everything you need is linked from this file.
>
> Last updated: 2026-08-05 · Version: 3.0

---

## ⚡ Quickstart (60 seconds)

```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 serve.py                   # → http://localhost:8000 (blocks internal docs)
# or for simple access:
python3 -m http.server 8000        # → serves everything (no blocking)
node --check <file.js>             # syntax check after EVERY edit
git commit -m "fix: …" && git push # auto-push after EVERY commit
```

**Use `python3 serve.py` for local dev.** It blocks public access to `docs/ai/`, `supabase/`, `config.js`, and other internal paths. The raw `http.server` exposes everything.

**Three non-negotiable rules before you touch any code:**
1. **Read `docs/ai/coding-procedures.md`** — how to safely edit HTML/CSS/JS
2. **Read `docs/ai/solve-mistakes.md`** — 12 bugs we've already solved, don't repeat them
3. **Check syntax after EVERY edit** — `node --check` for .js, `get_errors` for .html

**⚠️ For HTML edits (panoramica.html, any page >1000 lines):**
- **Count `<div>` / `</div>` balance** in the edited section — `grep -c '<div'` vs `grep -c '</div>'` across the changed range
- **Check `get_errors`** before committing. If `<main>` or `</div>` shows "not paired" or "no start tag" after your edit, you miscounted
- **Never add a `</div>` without verifying the matching `<div>` exists and is at the right nesting level**
- **When adding an opening `<div>`, add its closing `</div>` in the same edit** — don't leave it for later
- **After HTML edits: run `git diff --stat`** — if the line delta isn't balanced (added/deleted divs should come in pairs), review carefully

**2026-08-05 lesson:** A single extra `</div>` at line 1747 closed `<main>` 2,300 lines early. A single missing `</div>` at line 1794 nested 6 content panels inside a `display:none` popup. Both went undetected for weeks. When user reports "empty tabs" or "squeezed layout", check HTML structure FIRST.

---

## � Developer Tools (VS Code Extensions)

These extensions catch syntax errors and lint issues in real-time. All are installed and configured.

| Extension | ID | What It Does |
|-----------|-----|--------------|
| **Error Lens** | `usernamehw.errorlens` | Shows errors/warnings inline, right next to the code — no need to hover or open Problems panel |
| **ESLint** | `dbaeumer.vscode-eslint` | Checks standalone `.js` files for common mistakes (unused vars, unreachable code, etc.) |
| **HTMLHint** | `htmlhint.vscode-htmlhint` | Validates HTML structure — tag pairing, duplicate IDs, missing alt attributes |

### How to check for errors

| Method | What | When |
|--------|------|------|
| **Inline (Error Lens)** | Errors appear in red text right on the line | Immediately as you type/save |
| **Problems panel** | `Cmd+Shift+M` — full error list with line numbers | When you want all errors at once |
| **Terminal** | `node --check <file.js>` | After every JS edit |
| **get_errors tool** | AI agent can call `get_errors` on any file | Before committing, for AI agent to verify |

### Config files
- `.eslintrc.json` — ESLint rules (browser env, ES2020, warns on unused vars)
- `.htmlhintrc` — HTMLHint rules (lowercase tags, unique IDs, alt attributes)
- `.vscode/settings.json` — Workspace settings (Error Lens styling, file exclusions)

---

## �🗺️ Documentation Map

### For Agents (AI coding assistants)
| File | Purpose | Read When |
|------|---------|-----------|
| **[docs/ai/README.md](docs/ai/README.md)** | Index of all AI docs | First thing |
| **[docs/ai/UPDATE-MASTER-MDs.md](docs/ai/UPDATE-MASTER-MDs.md)** | Protocol for updating any MD | When asked to update docs |
| **[docs/ai/coding-procedures.md](docs/ai/coding-procedures.md)** | Safe editing rules | Before any edit |
| **[docs/ai/solve-mistakes.md](docs/ai/solve-mistakes.md)** | Bug encyclopedia | Debugging |
| **[docs/ai/architecture.md](docs/ai/architecture.md)** | System architecture | Understanding the stack |
| **[docs/ai/css-theme-guide.md](docs/ai/css-theme-guide.md)** | Day/night theming | Editing CSS |
| **[docs/ai/pages-directory.md](docs/ai/pages-directory.md)** | Every page & status | Finding files |
| **[docs/ai/glossary.md](docs/ai/glossary.md)** | Terminology | Understanding jargon |
| **[docs/ai/testing-checklist.md](docs/ai/testing-checklist.md)** | Pre-commit checklist | Before committing |
| **[docs/ai/deploy-runbook.md](docs/ai/deploy-runbook.md)** | Deploy procedures | Deploying || **[docs/ai/security-hardening.md](docs/ai/security-hardening.md)** | Security audit & hardening | Security review |
### For Humans (designers, marketers, business)
| File | Purpose |
|------|---------|
| **[docs/ai/brand-voice.md](docs/ai/brand-voice.md)** | Tone, messaging, copy rules |
| **[docs/ai/business-info.md](docs/ai/business-info.md)** | Company, pricing, legal, Stripe |
| **[DESIGN.md](DESIGN.md)** | Visual design system (colors, fonts, components) |

### For Backend & Operations
| File | Purpose |
|------|---------|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Full architecture diagram + data flows |
| **[docs/SERVICES.md](docs/SERVICES.md)** | Production URLs, health endpoints |
| **[docs/METRICS.md](docs/METRICS.md)** | Every metric, calculation, source file |
| **[docs/SECURITY.md](docs/SECURITY.md)** | Security policy, secrets, keys |
| **[docs/ROADMAP.md](docs/ROADMAP.md)** | What's next |
| **[docs/CHANGELOG.md](docs/CHANGELOG.md)** | What changed |
| **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** | How to contribute |
| **[docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)** | Pre-deploy verification |
| **[docs/STRIPE_PRODUCTS.md](docs/STRIPE_PRODUCTS.md)** | Stripe product config |
| **[dev/WORKFLOW.md](dev/WORKFLOW.md)** | AI report prompt workflow |

### Archived (historical reference, not actively maintained)
`docs/archive/` — CEFR planning, brutalist migration, hero specs, etc.

---

## 🏗️ Project Identity

**Sottotitoli** (Italian: "Subtitles") — Real-time AI captioning + translation web app.
- **Live:** https://www.sottotitoli.pro (GitHub Pages: `buoninglese.github.io/sottotitoli`)
- **Stack:** Static HTML/CSS/JS. No build step. No framework.
- **UI Language:** Italian. Code comments: English.
- **Business:** Freemium. 15 min/week free. Prepaid credit packs via Stripe.
- **Aesthetic:** Cinema-inspired. Wes Anderson meets Tarantino.
- **Founder:** Sebastian Krauwel. Dutch native, practicing Dutch→Italian.

### Multi-Repo Architecture

| Repo | What | Stack | Host |
|------|------|-------|------|
| `sottotitoli` (this) | Frontend — all pages, UI, client logic | Static HTML/CSS/JS | GitHub Pages |
| `sottotitoli-websocket` | WebSocket relay + OpenAI Whisper | Node.js ESM | Render |
| `sottotitoli-learning` | CEFR vocabulary + Oxford dictionary | Node.js CJS | Render |

---

## 🔗 Communication Flow

```
Browser Mic → WebSocket relay → OpenAI Whisper → back to all clients in room
```

**WebSocket message format (DO NOT CHANGE):**
```json
{"msg": true, "final": "text", "id": counter, "label": "label"}
{"msg": true, "interm": "partial", "id": counter}
```

---

## 📁 Key Files

### Core Pages
| File | Purpose | Size |
|------|---------|------|
| `index.html` | Landing page — parallax slider, diagonal wipes | ~30KB |
| `panoramica.html` | Main dashboard — the most complex page | 114KB+ |
| `caption-s8t.html` | Next-gen caption interface — 5 slides, word bank | ~8K lines |
| `studio.html` | Original caption workspace — legacy | ~114KB |
| `purchase.html` | Stripe checkout / pricing | ~20KB |
| `onboarding.html` | New user onboarding flow | ~15KB |
| `account.html` | User profile + "Il tuo viaggio" | ~30KB |
| `analysis.html` | Session analysis + AI reports | ~50KB |
| `gara.html` | Multiplayer language game | ~40KB |
| `overlay.html` / `overlay-roll.html` / `overlay-cinema.html` | Caption display overlays | ~10KB each |

### Critical JavaScript
| File | Role | Load Order |
|------|------|------------|
| `config.js` | All configuration (**GITIGNORED!**) | 1st |
| `js/auth.js` | Supabase Google OAuth → `window.sottotitoliSupabase` | 2nd |
| `js/theme.js` | Navbar, hamburger, day/night toggle | 3rd |
| `js/i18n.js` | Language toggle (IT↔EN) | Page-specific |
| `app.js` | Main application logic (huge) | Page-specific |
| `translation-providers.js` | MyMemory + Google Translate | Page-specific |
| `session-utils.js` | Session management | Page-specific |
| `audio-recorder.js` | Audio capture | Page-specific |
| `security-utils.js` | Security utilities (**FRAGILE**) | Page-specific |

### CSS Files
| File | Role |
|------|------|
| `css/theme-2.css` | Shared theme — navbar, panels, snapping |
| `css/theme.css` | Legacy shared theme (older pages) |
| `css/panoramica.css` | Panoramica-specific styles |
| `css/responsive.css` | Global responsive breakpoints |
| `css/tailwind.min.css` | Tailwind utilities (sparingly) |

### Supabase
- **Project:** `qzqmuegbpmvqrjrlfbgk`
- **URL:** `https://qzqmuegbpmvqrjrlfbgk.supabase.co`
- **Auth:** Google OAuth only
- **Edge Functions:** `create-checkout-session`, `stripe-webhook`, `process-ai-reports`, `wordnik-proxy`
- **Key Tables:** `profiles`, `sessions`, `user_vocabulary`, `token_transactions`, `ai_report_requests`, `session_ai_reports`
- **Column traps:** `transcript_text` NOT `transcript` · `wpm` NOT `wpm_avg` · `cefr_level` NOT `cefr`

---

## 🎨 Design Quick Reference

| Element | Value |
|---------|-------|
| **UI Font** | Inter (400–900) |
| **Headline Font** | Manrope (500–800) |
| **Mono Font** | JetBrains Mono (labels, eyebrow text) |
| **Day Mode** | Off-white (`#f0f6f8`), warm purples |
| **Night Mode** | Deep blue→blackish (`#0b151c`), cyan accents |
| **Buttons** | Pill-shaped (`border-radius:100px`), purple accent |
| **Cards** | Rounded (14–18px), subtle borders, soft shadows |
| **Transitions** | `cubic-bezier(.2,.8,.2,1)` |

Each page has its **own** `:root`/`[data-theme="dark"]` CSS variables. They are NOT shared across pages. See `docs/ai/css-theme-guide.md`.

---

## ⚠️ Known Issues (2026-08-05)

| Issue | Location | Status |
|-------|----------|--------|
| Session duration shows 0s after recording | `studio.html` | 🔴 Unresolved |
| Account settings not persisting | `account.html` | 🔴 Unresolved |
| Hamburger menu links broken (Wallet, Settings, Logout) | Some pages | 🔴 Unresolved |
| Gara multiplayer: mic stops after 2 sentences | `gara.html` | 🔴 Unresolved |
| AI report generation: constraint violations | Supabase | 🔴 Unresolved |
| Translation duplicate outputs | `translation-providers.js` | 🟡 Intermittent |
| Day/night mode doesn't work on studio.html | `studio.html` | 🟡 Possibly fixed |

---

## 🧠 Repo Memory Files

Located in `/memories/repo/` — loaded automatically into AI agent context:

| File | Knowledge |
|------|-----------|
| `caption-s8t-expert-guide.md` | Deep dive: 8K lines, 142 functions, 5 slides |
| `supabase-schema.md` | Verified column names (traps to avoid!) |
| `database-schema.md` | Profiles, preferences, migration notes |
| `i18n-rules.md` | Leaf-span pattern — CRITICAL |
| `hugging-voice-rules.md` | 34 critical IDs, never remove them |
| `s2s-voice-pitfalls.md` | VAD bugs, STT truncation, flag formats |
| `cefr-integration-plan.md` | CEFR API architecture |
| `version.md` | Current panoramica.html version |

---

## 🔧 Git Workflow

```bash
git status                           # Check what changed
git add <files>                      # Stage (NEVER config.js!)
git commit -m "type: description"    # fix:, feat:, style:, refactor:
git push origin main                 # ALWAYS push after commit
```

---

## 🚨 The "Never" List

1. ❌ Commit `config.js` — it's gitignored. Edit `config.example.js`.
2. ❌ Hardcode URLs — use `window.SOTTOTITOLI_CONFIG` or relative paths.
3. ❌ Put `data-i18n` on elements with children — wrap text in `<span>`.
4. ❌ Change WebSocket message format — relay server depends on it.
5. ❌ Use wrong Supabase column names — check `supabase-schema.md`.
6. ❌ Remove elements with `id` from `hugging-voice/` — 34 critical IDs.
7. ❌ Use `?embed=1` on hugging-voice iframe — kills `showModal()`.
8. ❌ Skip syntax check after JS edits — `node --check` MANDATORY.
9. ❌ Skip mobile (375px) or day/night mode testing.
10. ❌ Use `~/` unquoted in shell commands — expands to home directory.
11. ❌ Add build steps — this is a static site.
12. ❌ Use `status` as a variable name in zsh — it's read-only.

---

## 📋 Quick Checklist (Before Every Commit)

- [ ] `node --check <file.js>` passed (or `get_errors` for HTML)
- [ ] Tested at desktop (1200px+) and mobile (375px)
- [ ] Tested day AND night mode
- [ ] No console errors
- [ ] `config.js` NOT staged
- [ ] Version bumped (if editing `panoramica.html`)
- [ ] Committed AND pushed

---

*This file is the authoritative entry point. All other docs link back here.*
*See [docs/ai/README.md](docs/ai/README.md) for the full AI documentation index.*


