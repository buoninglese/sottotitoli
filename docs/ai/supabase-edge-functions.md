# supabase-edge-functions.md — Edge Functions Inventory

> **Complete catalog of all 20 Supabase edge functions.** What each does, which tables it touches, which external APIs it calls, and how they depend on each other.
>
> **Cross-refs:** `architecture.md` · `docs/DECISIONS.md` (ADR-004) · `deploy-runbook.md` · `../../AGENTS.md`
>
> **Supabase project:** `qzqmuegbpmvqrjrlfbgk`
> **Source:** `supabase/functions/`

---

## Function Dependency Graph

```
                    ┌─────────────────────┐
                    │   process-ai-reports │ ← orchestrator (scheduled)
                    └──────────┬──────────┘
                               │ calls
                    ┌──────────▼──────────┐
                    │   analyze-session    │
                    └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│ generate-grammar-   │────▶│   grammar-segment    │
│       report        │     └──────────┬──────────┘
└─────────────────────┘               │ calls
                                      ▼
                              ┌──────────────┐
                              │   HF Router   │
                              │  (Llama 3.3)  │
                              └──────────────┘

┌──────────────────┐      ┌──────────────────┐
│ create-checkout- │      │  stripe-webhook   │
│    session       │─────▶│ (checkout compl.) │
└──────────────────┘      └──────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────────────┐
│translate │  │translate- │  │ dictionary-proxy  │
│(proxy)   │  │ segment   │  │   vocab-lookup    │
└──────────┘  └──────────┘  └──────────────────┘
```

---

## Full Inventory

### AI & Reports (5 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 1 | `process-ai-reports` | GET/POST | **Orchestrator.** Processes queued AI report requests: fetches transcripts, loads module prompts, calls OpenAI, saves reports, deducts tokens | `ai_report_requests`, `sessions`, `profiles`, `ai_configs` | `ai_report_requests`, `session_ai_reports`, `sessions` (scores), `user_ai_entitlements` | OpenAI (gpt-4o) |
| 2 | `analyze-session` | POST | Runs OpenAI analysis against `ai_configs` row, generates rubric scores, strengths, issues, recommendations | `sessions`, `ai_configs` | `sessions` (ai_status), `session_ai_reports` | OpenAI Responses API |
| 3 | `generate-grammar-report` | POST | Full grammar pipeline: fetches transcript segments, calls `grammar-segment` for each line, aggregates errors by category, cross-references user profile | `grammar_reports`, `transcript_segments`, `profiles`, `user_preferences` | `grammar_reports` | Internal: `grammar-segment` |
| 4 | `grammar-segment` | POST | Server-side grammar correction via Llama 3.3 on HF (or LanguageTool fallback). Returns structured `GrammarResult` | `transcript_segments` | — | HF Router (Llama 3.3), LanguageTool |
| 5 | `starter-report` | POST | Personalized onboarding report in Italian: analysis, SMART objectives, focus areas, reliability, next-step | — (request body) | — (returns JSON) | OpenAI (gpt-4o-mini) |

### Payments & Credits (2 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 6 | `create-checkout-session` | POST | Creates Stripe Checkout session for 4 prepaid products | — | — | Stripe Checkout |
| 7 | `stripe-webhook` | POST | Handles `checkout.session.completed`: grants credits/tokens, processes referral bonuses (45 tokens each) | `credit_transactions`, `user_credits`, `user_tokens`, `referrals` | `user_credits`, `credit_transactions`, `user_tokens`, `token_transactions`, `referrals` | Stripe SDK (signature verify) |

### Rooms & Collaboration (3 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 8 | `create-room` | POST | Creates Traduzione room, adds owner as member, generates invite token | — (auth only) | `rooms`, `room_members`, `room_invites` | — |
| 9 | `create-invite` | POST | Generates SHA-256 hashed invite token, optionally revokes previous active invites | `room_members` | `room_invites` | — |
| 10 | `join-room` | POST | Validates invite token (SHA-256 comparison) and adds user to room via RPC | — (delegates to RPC) | `room_members`, `room_invites` (via RPC) | — |

### Translation & Dictionary (5 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 11 | `translate` | POST | Translation proxy with fallback chain: Google → MyMemory → passthrough. In-memory TTL cache | — | — | Google Translate, MyMemory |
| 12 | `translate-segment` | POST | Server-side segment translation via Google Cloud Translation (or NLLB for en↔it). Membership verified | `transcript_segments`, `room_members` | `segment_translations` | Google Cloud Translation, HF Inference |
| 13 | `dictionary-proxy` | GET | Proxies word lookups to Free Dictionary API with 7-day Supabase cache | `dictionary_cache` | `dictionary_cache` | Free Dictionary API |
| 14 | `vocab-lookup` | POST | Word definitions, synonyms, POS, phonetics for 7 languages. English: Free Dictionary + Datamuse. Non-English: Llama via HF | — | — | Free Dictionary, Datamuse, HF Router (Llama 3.1/3.3) |
| 15 | `diarize-speakers` | POST | GPT-4o-mini identifies which speaker (A/B/C) said each transcript line | — (request body) | — (returns JSON) | OpenAI (gpt-4o-mini) |

### Analytics & Notifications (3 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 16 | `process-session-analytics` | POST | Post-session: computes MATTR score, CEFR word breakdown, upserts vocabulary, updates analytics snapshot | `sessions`, `user_vocabulary`, `user_analytics_snapshot` | `sessions` (mattr, cefr counts, vocab_size), `user_vocabulary`, `user_analytics_snapshot` | — |
| 17 | `session-rewards` | POST | Generates milestone, streak, and motivational notifications based on session stats | `sessions` | `notifications` | — |
| 18 | `welcome-notification` | POST | Sends welcome notification on first login (zero existing notifications) | `notifications` | `notifications` | — |

### Infrastructure & Proxies (2 functions)

| # | Function | Method | What It Does | Reads | Writes | External APIs |
|---|----------|--------|-------------|-------|--------|---------------|
| 19 | `hf-proxy` | POST | Proxies LLM requests to HF Inference Providers (Cerebras). Hides `HF_TOKEN` from browser | — | — | HF Router (Gemma-4 on Cerebras) |
| 20 | `space-status` | GET | CORS proxy for checking HF Space runtime status (HF blocks cross-origin) | — | — | HF Spaces API |

---

## Database Tables by Function

| Table | Used By |
|-------|---------|
| `sessions` | analyze-session, process-ai-reports, process-session-analytics, session-rewards |
| `session_ai_reports` | analyze-session, process-ai-reports |
| `ai_report_requests` | process-ai-reports |
| `ai_configs` | analyze-session, process-ai-reports |
| `transcript_segments` | generate-grammar-report, grammar-segment, translate-segment |
| `grammar_reports` | generate-grammar-report |
| `segment_translations` | translate-segment |
| `profiles` | generate-grammar-report, process-ai-reports |
| `user_preferences` | generate-grammar-report |
| `user_vocabulary` | process-session-analytics |
| `user_analytics_snapshot` | process-session-analytics |
| `user_credits` | stripe-webhook |
| `credit_transactions` | stripe-webhook |
| `user_tokens` | stripe-webhook |
| `token_transactions` | stripe-webhook |
| `user_ai_entitlements` | process-ai-reports |
| `rooms` | create-room |
| `room_members` | create-room, create-invite, join-room, translate-segment |
| `room_invites` | create-room, create-invite, join-room |
| `referrals` | stripe-webhook |
| `notifications` | session-rewards, welcome-notification |
| `dictionary_cache` | dictionary-proxy |

---

## External API Usage

| API | Used By | Model / Endpoint |
|-----|---------|-----------------|
| **OpenAI** | analyze-session, diarize-speakers, process-ai-reports, starter-report | gpt-4o, gpt-4o-mini, Responses API |
| **HuggingFace Router** | grammar-segment, hf-proxy, translate-segment, vocab-lookup | Llama-3.3-70B, Llama-3.1-8B, Gemma-4-31B |
| **Stripe** | create-checkout-session, stripe-webhook | Checkout, Webhooks |
| **Google Translate** | translate, translate-segment | translate.googleapis.com |
| **MyMemory** | translate | api.mymemory.translated.net |
| **Free Dictionary** | dictionary-proxy, vocab-lookup | api.dictionaryapi.dev |
| **Datamuse** | vocab-lookup | api.datamuse.com |
| **LanguageTool** | grammar-segment (fallback) | api.languagetool.org |
| **HF Spaces** | space-status | huggingface.co/api/spaces |

---

## Cold-Start Notes

All functions run on Supabase's free tier. Cold starts are ~1–2 seconds for the first invocation after inactivity. Functions with LLM calls (OpenAI, HF Router) have additional latency from the model response time.

**Longest cold-start chains:**
1. `process-ai-reports` → `analyze-session` → OpenAI (~5–8s total)
2. `generate-grammar-report` → `grammar-segment` (× N segments) → HF Router (~3–6s per segment)

---

## Deployment

Functions are synced between `supabase/functions/` and production via Supabase CLI:

```bash
# Deploy a single function
supabase functions deploy analyze-session

# Deploy all functions
supabase functions deploy --no-verify-jwt
```

The `--no-verify-jwt` flag is used for functions called by other edge functions (internal HTTP calls).

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
