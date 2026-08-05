# glossary.md — Sottotitoli Terminology & Acronyms

> **For any AI agent who needs to understand the project's vocabulary.**
> These terms are used across the codebase, UI, and documentation.

---

## Product Terms

| Term | Meaning |
|------|---------|
| **Sottotitoli** | Full product name. Italian for "Subtitles." |
| **sottotitoli.pro** | Premium tier branding. Always lowercase with dot. |
| **Panoramica** | The main dashboard (`panoramica.html`). Italian for "Overview." |
| **Caption-S8T** | Next-gen caption interface (`caption-s8t.html`). "S8T" = abbreviation of "Sottotitoli." |
| **DUO+** | Multi-speaker collaborative mode (in `duo-s8t.html` and caption-s8t DUO+ module). |
| **Il tuo viaggio** | "Your journey" — the user's learning progress tracker. |

---

## In-App Currency

| Term | Meaning |
|------|---------|
| **Voice Credits (VC)** | The in-app currency displayed to users. Covers caption minutes and AI report tokens. |
| **Minuti** | Minutes of captioning time. 15 min/week free. Paid packs: 3000 min (50h). |
| **Token / Crediti report** | AI report generation credits. 90-token packs available. |
| **Piano gratuito** | Free tier. 15 min/week. |

---

## Technical Acronyms

| Acronym | Full Form | Context |
|---------|-----------|---------|
| **STT** | Speech-to-Text | Audio → text transcription |
| **TTS** | Text-to-Speech | Text → audio synthesis |
| **VAD** | Voice Activity Detection | Detecting when someone is speaking |
| **CEFR** | Common European Framework of Reference | Language proficiency levels: A1, A2, B1, B2, C1, C2 |
| **GSE** | Global Scale of English | Numeric proficiency scale (10–90), more granular than CEFR |
| **NGSL** | New General Service List | Core English vocabulary list |
| **POS** | Part of Speech | Grammatical category: noun, verb, adjective, etc. |
| **NLP** | Natural Language Processing | compromise.js library used for POS tagging |
| **WS** | WebSocket | Real-time communication protocol |
| **RLS** | Row-Level Security | Supabase database access control |
| **PWA** | Progressive Web App | Mobile-app-like web experience |

---

## CSS/Design Terms

| Term | Meaning |
|------|---------|
| **Day mode** | Light theme (`data-theme="light"`). Off-white backgrounds, warm purples. |
| **Night mode** | Dark theme (`data-theme="dark"`). Deep blue→blackish, cyan accents. |
| **Caption variant** | Live caption box visual style. Variants: 5 (Glass), 6 (Cinema), 7 (Neon). |
| **V20quint** | Transcript rendering system in caption-s8t.html. `window.v20q` object. |
| **Slide panel** | Horizontal scroll snap panels in caption-s8t.html (5 panels). |
| **Pill button** | Rounded button style (`border-radius: 100px`). |

---

## Database Terms

| Term | Meaning |
|------|---------|
| **Supabase** | Backend-as-a-service: auth, database, 21 edge functions, realtime. |
| **Edge Function** | Serverless functions running on Supabase (Deno runtime). |
| **profiles** | User profile table (linked to `auth.users`). |
| **sessions** | Recording session table with metrics. |
| **user_vocabulary** | Saved words with CEFR levels. |
| **token_transactions** | Credit purchase history. |
| **user_token_ledger** | Current credit balances. |

---

## File/Code Terms

| Term | Meaning |
|------|---------|
| **config.js** | Gitignored production config. Template: `config.example.js`. |
| **AGENTS.md** | Agent handoff file — the primary reference for AI agents. |
| **CLAUDE.md** | Redirect stub → AGENTS.md. |
| **i18n** | Internationalization — Italian↔English language toggle system. |
| **leaf-span pattern** | i18n rule: `data-i18n` MUST go on a leaf element with no children. |

---

## External Services

| Service | Role |
|---------|------|
| **GitHub Pages** | Frontend hosting (free) |
| **Render** | WebSocket relay + Learning API backend |
| **Supabase** | Auth, database, edge functions, realtime |
| **Stripe** | Payment processing (test mode) |
| **MyMemory** | Free translation API |
| **Google Translate** | Translation fallback |
| **OpenAI** | Whisper STT + GPT AI reports |
| **Font Awesome 6** | Icon library (free tier CDN) |
| **Google Fonts** | Inter, Manrope, JetBrains Mono, Cormorant Garamond |
| **compromise** | NLP library for POS tagging (v14) |

---

*Last updated: 2026-08-05*
