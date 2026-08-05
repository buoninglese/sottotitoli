# Composio — Connected Accounts & What I Can Do

> Last updated: 2026-08-05 · 15 accounts connected via [connect.composio.dev](https://connect.composio.dev)
> Session: `type` (GitHub Copilot MCP)

---

## ⚡ "Use Composio" — Smart Routing Protocol

When the user says **"use Composio"** or **"check my stack"**, do NOT just look at Composio accounts. Scan the ENTIRE installed tool surface and propose the BEST tool for the job:

```
Full Stack Available:
┌─ Composio MCP (15 SaaS accounts — all free)
├─ Firecrawl CLI (web search, scrape, monitor, parse, research — credit-based)
├─ Apify MCP (1,500+ Actors — credit/cost per Actor)
└─ Hugging Face MCP (models, datasets, Spaces — free)
```

### Credit-Aware Decision Rules

**Before suggesting ANY tool that costs credits, check current balances:**

| Platform | How to Check | Current Balance |
|----------|-------------|-----------------|
| Firecrawl | `firecrawl --status` | ~1,372 credits |
| Apify | Check dashboard or Actor pricing | Varies per Actor |
| DeepSeek | Composio connection info | $15.10 |

**Decision logic (in order of priority):**

1. **No credits?** → Skip paid tools entirely. Propose the best free alternative. Warn: "X has 0 credits — using Y (free) instead."
2. **Free tool is 80% as good?** → Prefer the free one. Mention the paid option exists if they want better results.
3. **Paid tool is clearly better AND has credits?** → Propose it with exact cost estimate. Use it without asking for small costs (≤5 credits or ≤$0.50). Ask for anything larger.
4. **Would burn >20% of remaining credits?** → Warn: "This would use X credits (Y% of your balance). Proceed?"
5. **Composio SaaS tools (Gmail, GitHub, Stripe, etc.)** → Always free. Use immediately, no questions.

### Routing Decision Matrix

| User Wants To | Best Tool | Why | Cost | Fallback (if no credits) |
|--------------|-----------|-----|------|--------------------------|
| Search the web | **Firecrawl search** | Full page content | ~1 credit | Apify RAG Web Browser (via Composio, free if Apify has credits) |
| Scrape a known URL | **Firecrawl scrape** | Clean markdown, JS | ~1 credit | Apify Web Scraper |
| Crawl a whole site | **Firecrawl crawl** | Concurrent, filtering | ~1 credit/page | Apify site crawler Actor |
| Monitor for changes | **Firecrawl monitor** | AI judge, alerts | Credits/check | Manual scrape (remind user) |
| Parse local PDF/DOCX | **Firecrawl parse** | Convert to markdown | ~1 credit | None — warn user |
| Search academic papers | **Firecrawl research** | Semantic, citations | Free | — |
| Search developer issues | **Firecrawl developer** | GitHub issues, PRs | Free | — |
| Scrape social media | **Apify** (specific Actor) | Purpose-built | Varies | None — warn user |
| Structured extraction | **Apify/Firecrawl agent** | Schema JSON | Credits | Manual scrape + parse |
| Read/send Gmail | **Composio Gmail** | OAuth | Free | — |
| GitHub issues/PRs | **Composio GitHub** | Full repo mgmt | Free | — |
| Query Supabase DB | **Composio Supabase** | Direct SQL | Free | — |
| Stripe payments/customers | **Composio Stripe** | Revenue, subs | Free | — |
| Bug tracking | **Composio Linear** | Dev PM | Free | — |
| Error monitoring | **Composio PostHog** | JS errors | Free tier | — |
| Website analytics | **Composio Google Analytics** | Traffic, funnels | Free | — |
| AI text generation | **Composio DeepSeek** | Chat, drafts | ~$0.50-2 | Hugging Face (free, less polished) |
| AI image generation | **Hugging Face** (Spaces) | SD, FLUX | Free | — |
| AI TTS / voice | **Hugging Face** (Spaces) | Voice models | Free | — |
| Google Workspace | **Composio** (Docs/Sheets/Calendar) | CRUD | Free | — |

### Response Format When User Says "Use Composio"

Always respond with:
1. **Best tool** for the job (scanned from full stack)
2. **Why** it's the best
3. **Cost** — free, exact credits, or estimated API cost
4. **Fallback** if paid tool has no credits

Example:
> "Best: **Firecrawl scrape** (~1 credit). You have 1,372 credits — fine. Free fallback: Apify RAG Web Browser via Composio."

If credits are low or tool is expensive:
> "⚠️ **Firecrawl crawl** would use ~50 credits (3.6% of balance). You have enough, but for this use case **Apify's site crawler** might be cheaper. Want me to check?"

---

## All Connected Accounts

| # | Toolkit | Account | What I Can Do |
|---|---------|---------|---------------|
| 1 | **Gmail** | sebastianspersonalassistant@gmail.com | Read/send emails, search inbox, manage labels |
| 2 | **GitHub** | buoninglese | Create issues/PRs, manage repos, read code |
| 3 | **Supabase** | qzqmuegbpmvqrjrlfbgk | Query DB, manage tables, run edge functions, auth |
| 4 | **Firecrawl** | API key (1,372 credits) | Web search, scrape, crawl, monitor, parse |
| 5 | **Apify** | API token | Run Actors, scrape social media, access storage |
| 6 | **Google Docs** | sebastianspersonalassistant@gmail.com | Create/edit docs |
| 7 | **Google Sheets** | sebastianspersonalassistant@gmail.com | Read/write spreadsheets |
| 8 | **Google Calendar** | sebastianspersonalassistant@gmail.com | Manage events, check availability |
| 9 | **Google Drive** | sebastianspersonalassistant@gmail.com | Upload/download files, manage folders |
| 10 | **Google Tasks** | sebastianspersonalassistant@gmail.com | Create/manage task lists |
| 11 | **Stripe** | sebastian@buoninglese.com | Check payments, subscriptions, customers, products |
| 12 | **Linear** | sebastianspersonalassistant@gmail.com | Create issues, manage projects, track bugs |
| 13 | **PostHog** | Connected | Error monitoring, user analytics, funnels |
| 14 | **DeepSeek** | $15.10 balance | AI text generation, chat completion |
| 15 | **Google Analytics** | Connected | Run reports, check traffic, funnels |

---

## What I Can Do By Category

### 🏗️ Sottotitoli Development

| Task | Toolkit | Example |
|------|---------|---------|
| Track bugs & features | **Linear** | "Create a Linear issue for the session duration bug" |
| Query user data | **Supabase** | "How many paid users this week?" |
| Run DB migrations | **Supabase** | "Add a new column to the profiles table" |
| Check Stripe payments | **Stripe** | "Show me this month's subscription revenue" |
| View customer info | **Stripe** | "What plan is sebastian@buoninglese.com on?" |
| Create checkout links | **Stripe** | "Generate a checkout session for the annual plan" |
| Manage GitHub repos | **GitHub** | "Create a PR for the panoramica fix" |
| Monitor errors | **PostHog** | "Are there any new JS errors since deploy?" |
| Check user behavior | **PostHog** | "What's the drop-off rate in the onboarding flow?" |
| Run analytics reports | **Google Analytics** | "How many visitors from Italy this month?" |
| Search competitor info | **Firecrawl** | "Search for new AI captioning competitors" |
| Scrape competitor sites | **Apify** | "Scrape pricing from competitor X" |

### 📧 Communication & Productivity

| Task | Toolkit | Example |
|------|---------|---------|
| Check email | **Gmail** | "Any Stripe payment failure emails today?" |
| Send email | **Gmail** | "Send a welcome email to new user X" |
| Schedule meetings | **Google Calendar** | "Schedule a deploy review for Friday" |
| Create docs | **Google Docs** | "Write a post-mortem for the v163 bug" |
| Build spreadsheets | **Google Sheets** | "Export this month's user signups to a sheet" |
| Track todos | **Google Tasks** | "Add 'Update Stripe webhook' to my task list" |
| Store files | **Google Drive** | "Upload the latest error log" |
| AI text generation | **DeepSeek** | "Draft an announcement for the new feature" |

### 🕸️ Web Research & Data

| Task | Toolkit | Example |
|------|---------|---------|
| Web search + scrape | **Firecrawl** | "Research best practices for WebSocket scaling" |
| Multi-page extraction | **Firecrawl crawl** | "Crawl the Supabase realtime docs" |
| Social media scraping | **Apify** | "Scrape tweets about Whisper alternatives" |
| Monitor changes | **Firecrawl monitor** | "Alert me when OpenAI changes Whisper pricing" |
| Structured extraction | **Firecrawl agent** / **Apify** | "Extract all pricing tiers from competitor X as JSON" |
| Parse local docs | **Firecrawl parse** | "Convert this PDF research paper to markdown" |
| Academic papers | **Firecrawl research** | "Find papers on real-time speech translation" |

---

## When to Use Which

### Firecrawl CLI vs. Firecrawl (Composio) vs. Apify (Composio)

| Need | Tool | Why |
|------|------|-----|
| Quick web search from terminal | `firecrawl search` (CLI) | Fast, direct |
| Web search from Copilot chat | Firecrawl (Composio) | Integrated |
| Specialized scraper (Instagram, etc.) | Apify (Composio) | Purpose-built Actors |
| General scraping | Either Firecrawl | Overlap — either works |
| Monitor for changes | Firecrawl CLI | `monitor` not available via Composio |
| Local file parsing | Firecrawl CLI | `parse` is CLI-only |
| Academic papers | Firecrawl CLI | `research` is CLI-only |

### Supabase: Direct MCP vs. Composio

| Need | Tool | Why |
|------|------|-----|
| Quick queries from Copilot | Supabase (Composio) | OAuth, no config |
| Full management, edge functions | Supabase MCP (separate) | More tools, direct access |

---

## Anti-Triggers

When I should NOT use Composio tools:

| You Say | Response |
|---------|----------|
| "Edit this file" | Local file edit — no Composio needed |
| "Commit and push" | Git CLI — no Composio needed |
| "Run the dev server" | Terminal — no Composio needed |
| "Fix this bug in my code" | Direct code edit — but I may query Supabase or Linear for context |

---

## MCP Servers Outside Composio

These are installed as separate VS Code MCP servers (bypass Composio):

| Server | Status | Notes |
|--------|--------|-------|
| **Hugging Face** | Installed, needs restart | `https://huggingface.co/mcp?login` — browser OAuth |
| **Apify** (direct) | Installed with token input | Separate from Composio Apify — more granular storage/run tools |

---

## Quick Reference: What You Say → What I Use

```
"check my email"              → Gmail (Composio)
"create a GitHub issue"       → GitHub (Composio)
"query the database"          → Supabase (Composio)
"check Stripe payments"       → Stripe (Composio)
"track this bug in Linear"    → Linear (Composio)
"any new JS errors?"          → PostHog (Composio)
"draft an email"              → Gmail (Composio)
"generate some text"          → DeepSeek (Composio)
"check website traffic"       → Google Analytics (Composio)
"schedule a meeting"          → Google Calendar (Composio)
"search the web"              → Firecrawl CLI or Firecrawl (Composio)
"scrape Instagram"            → Apify (Composio)
"monitor this page"           → Firecrawl CLI
"parse this PDF"              → Firecrawl CLI
"use a Hugging Face model"    → Hugging Face MCP (separate)
```
