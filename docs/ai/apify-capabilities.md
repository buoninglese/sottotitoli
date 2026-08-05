# Apify MCP — What It Can Do & When I Use It

> Last updated: 2026-08-05 · Connected via: `https://mcp.apify.com` (OAuth)
> MCP Server: `@apify/actors-mcp-server` · Installed in VS Code

---

## Quick Decision Tree

```
You say something → I decide which Apify tool to use:

"search for Actors that..." / "find a scraper for..."     → search-actors
"what does this Actor do?" / "how do I configure it?"     → fetch-actor-details
"scrape Instagram / Twitter / Google / ..."                → call-actor (specific Actor)
"search the web for..." / "browse this page"               → apify/rag-web-browser
"get the results from that run"                            → get-dataset-items
"what's in my dataset?" / "show me the data"               → get-dataset-items
"how do I use Apify to..." / "what's the Apify API for..." → search-apify-docs
```

---

## Core Tools (16 tools in 4 categories)

### 🔍 Actor Discovery & Execution

| Tool | What It Does | When I Use It |
|------|-------------|---------------|
| **`search-actors`** | Search Apify Store for Actors by keyword | "find a scraper for LinkedIn", "what Actors extract YouTube comments" |
| **`fetch-actor-details`** | Get full details: input schema, README, pricing, stats | "how do I use the Instagram scraper", "what parameters does this Actor need" |
| **`call-actor`** | Run any Actor from Apify Store | "scrape the top 10 Google results for...", "extract tweets from @handle" |
| **`apify/rag-web-browser`** | Built-in: Google Search + scrape top pages → clean markdown | "search the web for latest AI news", "browse this article and summarize" |
| **`get-actor-output`** | Retrieve full output when preview is truncated | "get all results from that run" (after a call-actor returns partial data) |

### 📚 Documentation

| Tool | What It Does | When I Use It |
|------|-------------|---------------|
| **`search-apify-docs`** | Full-text search Apify + Crawlee documentation | "how do I deploy an Actor", "what's the Crawlee API for..." |
| **`fetch-apify-docs`** | Fetch complete docs page by URL | "show me the full page on Actor permissions" |

### 📊 Run Management

| Tool | What It Does | When I Use It |
|------|-------------|---------------|
| **`get-actor-run`** | Get status, stats, and storage IDs for a run | "is that scrape done yet?", "check the status of run X" |
| **`get-actor-run-list`** | List all runs of an Actor, filter by status | "show my recent Instagram scraper runs" |
| **`get-actor-log`** | Retrieve logs for a specific run | "why did that run fail?", "show me the error logs" |

### 💾 Storage (Datasets & Key-Value Stores)

| Tool | What It Does | When I Use It |
|------|-------------|---------------|
| **`get-dataset`** | Metadata about a dataset (item count, fields) | "how many items did that scrape produce" |
| **`get-dataset-items`** | Retrieve items with filtering, pagination, field selection | "show me the scraped results", "get only the URLs and titles" |
| **`get-dataset-schema`** | Generate JSON schema from dataset items | "what fields are in this dataset" |
| **`get-dataset-list`** | List all your datasets | "show me all my stored datasets" |
| **`get-key-value-store`** | Metadata about a KV store | "what's in this key-value store" |
| **`get-key-value-store-keys`** | List all keys in a KV store | "what keys are stored" |
| **`get-key-value-store-record`** | Get value for a specific key | "get the INPUT record from that run" |
| **`get-key-value-store-list`** | List all your KV stores | "show all my key-value stores" |

---

## Typical Workflows

### Workflow 1: Discover + Run a Scraper

```
You: "Scrape the top 10 tweets from @OpenAI"

1. search-actors("twitter scraper")         → Find the right Actor
2. fetch-actor-details("apify/twitter-scraper")  → Check input schema
3. call-actor("apify/twitter-scraper", {handle: "OpenAI", maxItems: 10})
4. get-dataset-items(datasetId)             → Read the results
```

### Workflow 2: Web Research

```
You: "Research competitors in AI captioning"

1. apify/rag-web-browser({query: "AI real-time captioning competitors 2026", maxResults: 5})
   → Returns markdown from top 5 Google results
```

### Workflow 3: Debug a Failed Run

```
You: "Why did my scrape fail?"

1. get-actor-run(runId, waitSecs: 0)       → Check status
2. get-actor-log(runId)                     → Read error logs
```

### Workflow 4: Look Up Apify Documentation

```
You: "How do I set up proxy rotation for my Actor?"

1. search-apify-docs("proxy rotation configuration")
2. fetch-apify-docs(url_from_search)        → Get full page
```

---

## Popular Actors (Examples)

Apify Store has 1,500+ Actors. Here are commonly used ones:

| Category | Popular Actors |
|----------|---------------|
| **Social Media** | `apify/instagram-scraper`, `apify/twitter-scraper`, `apify/tiktok-scraper`, `apify/facebook-posts-scraper` |
| **Search** | `apify/google-search-scraper`, `apify/brave-search-scraper` |
| **E-commerce** | `apify/amazon-scraper`, `apify/shopify-product-scraper` |
| **Web Scraping** | `apify/web-scraper`, `apify/cheerio-scraper`, `apify/puppeteer-scraper` |
| **YouTube** | `apify/youtube-scraper`, `apify/youtube-comments-scraper` |
| **Maps/Location** | `apify/google-maps-scraper`, `apify/tripadvisor-scraper` |
| **AI/Data** | `apify/rag-web-browser` (built-in), `apify/ai-text-analyzer` |

---

## RAG Web Browser — The Built-in Swiss Army Knife

This is the **default web tool** that comes with Apify MCP. It's like a web browser for AI — Google Search + scrape in one call.

**What it does:**
- Searches Google for a query, then scrapes the top N results
- Can also fetch individual URLs directly
- Returns clean Markdown (or text, HTML)
- Handles JavaScript-rendered pages
- Removes cookie banners, nav, footers automatically
- Timeout control (default 40s — good for OpenAI-compatible clients)

**Key parameters:**
| Param | Purpose |
|-------|---------|
| `query` | Search terms OR a direct URL |
| `maxResults` | How many top Google results to scrape (default: 3) |
| `outputFormats` | `markdown`, `text`, or `html` |
| `scrapingTool` | `browser-playwright` (JS-heavy) or `raw-http` (faster) |
| `requestTimeoutSecs` | Max time for the whole request (default: 40s) |

---

## How Apify Compares to Firecrawl

| Feature | Apify MCP | Firecrawl CLI |
|---------|-----------|---------------|
| **Web search + scrape** | `rag-web-browser` | `firecrawl search --scrape` |
| **Single URL scrape** | `rag-web-browser` (pass URL as query) | `firecrawl scrape <url>` |
| **Crawl entire site** | Via specific Actors (web-scraper) | `firecrawl crawl` |
| **Browser interaction** | Via specific Actors (puppeteer) | `firecrawl interact` |
| **Social media scraping** | ✅ Instagram, Twitter, TikTok, etc. | ❌ Not specialized |
| **E-commerce scraping** | ✅ Amazon, Shopify, etc. | ❌ Not specialized |
| **Monitor/alert on changes** | ❌ Not built-in | ✅ `firecrawl monitor` |
| **Parse local docs (PDF)** | ❌ Not built-in | ✅ `firecrawl parse` |
| **Academic paper search** | ❌ Not built-in | ✅ `firecrawl research` |
| **Developer code search** | ❌ Not built-in | ✅ `firecrawl developer` |
| **Docs search** | ✅ Apify/Crawlee docs | ✅ Firecrawl docs |
| **Actor marketplace** | ✅ 1,500+ pre-built Actors | ❌ N/A |

**Rule of thumb:**
- **Social media, e-commerce, maps, YouTube** → Apify (specialized Actors)
- **General web search, research, monitoring, local file parsing** → Firecrawl
- **Either works** → `rag-web-browser` (Apify) and `firecrawl search/scrape` (Firecrawl) overlap. Firecrawl has more options (monitor, deep research, developer search). Apify has the Actor marketplace for specialized targets.

---

## What Triggers Apify vs. What Doesn't

| You Say | Tool | Why |
|---------|------|-----|
| "find a scraper for Instagram" | `search-actors` | Actor discovery |
| "how does this Actor work" | `fetch-actor-details` | Actor documentation |
| "scrape 10 tweets from..." | `call-actor` + specific Actor | Structured extraction |
| "search the web for..." | `apify/rag-web-browser` | General web search |
| "get the results from that run" | `get-dataset-items` | Read output data |
| "why did my scrape fail" | `get-actor-log` | Debugging |
| "how do I use Apify to..." | `search-apify-docs` | Platform docs |
| "edit this file" | ❌ No Apify | Local code editing |
| "commit and push" | ❌ No Apify | Git operations |
| "run the dev server" | ❌ No Apify | Local dev |

---

## Storage Types Explained

Apify Actors produce two kinds of storage:

| Storage | What It Is | Access With |
|---------|-----------|-------------|
| **Dataset** | Append-only table of results (like a CSV/JSON array) | `get-dataset-items` |
| **Key-Value Store** | Key→value pairs (config, screenshots, binary files) | `get-key-value-store-record` |

Every Actor run creates at least one dataset and one KV store. The KV store's `INPUT` key holds the input that was passed to the Actor.

---

## Credit & Cost Notes

- Apify uses a **pay-per-use** model — each Actor run consumes platform credits
- Some Actors are **free**, others cost credits per result or per run
- Check Actor pricing with `fetch-actor-details` before running
- Agentic payments (x402/Skyfire) are also available for autonomous payment
