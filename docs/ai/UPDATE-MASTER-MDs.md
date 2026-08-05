# UPDATE-MASTER-MDs.md — The Master Update Protocol

> **Trigger phrase:** "update the MASTER MDs" or any variant.
> **For:** AI agents asked to add, modify, or refresh documentation in `~/Desktop/MATSER MD FILE 2026/` or `docs/ai/`.
> **Role:** This file is the gatekeeper. It interprets the user's intent and applies consistent rules before any MD is touched.

---

## 1. When This Protocol Activates

When Sebastian says anything like "Update the MASTER MDs", "Add this to the master files", "Document this for future agents" → **activate this protocol. Read it fully. Then act.**

---

## 2. Interpret First, Write Second

### What kind of knowledge is this?

| Category | Where It Goes | Examples |
|----------|--------------|----------|
| **Bug fix** | `solve-mistakes.md` | "The VAD cutoff was caused by X, fixed by Y" |
| **New coding rule** | `coding-procedures.md` | "Always check for duplicate event listeners" |
| **Theme/CSS discovery** | `css-theme-guide.md` | "index.html uses different variable naming" |
| **Architecture change** | `architecture.md` | "CEFR API moved to websocket repo" |
| **New page/feature** | `pages-directory.md` | "Added tools.html" |
| **New term/acronym** | `glossary.md` | "VAD = Voice Activity Detection" |
| **Deploy change** | `deploy-runbook.md` | "Stripe secret rotated quarterly" |
| **Brand/messaging** | `brand-voice.md` | "New tagline" |
| **Business/pricing** | `business-info.md` | "New product pack" |
| **Testing rule** | `testing-checklist.md` | "Check WebSocket format before commit" |
| **User preference** | `Sebastian-Preferences-Agent.md` (desktop) | "Prefers X over Y" |
| **Cross-cutting** | Multiple + `AGENTS.md` | Major architectural shift |

### Is this durable knowledge?
- ✅ Add if: it prevents future mistakes, is a rule to follow, changes rarely
- ❌ Skip if: one-time task, already-fixed transient bug, speculation

---

## 3. The Gracious Rules

1. **Never overwrite, always enhance** — add new sections, don't rewrite. Use `~~strikethrough~~` for corrections.
2. **Maintain cross-references** — check if new knowledge affects other files. Keep the loop intact.
3. **Date your additions** — `## [2026-08-05] Title` or `- **Rule (2026-08-05):** ...`
4. **Sync both locations** — desktop and repo. Ask Sebastian before syncing.
5. **Update AGENTS.md** when adding new files.
6. **Version bump** on major changes.

---

## 4. Workflow

```
User says "update the MASTER MDs" → Read this file → Interpret category → 
Read target file → Draft addition → Check cross-refs → Apply with date → 
Tell Sebastian what changed → Offer desktop↔repo sync
```

---

## 5. Quick Decision Matrix

| User Says | You Do |
|-----------|--------|
| "X causes Y" | Add to `solve-mistakes.md` |
| "Always do Z before W" | Add to `coding-procedures.md` |
| "Service moved to new URL" | Update `architecture.md` + `deploy-runbook.md` + `business-info.md` |
| "New page: X" | Add to `pages-directory.md` + update `AGENTS.md` |
| "New term: X" | Add to `glossary.md` |
| "New tagline" | Update `brand-voice.md` |
| "My new preference" | Update `Sebastian-Preferences-Agent.md` |
| "Make a note of this" (vague) | **ASK which file** before writing |

---

*Last updated: 2026-08-05 · Part of the Sottotitoli AI Documentation System*
