---
name: academic-research-proposal
description: |
  Take an academic article (PDF/Word) + survey data (Excel/CSV), find unused data gaps,
  and produce a visually stunning one-page-per-question research proposal document.
  For personal/academic projects outside the Sottotitoli codebase.
---

# Academic Research Proposal Generator

## What This Skill Does

Given an academic paper and its underlying survey dataset, identify what data was NOT used in the paper, generate 4-6 research questions from those gaps, and produce a professional HTML document with one visually rich page per question — charts, sources, methodology, all from real data.

## Required Reading (in order)

### From the Sottotitoli repo (tool capabilities)
| File | Why |
|------|-----|
| `docs/ai/composio-capabilities.md` | How to route tools — Firecrawl, DeepSeek, Google Sheets, Hugging Face |
| `docs/ai/firecrawl-capabilities.md` | Parse PDF/Word, search for academic sources |
| `docs/ai/apify-capabilities.md` | If you need specialized scrapers for literature search |

### From Desktop skills (methodology + design)
| File | Why |
|------|-----|
| `~/Desktop/skills/data-research/scientific-agent-skills.md` | Academic research methodology |
| `~/Desktop/skills/data-research/data-storytelling.md` | Data → narrative → compelling visuals |
| `~/Desktop/skills/data-research/research-engineer.md` | Rigorous gap analysis |
| `~/Desktop/skills/ai-prompting/multi-agent-brainstorming.md` | Generating diverse research angles |
| `~/Desktop/skills/frontend-ui/canvas-design.md` | Visual design system for the HTML output |
| `~/Desktop/skills/frontend-ui/design.md` | Typography, spacing, color |

### From Repo skills (execution)
| File | Why |
|------|-----|
| `docs/skills/data-research/mermaid-diagrams.md` | Generate charts and diagrams |
| `docs/skills/productivity-docs/planning-with-files.md` | Structured workflow for multi-step output |
| `docs/skills/ai-prompting/ai-engineer.md` | AI pipeline integration |

## The Process

### Phase 1: Ingest Files
```
1. Use "use Composio" to parse the PDF → Firecrawl parse
2. Use "use Composio" to read the Excel → Google Sheets (Composio)
3. Store parsed outputs as working files
```

### Phase 2: Analyze
```
1. Extract from the article: research question, methodology, variables used
2. List all survey columns NOT referenced in the article
3. Cross-tabulate unused columns to find significant patterns
4. Rank gaps by: statistical significance × novelty × publishability
```

### Phase 3: Generate Questions
```
1. For each top gap: formulate a precise research question
2. Draft: rationale, proposed methodology, expected findings
3. Find 3-5 real academic sources per question (Firecrawl search + research)
4. Generate actual charts from the Excel data
```

### Phase 4: Build the Document
```
1. Single HTML file, CSS-grid layout
2. Each question = one page (page-break-after: always)
3. Card-based design with consistent color coding
4. All charts are real — reference the Excel column
5. Sources are real papers with DOIs
```

## Design Constraints

- Modern sans-serif (Inter or similar), 16px body, generous whitespace
- Each research area gets a unique color and icon/emoji
- Charts > paragraphs — minimum 1 chart per page
- Fixed sidebar nav or top tabs to jump between questions
- Print-friendly with page breaks
- Output: single `research-proposals.html` file

## What NOT to Do

- ❌ No fabricated data — every number/chart must trace to an Excel column
- ❌ No fabricated sources — every citation must be a real, findable paper
- ❌ No rehashing the article's findings — only unused data
- ❌ No walls of text — use bullets, callout boxes, and charts
- ❌ No lorem ipsum or placeholder charts
- ❌ Don't edit any Sottotitoli files — this is a standalone output

## Validation Checklist

- [ ] Every chart references a specific Excel column
- [ ] Every source has a DOI or URL
- [ ] HTML renders without console errors
- [ ] Page breaks work (print preview)
- [ ] Day and night readable (if using theme variables)
- [ ] All 4-6 questions have distinct, non-overlapping data sources
