# docs/ai/README.md — AI Documentation Index

> **🔒 INTERNAL — For AI agents only. Not for public distribution.**
> These docs contain architecture internals, credentials patterns, and development procedures.
> Blocked from search engines via `robots.txt`. Blocked on local dev via `serve.py`.

> **For AI agents starting work on Sottotitoli.**
> This is the index. Every doc here is designed to be self-contained but cross-linked.
> Read them in order if you're new. Jump to specific ones as needed.

---

## 📚 Reading Order (New Agents)

| # | File | Why |
|---|------|-----|
| 1 | `../AGENTS.md` | Hub — project identity, quickstart, key files |
| 2 | `glossary.md` | Understand the vocabulary first |
| 3 | `architecture.md` | How the pieces fit together |
| 4 | `pages-directory.md` | What every file does |
| 5 | `coding-procedures.md` | How to safely edit code |
| 6 | `solve-mistakes.md` | Bugs we've already fixed |
| 7 | `css-theme-guide.md` | Theming system |
| 8 | `testing-checklist.md` | What to check before committing |
| 9 | `deploy-runbook.md` | How to ship it |

---

## 🔄 Cross-Reference Loop

Each document links to at least three others, forming a self-reinforcing knowledge graph:

```
AGENTS.md (hub)
    ├── coding-procedures.md ←→ solve-mistakes.md ←→ testing-checklist.md
    ├── architecture.md ←→ pages-directory.md ←→ deploy-runbook.md
    ├── css-theme-guide.md ←→ glossary.md ←→ brand-voice.md
    └── business-info.md ←→ deploy-runbook.md ←→ testing-checklist.md
```

When you update one doc, check the three it links to — they may need updates too.

---

## 📋 All Files in This Directory

| File | Lines | What It Covers |
|------|-------|---------------|
| `README.md` | this file | Index and reading order |
| `UPDATE-MASTER-MDs.md` | ~120 | Protocol for updating any MD file |
| `architecture.md` | ~175 | System diagram, data flows, WebSocket contract |
| `brand-voice.md` | ~130 | Tone, messaging, copy rules, sample copy |
| `business-info.md` | ~185 | Company, pricing, Stripe, legal, roadmap |
| `coding-procedures.md` | ~190 | Safe HTML/CSS/JS editing rules |
| `css-theme-guide.md` | ~200 | Day/night theming system per page |
| `deploy-runbook.md` | ~235 | All deployment procedures |
| `glossary.md` | ~110 | Every term, acronym, concept |
| `pages-directory.md` | ~100 | Complete page index with statuses |
| `solve-mistakes.md` | ~310 | 12 documented bugs with fixes |
| `testing-checklist.md` | ~160 | 11-section pre-commit checklist |

---

## 🔗 External Docs (outside docs/ai/)

| File | Purpose |
|------|---------|
| `../AGENTS.md` | Central hub — start here |
| `../DESIGN.md` | Visual design system |
| `../docs/ARCHITECTURE.md` | Architecture diagram + data flows |
| `../docs/METRICS.md` | Every metric, calculation, source |
| `../docs/SERVICES.md` | Production URLs, health endpoints |
| `../docs/SECURITY.md` | Security policy |
| `../docs/ROADMAP.md` | What's next |
| `../docs/CHANGELOG.md` | What changed |
| `../dev/WORKFLOW.md` | AI report prompt workflow |

---

*Last updated: 2026-08-05 · Part of the Sottotitoli AI Documentation System*
