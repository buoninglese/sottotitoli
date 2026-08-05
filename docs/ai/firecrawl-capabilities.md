# Firecrawl — What It Can Do & When I Use It

> Last updated: 2026-08-05 · API key: `fc-d0fb42...` · Credits: 1,400

---

## Quick Decision Tree

```
You say something → I decide which Firecrawl tool to use:

"search for X" / "find articles about Y"           → firecrawl search
"scrape this URL" / "get the content of..."         → firecrawl scrape
"crawl the docs at..." / "get all pages under..."   → firecrawl crawl
"map this site" / "what pages are on..."            → firecrawl map
"click the..." / "fill out the form" / "log in"     → firecrawl interact
"parse this PDF/DOCX" / "read this file"            → firecrawl parse
"download the site" / "save offline copy"           → firecrawl download
"monitor this page" / "alert me when..."            → firecrawl monitor
"extract structured data" / "as JSON"               → firecrawl agent
"deep research on..." / "write a report about..."   → firecrawl deep-research
"find papers about..." / "literature review"        → firecrawl research-index
"why does this code..." / "what's the error..."     → firecrawl developer-index
"SEO audit" / "QA the site" / "lead list" / etc.   → firecrawl-workflows
```

---

## Core Tools (CLI — Live Web Work)

These are what I use when you ask me to get web data *right now* during our session.

### 1. `firecrawl search` — Web Search

**What it does:** Searches the web and returns results with optional full-page content (not just snippets). Can also search developer sources (GitHub issues, PRs, READMEs, docs).

**When I use it — you say things like:**
- "search for the latest AI news"
- "find articles about Italian language learning apps"
- "look up WebSocket performance benchmarks"
- "what are people saying about OpenAI Whisper alternatives"
- "find recent papers on real-time speech recognition"
- "search GitHub for firecrawl issues about rate limiting" (developer search)

**Command pattern:**
```bash
firecrawl search "query" --scrape --limit 5 -o .firecrawl/results.md
firecrawl search "query" --sources news --tbs qdr:d -o .firecrawl/news.md
firecrawl developer "query" --limit 10 -o .firecrawl/dev-results.json --json
```

---

### 2. `firecrawl scrape` — Single Page Extraction

**What it does:** Extracts clean markdown from any URL — handles static pages, JS-rendered SPAs, and even public PDFs/DOCXs at URLs. Returns LLM-optimized markdown.

**When I use it — you say things like:**
- "scrape the pricing page of stripe.com"
- "grab the content from this URL"
- "fetch this page"
- "get the page at https://..."
- "pull the content from..."
- "read this webpage"
- "what does this page say"

**Command pattern:**
```bash
firecrawl scrape "https://example.com" -o .firecrawl/page.md
firecrawl scrape "https://example.com" --only-main-content -o .firecrawl/page.md
firecrawl scrape "https://example.com/pricing" --query "What is the enterprise price?"
```

---

### 3. `firecrawl crawl` — Bulk Site Extraction

**What it does:** Crawls an entire site or section following links. Extracts many pages at once with depth/path control.

**When I use it — you say things like:**
- "crawl the docs at..."
- "get all the pages under /docs"
- "extract everything from the help center"
- "bulk extract from..."
- "crawl all blog posts from..."

**Command pattern:**
```bash
firecrawl crawl "https://docs.example.com" --include-paths /api --limit 50 --wait -o .firecrawl/crawl.json
```

---

### 4. `firecrawl map` — URL Discovery

**What it does:** Discovers and lists all URLs on a site, with optional search filtering. Find a needle in a haystack.

**When I use it — you say things like:**
- "map the site at..."
- "find the URL for authentication docs on..."
- "what pages are on example.com"
- "list all pages under /blog"
- "I know the site but not the exact page"

**Command pattern:**
```bash
firecrawl map "https://docs.example.com" --search "authentication" -o .firecrawl/urls.txt
firecrawl map "https://example.com" --limit 500 --json -o .firecrawl/urls.json
```

---

### 5. `firecrawl interact` — Browser Automation

**What it does:** Controls a live browser session — clicks buttons, fills forms, navigates flows, handles logins. Use when scraping alone isn't enough.

**When I use it — you say things like:**
- "click the login button"
- "fill out the form with..."
- "log in to..."
- "sign in and then..."
- "go to amazon, search for keyboards, filter by Prime"
- "navigate through the checkout flow"
- "handle the pagination"
- "scrape failed because the content is behind a button"

**Command pattern:**
```bash
firecrawl scrape "https://example.com"
firecrawl interact --prompt "Click the login button"
firecrawl interact --prompt "Fill in email with test@example.com"
firecrawl interact stop
```

---

### 6. `firecrawl parse` — Local Document Conversion

**What it does:** Converts local files (PDF, DOCX, XLSX, HTML, etc.) into clean markdown. Can also generate AI summaries or answer questions about the document.

**When I use it — you say things like:**
- "parse this PDF"
- "convert this document to markdown"
- "read this file"
- "extract text from this DOCX"
- "summarize this PDF"
- "what does this spreadsheet say"

**Command pattern:**
```bash
firecrawl parse ./report.pdf -o .firecrawl/report.md
firecrawl parse ./paper.pdf -S -o .firecrawl/summary.md       # AI summary
firecrawl parse ./doc.pdf -Q "What are the main findings?" -o .firecrawl/qa.md
```

---

### 7. `firecrawl download` — Full Site Download

**What it does:** Downloads an entire site as local files (markdown, screenshots, or multiple formats). Combines map + scrape.

**When I use it — you say things like:**
- "download the site for offline use"
- "save this documentation locally"
- "download all the docs"
- "save for reference"
- "I want a local copy of..."

**Command pattern:**
```bash
firecrawl download https://docs.example.com --screenshot --limit 20 -y
firecrawl download https://docs.example.com --include-paths "/features,/sdks" -y
```

---

### 8. `firecrawl monitor` — Change Detection & Alerts

**What it does:** Watches pages for changes and notifies by webhook or email. Can also monitor the *web itself* for new results matching a query. Uses AI to filter noise — only alerts on real content changes.

**When I use it — you say things like:**
- "monitor this page for changes"
- "alert me when the pricing changes"
- "watch for new job postings"
- "track this competitor's changelog"
- "notify me when a new blog post appears"
- "email me if this page changes"
- "monitor the web for new product launches in AI captioning"
- "ping me when..."

**Command pattern:**
```bash
firecrawl monitor create --name "Competitor Pricing" --schedule "daily at 9:00" \
  --goal "Alert when pricing tiers or plan names change" \
  --page https://competitor.com/pricing \
  --email alerts@example.com
```

---

### 9. `firecrawl agent` — Autonomous Structured Extraction

**What it does:** AI-powered agent navigates complex multi-page sites and extracts structured JSON data. Takes 2-5 minutes but handles what manual scraping can't.

**When I use it — you say things like:**
- "extract all pricing tiers as JSON"
- "get all the products from this site"
- "pull structured data from..."
- "extract as JSON with a schema"
- "give me all the listings in a table"

**Command pattern:**
```bash
firecrawl agent "extract all pricing tiers" --wait -o .firecrawl/pricing.json
firecrawl agent "extract products" \
  --schema '{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}}}' \
  --wait -o .firecrawl/products.json
```

---

### 10. `firecrawl developer` — Code Question Answering

**What it does:** Searches GitHub issues, merged PRs, READMEs, and curated docs to answer programming questions from primary sources.

**When I use it — you say things like:**
- "why does this error happen in React"
- "what's the bug with..."
- "how do I fix this Python error"
- "is this a known issue in..."
- "find the PR that changed this behavior"

**Command pattern:**
```bash
firecrawl developer "Supabase realtime subscription memory leak" --limit 10
```

---

### 11. `firecrawl research` — Academic Paper Search

**What it does:** Searches a scientific paper index by semantic query. Can find related papers, inspect metadata, and read full-text passages.

**When I use it — you say things like:**
- "find papers about real-time speech translation"
- "literature review on Whisper model accuracy"
- "search for papers about..."
- "what's the latest research on..."
- "find related papers to this one"

**Command pattern:**
```bash
firecrawl research search-papers "real-time speech recognition transformer" --k 10
firecrawl research inspect-paper <paper-id>
firecrawl research read-paper <paper-id> --question "What accuracy did they achieve?"
firecrawl research related-papers <id> --intent "state of the art methods"
```

---

## Workflow Skills (Deliverables)

These produce finished artifacts — not just raw data. I use them when you want a report, audit, list, or other completed deliverable.

| Workflow Skill | What It Produces | Use When You Say |
|----------------|-----------------|------------------|
| **Deep Research** | Cited analytical report with executive summary | "do deep research on...", "write a research report about..." |
| **SEO Audit** | Site structure + on-page SEO + keyword opportunities | "audit the SEO of...", "check my site's SEO" |
| **QA** | Live-site QA report with bugs and screenshots | "QA test this site", "check for bugs on..." |
| **Lead Research** | Pre-meeting company/person intelligence brief | "research this company before my call", "brief me on..." |
| **Lead Gen** | Structured prospect list as JSON/CSV | "find leads in...", "generate a prospect list" |
| **Competitive Intel** | Competitor pricing, features, changelog monitoring | "track competitors", "compare pricing with..." |
| **Market Research** | Market, financial, and industry analysis | "market research on...", "industry trends in..." |
| **Knowledge Base** | LLM-ready markdown from web sources | "build a knowledge base from...", "create RAG docs" |
| **Website Design Clone** | DESIGN.md with colors, fonts, components | "clone the design of...", "extract the design system" |
| **Demo Walkthrough** | Structured UX/product walkthrough | "walk through the signup flow of...", "UX teardown of..." |
| **Shop** | Product comparison and recommendations | "find the best...", "compare products..." |
| **Dashboard Reporting** | Metrics from analytics dashboards | "pull metrics from my dashboard", "cross-platform report" |

---

## Escalation Pattern

When you ask for web data, I follow this order:

```
1. SEARCH   — No URL? Search first to discover pages
2. SCRAPE   — Have a URL? Extract its content
3. MAP      — Large site, don't know which page? Map + search to find it
4. CRAWL    — Need ALL pages under a section? Bulk crawl
5. MONITOR  — Need recurring checks? Set a monitor (not repeated scrapes)
6. INTERACT — Page needs clicks, forms, or login? Browser automation
```

---

## What Triggers Firecrawl vs. What Doesn't

| You Say | Tool | Why |
|---------|------|-----|
| "search for..." | `search` | Discovery, no URL |
| "scrape this URL" | `scrape` | Single known URL |
| "get all pages from..." | `crawl` | Bulk, same site |
| "find the docs page for..." | `map --search` + `scrape` | Know site, not page |
| "click the button / fill the form" | `interact` | Browser action needed |
| "parse this PDF on my computer" | `parse` | Local file, not URL |
| "save this site offline" | `download` | Bulk local save |
| "alert me when this changes" | `monitor` | Recurring, notifications |
| "extract as structured JSON" | `agent` | Structured, multi-page |
| "why does this error happen" | `developer` | Code question, primary source |
| "find papers about..." | `research` | Academic/scientific |
| "write a report on..." | `deep-research` workflow | Deliverable, not raw data |
| "edit this file" | ❌ No Firecrawl | Local code editing |
| "commit and push" | ❌ No Firecrawl | Git operations |
| "run the dev server" | ❌ No Firecrawl | Local development |
| "fix this bug in my code" | ❌ No Firecrawl | Code changes |

---

## Output Files

All Firecrawl output goes to `.firecrawl/` (gitignored). I always use `-o` to save to disk rather than streaming to stdout — some outputs are hundreds of KB.

```
.firecrawl/
├── install-check.md      # Smoke test
├── results.md            # Search results
├── page.md               # Scraped page
├── crawl.json            # Crawl output
├── urls.txt              # Mapped URLs
├── report.md             # Parsed document
├── pricing.json          # Agent extraction
└── ...
```

---

## Credit Awareness

- **Current:** 1,400 credits (140% of cycle limit)
- **Costs:** ~1 credit per scrape/parse page. `--query` costs 5 extra credits. Agent mode costs more.
- **Check before large operations:** `firecrawl credit-usage`
- **Keyless fallback:** Available for search, scrape, interact, parse (rate-limited). Prefer API key.
