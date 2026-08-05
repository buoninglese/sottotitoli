# glossary.md — Terminology & Acronyms

> **Cross-refs:** `architecture.md` · `pages-directory.md` · `brand-voice.md` · `AGENTS.md`

---

## Product Terms

| Term | Meaning |
|------|---------|
| **Sottotitoli** | Full product name. Italian: "Subtitles." |
| **sottotitoli.pro** | Premium tier branding. Always lowercase with dot. |
| **Panoramica** | Main dashboard (`panoramica.html`). "Overview." |
| **Caption-S8T** | Next-gen caption interface (`caption-s8t.html`). |
| **DUO+** | Multi-speaker collaborative mode. |
| **Il tuo viaggio** | "Your journey" — learning progress tracker. |

## In-App Currency

| Term | Meaning |
|------|---------|
| **Voice Credits (VC)** | In-app currency for paid features. |
| **Minuti** | Caption minutes. 15 min/week free. |
| **Token / Crediti report** | AI report generation credits. |

## Technical

| Acronym | Full |
|---------|------|
| **STT** | Speech-to-Text |
| **TTS** | Text-to-Speech |
| **VAD** | Voice Activity Detection |
| **CEFR** | Common European Framework (A1-C2) |
| **GSE** | Global Scale of English (10-90) |
| **NGSL** | New General Service List (vocab) |
| **POS** | Part of Speech |
| **NLP** | Natural Language Processing |
| **RLS** | Row-Level Security (Supabase) |

## CSS/Design

| Term | Meaning |
|------|---------|
| **Day mode** | Light theme. Off-white, warm purples. |
| **Night mode** | Dark theme. Deep blue→blackish, cyan accents. |
| **Caption variant** | Live caption box style: 5 (Glass), 6 (Cinema), 7 (Neon). |
| **V20quint** | Transcript system in caption-s8t.html. `window.v20q`. |
| **Pill button** | Rounded button (`border-radius: 100px`). |

## Database (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to auth.users) |
| `sessions` | Recording sessions with metrics |
| `user_vocabulary` | Saved words with CEFR levels |
| `token_transactions` | Credit purchase history |
| `ai_report_requests` | AI report generation queue |
| `session_ai_reports` | Generated AI reports |

## Files

| Term | Meaning |
|------|---------|
| `config.js` | Gitignored production config. |
| `AGENTS.md` | Primary agent reference file. |
| `DESIGN.md` | Visual design system. |
| `i18n` | Italian↔English language toggle. |
| **leaf-span** | i18n pattern: `data-i18n` on leaf element only. |

---

*→ Next: `architecture.md` for how these pieces connect*
*→ Related: `pages-directory.md` for file-by-file mapping*
