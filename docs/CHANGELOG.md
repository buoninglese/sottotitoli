# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- README files for all three repositories
- `.gitignore` files for all three repositories
- `.env.example` files for websocket and learning services
- `SECURITY.md` with vulnerability reporting and key management policy
- `CONTRIBUTING.md` with setup and PR checklist
- `CHANGELOG.md` (this file)
- `js/config.example.js` — configuration template for frontend
- Dependabot config (`.github/dependabot.yml`) for npm dependency updates
- Basic CI workflow (`.github/workflows/basic-checks.yml`)

### Changed
- `sitemap.xml` — updated URLs from caption.ninja to buoninglese.github.io/sottotitoli
- `robots.txt` — fixed stale sitemap URL
- `404.html` — replaced Appland template branding with Sottotitoli
- `CLAUDE.md` — replaced Caption.Ninja docs with Sottotitoli-specific agent guidance
- `js/auth.js` — redirect URLs now read from config (configurable per deployment)
- `server.js` (websocket) — restricted CORS, secured health route, added API key guard
- `learning-service.js` (learning) — added CORS middleware, API key guards

### Fixed
- Redirect URLs in auth no longer hardcoded
- OpenAI errors no longer leaked to clients (logged server-side)
- Oxford API errors normalized to generic messages
