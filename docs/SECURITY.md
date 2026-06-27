# Security Policy

## Supported Versions

Current `main` branch is the only supported version.

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public issue.
Instead, contact the repository maintainer directly via GitHub Issues with a security label.

## Secrets and API Keys

- Never commit `.env` files, API keys, tokens, or passwords to any repository
- Supabase anon keys are publishable-safe but should still be kept out of version control where possible
- OpenAI, Oxford, and other API keys must only be set as environment variables on Render or Supabase
- Use `.env.example` files as templates (never with real values)
- Rotate keys if they are ever committed or exposed

## Data Security

- Transcript text is stored in Supabase with Row-Level Security (RLS) policies
- Audio files uploaded for speaker analysis are processed in memory and not persisted
- Oxford API calls are rate-limited server-side (500/day total, 50/day per word)
- All endpoints support optional `x-api-key` header authentication

## Dependencies

- npm dependencies are checked via Dependabot (weekly)
- CI workflows include security checks where available
- Outdated or vulnerable dependencies should be updated promptly

## Branch Protection

- Direct pushes to `main` should be avoided for production repos
- Pull requests are recommended for all changes
