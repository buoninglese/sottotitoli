# Changelog

## [2026-08-06] Word Bank Overview — Bento Grid Layout

### Changed
- **panoramica.html** — Restructured the Overview subtab (`#sub-wb-overview-panel`) layout from a 2×2 card grid to a bento grid (12-column asymmetric layout inspired by stitch mockup)
- Row 1: CEFR Distribution (8 cols) + Known Stats sidebar (4 cols)
- Row 2: Favorite Collections + Import CTA (8 cols) + Quick Tip card (4 cols)
- Row 3: Full Library (full width, 12 cols)
- CSS rewritten to use page CSS variables (`--panel`, `--text`, `--cyan`, etc.) for day/night mode support
- All element IDs preserved: `wbCefrDistAll`, `wbCefrCountAll`, `wbCefrDistKnown`, `wbCefrCountKnown`, `wbPinnedGrid`, `wbFullLibrary`, and all `*Total` elements
- `wb-glass` class preserved for JS compatibility with `renderWbOverviewSections()`
- Mobile: single-column at ≤900px

## [2026-08-05] Documentation System Overhaul

### Added
- `docs/ai/` folder with 11 interlinked agent reference docs
- New `docs/ai/README.md` documentation index
- Architecture, coding procedures, solve-mistakes, CSS theme guide, testing checklist, deploy runbook, brand voice, business info, glossary, pages directory

### Changed
- `AGENTS.md` rewritten as definitive hub with cross-references
- `CLAUDE.md` simplified to redirect stub
- `README.md` updated with documentation map
- `docs/ROADMAP.md` updated to reflect current priorities
- 12 outdated docs moved to `docs/archive/`
- `DESIGN-INDEX.md` removed (superseded by DESIGN.md)

## [Unreleased — Previous]

### Added
- README files for all three repositories
- `.gitignore` files for all three repositories
- `.env.example` files for websocket and learning services
- `SECURITY.md` with vulnerability reporting and key management policy
- `CONTRIBUTING.md` with setup and PR checklist
- `CHANGELOG.md` (this file)
- `js/config.example.js` — configuration template for frontend

### Changed
- `sitemap.xml` — updated URLs from caption.ninja to sottotitoli
- `robots.txt` — fixed stale sitemap URL
- `404.html` — replaced Appland template branding with Sottotitoli
- `CLAUDE.md` — replaced Caption.Ninja docs with Sottotitoli-specific agent guidance
- `js/auth.js` — redirect URLs now read from config

### Fixed
- Redirect URLs in auth no longer hardcoded
- OpenAI errors no longer leaked to clients
