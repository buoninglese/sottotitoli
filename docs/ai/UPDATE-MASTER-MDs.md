# UPDATE-MASTER-MDs.md — The Master Update Protocol

> **Trigger phrase:** "update the MASTER MDs" or any variant.
> **For:** AI agents asked to add, modify, or refresh documentation in `~/Desktop/MATSER MD FILE 2026/` or `docs/ai/`.
> **Role:** This file is the gatekeeper. It interprets the user's intent and applies consistent rules before any MD is touched.

---

## 1. When This Protocol Activates

You are an AI agent. When Sebastian says anything like:

- "Update the MASTER MDs"
- "Add this to the master files"
- "Make a note of this in the master docs"
- "Put this in MATSER MD FILE 2026"
- "Document this for future agents"

**→ Activate this protocol. Read it fully. Then act.**

---

## 2. Interpret First, Write Second

Before creating or modifying anything, ask yourself:

### Q1: What kind of knowledge is this?

| Category | Where It Goes | Examples |
|----------|--------------|----------|
| **Bug fix** | `solve-mistakes.md` | "The VAD cutoff was caused by X, fixed by Y" |
| **New coding rule** | `coding-procedures.md` | "Always check for duplicate event listeners before adding" |
| **Theme/CSS discovery** | `css-theme-guide.md` | "index.html uses a different variable naming scheme" |
| **Architecture change** | `architecture.md` | "We moved the CEFR API from learning to websocket repo" |
| **New page/feature** | `pages-directory.md` | "Added tools.html for utility functions" |
| **New term/acronym** | `glossary.md` | "VAD = Voice Activity Detection" |
| **Deploy change** | `deploy-runbook.md` | "Stripe webhook secret now rotated quarterly" |
| **Brand/messaging** | `brand-voice.md` | "New tagline: Capisci tutto, subito." |
| **Business/pricing** | `business-info.md` | "New 200-token pack added to Stripe" |
| **Testing rule** | `testing-checklist.md` | "Also check WebSocket message format before commit" |
| **User preference** | `Sebastian-Preferences-Agent.md` | "User now prefers X over Y" |
| **Cross-cutting** | Update multiple + update `AGENTS.md` | Major architectural shift |

### Q2: Is this truly durable knowledge?

- ✅ **Add it** if: it's a lesson that will prevent future mistakes, a rule that must be followed, or a fact that changes rarely
- ❌ **Skip it** if: it's a one-time task, a transient bug that was already fixed, or speculation about the future
- ⚠️ **Flag it** if: you're unsure — add it with a `[verify]` tag and ask Sebastian

---

## 3. How to Add or Modify — The Gracious Rules

### Rule 1: Never Overwrite, Always Enhance
When adding to an existing MD file:
- Add a **new section** or **new entry** rather than rewriting existing content
- Preserve the original author's voice and structure
- If something is wrong, use `~~strikethrough~~` with a correction note, don't silently delete

### Rule 2: Maintain the Cross-Reference Loop
Every `docs/ai/` file has "Cross-refs" at the top and "→ Next / → Related" at the bottom. When you add content:
- Check if the new knowledge affects other files
- Update the cross-reference headers if new links are needed
- Keep the loop intact

### Rule 3: Date Your Additions
Every new entry should be dated:
```markdown
## [2026-08-05] New Section Title
```
Or for inline additions:
```markdown
- **New rule (2026-08-05):** Always check X before Y.
```

### Rule 4: Sync Both Locations
The desktop `MATSER MD FILE 2026` and the repo `docs/ai/` serve different purposes:
- **Desktop:** Sebastian's personal reference, agent handoff. Updates may be less frequent.
- **Repo:** The source of truth for agents working on the code. This should always be current.

When you update one, ask Sebastian: "Should I also update the repo/desktop copy?"

### Rule 5: Update AGENTS.md When Adding Files
If you create a new MD file, add it to the Documentation Map in `AGENTS.md` so it's discoverable.

### Rule 6: Version Bump on Major Changes
If a significant amount of content changes, update the `Last updated:` date at the bottom.

---

## 4. The Update Workflow (Step by Step)

```
1. User says "update the MASTER MDs [with/about X]"
       │
2. Read UPDATE-MASTER-MDs.md (this file)
       │
3. Interpret: what category? which file(s)?
       │
4. If unclear → ASK Sebastian before writing
       │
5. Read the target file(s) fully
       │
6. Draft the addition/modification
       │
7. Check cross-refs — do other files need updating?
       │
8. Apply changes with proper formatting + date
       │
9. Tell Sebastian what you changed and why
       │
10. Offer to sync desktop ↔ repo if needed
```

---

## 5. Formatting Standards

### New Bug Entry (for solve-mistakes.md)
```markdown
## N. Bug Title (YYYY-MM-DD)

**Symptom:** What the user sees.
**Root cause:** Why it happens.
**Fix:** How to resolve it.
**Prevention:** How to avoid it next time.
```

### New Coding Rule (for coding-procedures.md)
```markdown
### Rule: Clear Title
**When:** When does this apply?
**Do:** What to do.
**Don't:** What NOT to do.
**Why:** The reason.
```

### New Page Entry (for pages-directory.md)
```markdown
| `filename.html` | `/route` | Purpose description | 🟢/🟡/🔴 Status | ~Size |
```

### New Term (for glossary.md)
```markdown
| **Term** | Definition. |
```

---

## 6. What NOT to Do

- ❌ Don't create a new MD file when existing ones cover the topic
- ❌ Don't duplicate information across multiple files
- ❌ Don't remove content without marking it as deprecated first
- ❌ Don't add personal opinions — stick to verified facts
- ❌ Don't break the cross-reference links
- ❌ Don't add content without reading the target file first
- ❌ Don't use vague titles — be specific

---

## 7. File Map (Where Everything Lives)

### Repo (`docs/ai/`)
| File | What It Holds |
|------|--------------|
| `README.md` | Index + reading order |
| `architecture.md` | System diagram, data flows |
| `brand-voice.md` | Tone, messaging, copy |
| `business-info.md` | Company, pricing, Stripe, legal |
| `coding-procedures.md` | Safe HTML/CSS/JS editing rules |
| `css-theme-guide.md` | Day/night theming system |
| `deploy-runbook.md` | All deployment procedures |
| `glossary.md` | Terms, acronyms, concepts |
| `pages-directory.md` | Page index with statuses |
| `solve-mistakes.md` | 12+ documented bugs with fixes |
| `testing-checklist.md` | Pre-commit checklist |

### Desktop (`~/Desktop/MATSER MD FILE 2026/`)
Same files + some extras (snapshot, may lag behind repo).

### Root Docs
| File | Role |
|------|------|
| `AGENTS.md` | Central hub — update when files are added/removed |
| `CLAUDE.md` | Redirect stub — rarely needs updating |
| `DESIGN.md` | Visual design — update for design system changes |
| `README.md` | Public intro — update for major changes |

---

## 8. Quick Decision Matrix

| User Says | You Do |
|-----------|--------|
| "I discovered that X causes Y" | Add to `solve-mistakes.md` |
| "From now on, always do Z before W" | Add to `coding-procedures.md` |
| "The WebSocket relay moved to a new URL" | Update `architecture.md` + `deploy-runbook.md` + `business-info.md` |
| "New page: tools.html" | Add to `pages-directory.md` + update `AGENTS.md` |
| "New term: XYZ" | Add to `glossary.md` |
| "The brand now uses this tagline" | Update `brand-voice.md` |
| "Here's my new preference for agents" | Update `Sebastian-Preferences-Agent.md` |
| "Make a note of this" (vague) | ASK which file before writing |

---

*Last updated: 2026-08-05 · Part of the Sottotitoli AI Documentation System*
*This file governs all updates to the MASTER MD ecosystem.*
