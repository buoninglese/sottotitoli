# AGENTS.md — Sottotitoli AI Agent Hub

> **You are an AI coding agent. This is your entry point.**
> Start here. Everything else links from this file.
>
> Last updated: 2026-08-06 · Version: 4.0

---

## ⚡ Quickstart (60 seconds)

```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 serve.py                   # → http://localhost:8000 (blocks internal docs)
node --check <file.js>             # syntax check after EVERY edit
git commit -m "fix: …" && git push # auto-push after EVERY commit
```

**Use `python3 serve.py` for local dev.** It blocks public access to `docs/ai/`, `supabase/`, `config.js`, and other internal paths.

**Three non-negotiable rules before touching any code:**
1. **Read `docs/ai/coding-procedures.md`** — how to safely edit HTML/CSS/JS
2. **Read `docs/ai/solve-mistakes.md`** — 13 bugs already solved, don't repeat them
3. **Read `docs/ai/DECISIONS.md`** — understand WHY the architecture is what it is before proposing changes
4. **Check syntax after EVERY edit** — `node --check` for .js, `get_errors` for .html

**🚀 Superpowers workflow (automatic — do NOT skip):**
- **"Let's build X"** → invoke `brainstorming` skill FIRST, then `writing-plans`, then code
- **"Fix this bug"** → invoke `systematic-debugging` FIRST, then fix
- **Any creative work** → invoke `brainstorming` BEFORE writing any code
- **Before committing** → invoke `verification-before-completion`
- Skills auto-trigger from `~/.agents/skills/superpowers/` — check `using-superpowers` if unsure
- **Rule:** If there's even a 1% chance a skill applies, you MUST use it. Think → Plan → Build. Never build first.

**⚠️ For HTML edits (any page >1000 lines like caption-s8t.html):**
- Count `<div>` / `</div>` balance: `grep -c '<div'` vs `grep -c '</div>'` across the changed range
- Check `get_errors` before committing — if `<main>` shows "not paired", you miscounted
- Never add a `</div>` without verifying the matching `<div>` exists
- When adding an opening `<div>`, add its closing `</div>` in the same edit
- After HTML edits: run `git diff --stat` — divs should come in pairs
- **Note:** `panoramica.html` is now a thin shell (~150 lines of shell HTML) — panels live in `js/panoramica/panels/*.js` as ES modules, not inline HTML

---

## 🗺️ Documentation Map

### Step 1: Read `docs/ai/README.md`
That's the index. It lists all 25 AI docs organized by category. Read it first.

### Key Docs (bookmark these)
| File | When |
|------|------|
| `docs/ai/coding-procedures.md` | Before any edit |
| `docs/ai/html-edit-playbook.md` | Fixing structural HTML bugs |
| `docs/ai/solve-mistakes.md` | Debugging |
| `docs/ai/DECISIONS.md` | Understanding why we built it this way |
| `docs/ai/pages-directory.md` | Finding files |
| `docs/ai/architecture.md` | Understanding the stack |
| `docs/ai/supabase-edge-functions.md` | Edge functions catalog |
| `docs/ai/websocket-protocol.md` | WebSocket message contract |
| `docs/ai/ERROR-CODES.md` | Error catalog with recovery paths |
| `docs/ai/state-management.md` | Where every piece of data lives |
| `docs/ai/dependency-map.md` | JS load order and global dependencies |
| `docs/ai/css-theme-guide.md` | Editing CSS |
| `docs/ai/testing-checklist.md` | Before committing |
| `docs/ai/deploy-runbook.md` | Deploying |
| `docs/ai/auth-bypass-testing.md` | Testing locally without login |
| `docs/ai/glossary.md` | Understanding jargon |
| `docs/ai/CHANGELOG.md` | Fill in after each push |

### Per-Page Deep Dives
| File | Covers |
|------|--------|
| `docs/ai/caption-s8t.md` | `caption-s8t.html` — 496 lines of reference |
| `docs/ai/onboarding-s8t.md` | `onboarding.html` |
| `docs/ai/duo-s8t.md` | `duo-s8t.html` |
| `docs/ai/voc-explorer.md` | `panoramica.html` vocab features |
| `docs/ai/ai-s8t.md` | `ai-s8t.html` |

### Business & Strategy
| File | Purpose |
|------|---------|
| `docs/ai/business-info.md` | Company, pricing, Stripe |
| `docs/ai/financial-model.md` | Pricing, costs, revenue |
| `docs/ai/ideal-customer.md` | ICP, positioning |
| `docs/ai/brand-voice.md` | Tone, messaging |

### Tool Capabilities
| File | Purpose |
|------|---------|
| `docs/ai/firecrawl-capabilities.md` | Web search, scrape, monitor |
| `docs/ai/apify-capabilities.md` | Actor marketplace, social scrapers |
| `docs/ai/composio-capabilities.md` | 15 accounts + smart routing |

### Agent Skills
| Location | Purpose |
|----------|---------|
| `docs/skills/` | 16 categorized skills — frontend, backend, AI, data, productivity |
| `~/.agents/skills/` | 61 skills auto-discovered by Copilot — 14 superpowers + 29 domain + 18 others |

### External Docs
| File | Purpose |
|------|---------|
| `PRIVACY.md` | Privacy policy |
| `dev/WORKFLOW.md` | AI report prompt workflow |

---

## 🏗️ Project Identity

**Sottotitoli** (Italian: "Subtitles") — Real-time AI captioning + translation web app.
- **Live:** https://www.sottotitoli.pro (GitHub Pages: `buoninglese.github.io/sottotitoli`)
- **Stack:** Static HTML/CSS/JS. No build step. No framework.
- **UI Language:** Italian. Code comments: English.
- **Business:** Freemium. 15 min/week free. Prepaid credit packs via Stripe.
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
| File | Purpose |
|------|---------|
| `index.html` | Landing page — parallax slider, diagonal wipes |
| `panoramica.html` | Dashboard shell (~2,000 lines, 118KB) — 10 panels in `js/panoramica/panels/` |
| `caption-s8t.html` | Live captioning — 5 slides, word bank, grammar, ~8.9K lines |
| `traduzione-s8t.html` | Translation-focused caption variant |
| `duo-s8t.html` | DUO+ multi-speaker collaborative mode |
| `ai-s8t.html` | AI-powered voice iframe shell |
| `grammarhub.html` | Grammar practice hub |
| `onboarding.html` | New user onboarding wizard |
| `purchase.html` | Stripe checkout / pricing |
| `privacy.html` | Privacy Policy |
| `termini.html` | Terms of Service |

### Active JavaScript
| File | Role |
|------|------|
| `config.js` | All configuration (**GITIGNORED!**) |
| `config.example.js` | Config template for new setups |
| `js/auth.js` | Supabase Google OAuth (7 pages) |
| `js/theme-2.js` | Current theme — navbar, toggle, dropdowns (5 pages) |
| `js/i18n.js` | Language toggle IT↔EN (4 pages) |
| `js/notifications.js` | Supabase realtime notifications (3 pages) |
| `js/real-mic.js` | Mic + speech recognition (caption-s8t) |
| `translation-providers.js` | MyMemory + Google Translate (3 pages) |
| `ws-publisher.js` | WebSocket publishing (traduzione-s8t) |
| `js/cefr-*.js` | CEFR/GSE scoring (3 files, 2-3 pages each) |
| `js/traduzione/*.js` | Translation module (6 files, traduzione-s8t) |
| `js/panoramica/` | 17 ES modules — app.js router + 10 panels + 6 shared utils |

Full list: see `docs/ai/pages-directory.md`

### CSS Files
| File | Role |
|------|------|
| `css/theme-2.css` | Current shared theme (6 pages) |
| `css/panoramica.css` | Dashboard-specific styles |
| `css/review.css` | AI review display |
| `css/tailwind.min.css` | Compiled Tailwind utilities |
| `css/traduzione.css` | Translation page styles |
| `style.css` | Original Appland template (legacy, no conflicts) |

### Supabase
- **Project:** `qzqmuegbpmvqrjrlfbgk`
- **21 Edge Functions** — all synced between repo and production
- **Key Tables:** `profiles`, `sessions`, `user_vocabulary`, `token_transactions`, `ai_report_requests`, `session_ai_reports`
- **Column traps:** `transcript_text` NOT `transcript` · `wpm` NOT `wpm_avg` · `cefr_level` NOT `cefr`

### Voice Infrastructure
- `voice-core/` — shared source, 3 deployed HF Spaces: `hugging-voice/`, `hugging-voice-base/`, `hugging-voice-kokoro/`
- `sync_voice.py` — syncs shared files across all three

---

## 🎨 Design Quick Reference

| Element | Value |
|---------|-------|
| **UI Font** | Inter (400–900) |
| **Headline Font** | Manrope (500–800) |
| **Mono Font** | JetBrains Mono |
| **Day Mode** | Off-white (`#f0f6f8`), warm tones |
| **Night Mode** | Deep blue-black (`#0b151c`), cyan accents |
| **Buttons** | Pill-shaped (`border-radius: 100px`) |

Each page has its **own** `:root`/`[data-theme="dark"]` CSS variables. See `docs/ai/css-theme-guide.md`.

---

## 🧠 Repo Memory Files

Located in `/memories/repo/` — loaded automatically into AI agent context:

| File | Knowledge |
|------|-----------|
| `supabase-schema.md` | Verified column names (traps to avoid!) |
| `i18n-rules.md` | Leaf-span pattern — CRITICAL |
| `hugging-voice-rules.md` | 34 critical IDs, never remove them |
| `s2s-voice-pitfalls.md` | VAD bugs, STT truncation, flag formats |
| `caption-s8t-expert-guide.md` | Deep dive: 8K lines, 142 functions, 5 slides |

---

## 🔧 Git Workflow

```bash
git status                           # Check what changed
git add <files>                      # Stage (NEVER config.js!)
git commit -m "type: description"    # fix:, feat:, style:, refactor:, docs:, chore:
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
13. ❌ Add SRI integrity hashes to CDN links — they silently break when the CDN updates. (See `docs/ai/DECISIONS.md` ADR-009)
14. ❌ Skip div-balance check after HTML edits — a missing `</div>` on a `display:none` element can hide multiple panels with zero console errors. (See `docs/ai/DECISIONS.md` ADR-007)

---

## 📋 Quick Checklist (Before Every Commit)

- [ ] `node --check <file.js>` passed (or `get_errors` for HTML)
- [ ] Tested at desktop (1200px+) and mobile (375px)
- [ ] Tested day AND night mode
- [ ] No console errors
- [ ] `config.js` NOT staged
- [ ] Version bumped (if editing `panoramica.html`)
- [ ] Committed AND pushed
- [ ] `docs/ai/CHANGELOG.md` updated

---

*This file is the authoritative entry point. All other docs link back here.*
*See [docs/ai/README.md](docs/ai/README.md) for the full AI documentation index (25 files).*


