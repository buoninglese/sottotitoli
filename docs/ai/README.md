# docs/ai/ — AI Agent Documentation System

> **🔒 INTERNAL — For AI agents only. Not for public distribution.**
> Blocked from search engines via `robots.txt`. Blocked on local dev via `serve.py`.

---

## 📚 Reading Order (New Agents)

| # | File | Why |
|---|------|-----|
| 1 | `../../AGENTS.md` | Hub — project identity, quickstart, key files |
| 2 | `glossary.md` | Understand the vocabulary first |
| 3 | `architecture.md` | How the pieces fit together |
| 4 | `pages-directory.md` | What every file does |
| 5 | `coding-procedures.md` | How to safely edit code |
| 6 | `html-edit-playbook.md` | Debugging structural HTML: div balance, nesting, orphans |
| 7 | `solve-mistakes.md` | Bugs we've already fixed |
| 8 | `css-theme-guide.md` | Theming system |
| 9 | `testing-checklist.md` | What to check before committing |
| 10 | `deploy-runbook.md` | How to ship it |

---

## 📋 Full File Index (35 files)

### Core Procedures
| File | Lines | Purpose |
|------|-------|---------|
| `coding-procedures.md` | 192 | Safe HTML/CSS/JS editing rules |
| `html-edit-playbook.md` | NEW | 10 techniques for div-balance debugging, decision tree, real examples |
| `testing-checklist.md` | 159 | 11-section pre-commit checklist |
| `deploy-runbook.md` | 237 | All deployment procedures |
| `solve-mistakes.md` | 374 | 13 documented bugs with fixes |
| `auth-bypass-testing.md` | NEW | Testing authenticated pages locally without login |

### Architecture & Pages
| File | Lines | Purpose |
|------|-------|---------|
| `architecture.md` | 153 | System diagram, data flows, WebSocket contract |
| `supabase-edge-functions.md` | NEW | 20 edge functions catalog: tables, APIs, dependencies, cold starts |
| `pages-directory.md` | 95 | Complete page index with statuses |
| `dependency-map.md` | NEW | JS load order, global dependency matrix, CDN deps |
| `state-management.md` | NEW | Where data lives: localStorage vs Supabase vs in-memory |

### Design & Theming
| File | Lines | Purpose |
|------|-------|---------|
| `css-theme-guide.md` | 223 | Day/night theming, CSS file map |
| `brand-voice.md` | 126 | Tone, messaging, copy rules |

### Per-Page Deep Dives
| File | Lines | Covers |
|------|-------|--------|
| `caption-s8t.md` | 496 | `caption-s8t.html` — 142 functions, 5 slides, word bank |
| `onboarding-s8t.md` | 423 | `onboarding.html` — every slide, function, data key |
| `duo-s8t.md` | 362 | `duo-s8t.html` — dual-language mode |
| `voc-explorer.md` | 315 | `panoramica.html` — vocabulary explorer features |
| `ai-s8t.md` | 107 | `ai-s8t.html` — AI voice iframe shell |

### Business & Strategy
| File | Lines | Purpose |
|------|-------|---------|
| `business-info.md` | 167 | Company, pricing, Stripe, legal |
| `financial-model.md` | 339 | Pricing, costs, revenue, Stripe integration |
| `ideal-customer.md` | 153 | ICP, marketing positioning, feature prioritization |

### Tool Capabilities
| File | Lines | Purpose |
|------|-------|---------|
| `firecrawl-capabilities.md` | 343 | Web search, scrape, monitor, parse, research |
| `apify-capabilities.md` | 206 | Actor marketplace, social scrapers, storage |
| `composio-capabilities.md` | 212 | 15 connected accounts, smart routing matrix |
| `../skills/` | 16 files | Agent skills by category (see [skills README](../skills/README.md)) |

> **Superpowers workflow:** 14 orchestration skills in `~/.agents/skills/` auto-trigger before any coding task — brainstorming, debugging, planning, verification. See [AGENTS.md](../../AGENTS.md) for the trigger rules.

### Reference
| File | Lines | Purpose |
|------|-------|---------|
| `glossary.md` | 109 | Every term, acronym, concept |
| `ERROR-CODES.md` | NEW | 18 error codes: auth, WebSocket, data, payment, translation, UI, AI |
| `websocket-protocol.md` | NEW | WebSocket message format contract, room lifecycle, CSP config |
| `SECURITY.md` | 65 | Security policy, secrets, keys |
| `CHANGELOG.md` | 38 | What changed — agents fill in after each push |
| `DEPLOYMENT_CHECKLIST.md` | 38 | Pre-deploy verification steps |

### Meta
| File | Lines | Purpose |
|------|-------|---------|
| `UPDATE-MASTER-MDs.md` | 208 | Protocol for updating any MD file |

---

## 🔗 External Docs (outside docs/ai/)

| File | Purpose |
|------|---------|
| `../../AGENTS.md` | Central hub — project identity, conventions, file map |
| `DECISIONS.md` | Architecture Decision Records — 11 ADRs, why we built it this way |
| `../../PRIVACY.md` | Privacy policy (public-facing) |
| `ACCESSIBILITY.md` | ARIA patterns, contrast ratios, screen reader support |
| `PERFORMANCE.md` | Bundle sizes, optimization targets, font loading strategy |
| `ERROR-CODES.md` | 18 error codes across 6 categories |
| `../../dev/WORKFLOW.md` | AI report prompt workflow |

---

*Last updated: 2026-08-06 · Part of the Sottotitoli AI Documentation System*
